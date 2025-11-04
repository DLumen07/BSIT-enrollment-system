<?php
declare(strict_types=1);

require_once 'db_config.php';

header('Content-Type: application/json');

$allowedOrigins = ['http://localhost:3000'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: {$origin}");
    header('Access-Control-Allow-Credentials: true');
}

header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
    exit;
}

function respond(int $statusCode, array $payload, ?mysqli $connection = null): void
{
    if ($connection instanceof mysqli) {
        $connection->close();
    }

    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, [
        'status' => 'error',
        'message' => 'Method not allowed. Use POST.',
    ], isset($conn) ? $conn : null);
}

$rawBody = file_get_contents('php://input');
$input = json_decode($rawBody, true);
if (!is_array($input)) {
    $input = $_POST;
}

$blockId = isset($input['blockId']) ? (int) $input['blockId'] : 0;

if ($blockId <= 0) {
    respond(400, [
        'status' => 'error',
        'message' => 'A valid block ID is required.',
    ], isset($conn) ? $conn : null);
}

try {
    if (!isset($conn) || !($conn instanceof mysqli)) {
        throw new Exception('Database connection is not available.');
    }

    $conn->set_charset('utf8mb4');

    $blockLookup = $conn->prepare('SELECT id, name FROM blocks WHERE id = ?');
    if (!$blockLookup) {
        throw new Exception('Failed to prepare block lookup: ' . $conn->error);
    }
    $blockLookup->bind_param('i', $blockId);
    $blockLookup->execute();
    $blockResult = $blockLookup->get_result();
    $block = $blockResult ? $blockResult->fetch_assoc() : null;
    $blockLookup->close();

    if (!$block) {
        respond(404, [
            'status' => 'error',
            'message' => 'Block not found.',
        ], $conn);
    }

    $studentCheck = $conn->prepare('SELECT COUNT(*) AS total FROM student_profiles WHERE block_id = ?');
    if (!$studentCheck) {
        throw new Exception('Failed to prepare student check: ' . $conn->error);
    }
    $studentCheck->bind_param('i', $blockId);
    $studentCheck->execute();
    $studentResult = $studentCheck->get_result();
    $studentRow = $studentResult ? $studentResult->fetch_assoc() : null;
    $studentCheck->close();

    if ($studentRow && (int) $studentRow['total'] > 0) {
        respond(409, [
            'status' => 'error',
            'message' => 'Cannot delete this block while students are assigned to it. Please reassign or remove the students first.',
        ], $conn);
    }

    $scheduleCheck = $conn->prepare('SELECT COUNT(*) AS total FROM schedules WHERE block_id = ?');
    if (!$scheduleCheck) {
        throw new Exception('Failed to prepare schedule check: ' . $conn->error);
    }
    $scheduleCheck->bind_param('i', $blockId);
    $scheduleCheck->execute();
    $scheduleResult = $scheduleCheck->get_result();
    $scheduleRow = $scheduleResult ? $scheduleResult->fetch_assoc() : null;
    $scheduleCheck->close();

    if ($scheduleRow && (int) $scheduleRow['total'] > 0) {
        respond(409, [
            'status' => 'error',
            'message' => 'Cannot delete this block while schedules reference it. Please remove related schedules first.',
        ], $conn);
    }

    $delete = $conn->prepare('DELETE FROM blocks WHERE id = ?');
    if (!$delete) {
        throw new Exception('Failed to prepare delete statement: ' . $conn->error);
    }
    $delete->bind_param('i', $blockId);
    $delete->execute();

    if ($delete->affected_rows === 0) {
        $delete->close();
        respond(404, [
            'status' => 'error',
            'message' => 'Block not found or already deleted.',
        ], $conn);
    }

    $delete->close();

    respond(200, [
        'status' => 'success',
        'message' => 'Block deleted successfully.',
    ], $conn);
} catch (Throwable $e) {
    respond(500, [
        'status' => 'error',
        'message' => $e->getMessage(),
    ], isset($conn) ? $conn : null);
}
