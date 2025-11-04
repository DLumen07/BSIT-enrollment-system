<?php
declare(strict_types=1);

require_once 'db_config.php';

header('Content-Type: application/json');

$allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOriginHeader = null;

if ($origin !== '') {
    if (in_array($origin, $allowedOrigins, true)) {
        $allowedOriginHeader = $origin;
    } else {
        $parsedOrigin = parse_url($origin);
        if ($parsedOrigin !== false) {
            $host = $parsedOrigin['host'] ?? '';
            $scheme = $parsedOrigin['scheme'] ?? 'http';
            $port = $parsedOrigin['port'] ?? ($scheme === 'https' ? 443 : 80);
            $isLoopback = in_array($host, ['localhost', '127.0.0.1'], true);
            $isPrivateNetwork = preg_match('/^(192\.168|10\.|172\.(1[6-9]|2[0-9]|3[0-1]))\./', $host) === 1;
            if ($port === 3000 && ($isLoopback || $isPrivateNetwork)) {
                $allowedOriginHeader = $origin;
            }
        }
    }
} else {
    $allowedOriginHeader = $allowedOrigins[0];
}

if ($allowedOriginHeader !== null) {
    header("Access-Control-Allow-Origin: {$allowedOriginHeader}");
    header('Access-Control-Allow-Credentials: true');
}

header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

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

$instructorId = isset($input['instructorId']) ? (int) $input['instructorId'] : 0;

if ($instructorId <= 0) {
    respond(400, [
        'status' => 'error',
        'message' => 'Instructor ID is required.',
    ], isset($conn) ? $conn : null);
}

try {
    if (!isset($conn) || !($conn instanceof mysqli)) {
        throw new Exception('Database connection is not available.');
    }

    $conn->set_charset('utf8mb4');

    $conn->begin_transaction();
    $transactionStarted = true;

    $existsStmt = $conn->prepare('SELECT id FROM users WHERE id = ? AND role = "instructor" LIMIT 1');
    if (!$existsStmt) {
        throw new Exception('Failed to prepare instructor lookup: ' . $conn->error);
    }
    $existsStmt->bind_param('i', $instructorId);
    $existsStmt->execute();
    $existsStmt->store_result();

    if ($existsStmt->num_rows === 0) {
        $existsStmt->close();
        $conn->rollback();
        respond(404, [
            'status' => 'error',
            'message' => 'Instructor not found.',
        ], $conn);
    }
    $existsStmt->close();

    $clearSchedules = $conn->prepare('UPDATE schedules SET instructor_id = NULL WHERE instructor_id = ?');
    if (!$clearSchedules) {
        throw new Exception('Failed to prepare schedule update: ' . $conn->error);
    }
    $clearSchedules->bind_param('i', $instructorId);
    $clearSchedules->execute();
    $clearSchedules->close();

    $deleteAssignments = $conn->prepare('DELETE FROM instructor_subjects WHERE instructor_id = ?');
    if ($deleteAssignments) {
        $deleteAssignments->bind_param('i', $instructorId);
        $deleteAssignments->execute();
        $deleteAssignments->close();
    }

    $deleteProfile = $conn->prepare('DELETE FROM instructor_profiles WHERE user_id = ?');
    if (!$deleteProfile) {
        throw new Exception('Failed to prepare profile delete: ' . $conn->error);
    }
    $deleteProfile->bind_param('i', $instructorId);
    $deleteProfile->execute();
    $deleteProfile->close();

    $deleteUser = $conn->prepare('DELETE FROM users WHERE id = ?');
    if (!$deleteUser) {
        throw new Exception('Failed to prepare user delete: ' . $conn->error);
    }
    $deleteUser->bind_param('i', $instructorId);
    $deleteUser->execute();
    $deleteUser->close();

    $conn->commit();
    $transactionStarted = false;

    respond(200, [
        'status' => 'success',
        'message' => 'Instructor deleted successfully.',
    ], $conn);
} catch (Throwable $e) {
    if (isset($transactionStarted) && $transactionStarted && isset($conn) && $conn instanceof mysqli) {
        $conn->rollback();
    }

    respond(500, [
        'status' => 'error',
        'message' => $e->getMessage(),
    ], isset($conn) ? $conn : null);
}
