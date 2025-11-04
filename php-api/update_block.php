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

function normalize_block_section(string $value, int $yearLevel): string
{
    $lettersOnly = preg_replace('/[^A-Z]/i', '', $value);
    $lettersOnly = strtoupper($lettersOnly ?? '');
    $suffix = $lettersOnly !== '' ? $lettersOnly[0] : 'A';

    $yearLevel = max(1, min(4, $yearLevel));

    return sprintf('%d-%s', $yearLevel, $suffix);
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
$blockName = isset($input['name']) ? trim((string) $input['name']) : '';
$capacity = isset($input['capacity']) ? (int) $input['capacity'] : 0;
$specializationRaw = $input['specialization'] ?? null;
$specialization = is_string($specializationRaw) ? strtoupper(trim($specializationRaw)) : null;

if ($blockId <= 0 || $blockName === '' || $capacity <= 0) {
    respond(400, [
        'status' => 'error',
        'message' => 'Block ID, name, and capacity are required.',
    ], isset($conn) ? $conn : null);
}

try {
    if (!isset($conn) || !($conn instanceof mysqli)) {
        throw new Exception('Database connection is not available.');
    }

    $conn->set_charset('utf8mb4');

    $fetchBlock = $conn->prepare('SELECT id, year_level, course FROM blocks WHERE id = ?');
    if (!$fetchBlock) {
        throw new Exception('Failed to prepare block lookup: ' . $conn->error);
    }
    $fetchBlock->bind_param('i', $blockId);
    $fetchBlock->execute();
    $blockResult = $fetchBlock->get_result();
    $blockData = $blockResult ? $blockResult->fetch_assoc() : null;
    $fetchBlock->close();

    if (!$blockData) {
        respond(404, [
            'status' => 'error',
            'message' => 'Block not found.',
        ], $conn);
    }

    $yearLevel = (int) $blockData['year_level'];
    $course = (string) $blockData['course'];
    if ($yearLevel <= 2) {
        $specialization = null;
    } elseif ($specialization !== null && !in_array($specialization, ['AP', 'DD'], true)) {
        respond(400, [
            'status' => 'error',
            'message' => 'Specialization must be AP or DD for upper-year blocks.',
        ], $conn);
    }

    $sectionRaw = preg_replace('/^' . preg_quote($course, '/') . '\s*/i', '', $blockName);
    $sectionRaw = is_string($sectionRaw) ? trim($sectionRaw) : '';
    $normalizedSection = normalize_block_section($sectionRaw !== '' ? $sectionRaw : $blockName, $yearLevel);
    $normalizedBlockName = sprintf('%s %s', $course, $normalizedSection);

    if ($yearLevel <= 2) {
        $duplicateCheck = $conn->prepare('SELECT id FROM blocks WHERE name = ? AND id <> ? LIMIT 1');
        if (!$duplicateCheck) {
            throw new Exception('Failed to prepare duplicate check: ' . $conn->error);
        }
        $duplicateCheck->bind_param('si', $normalizedBlockName, $blockId);
    } else {
        $duplicateCheck = $conn->prepare('SELECT id FROM blocks WHERE name = ? AND specialization = ? AND id <> ? LIMIT 1');
        if (!$duplicateCheck) {
            throw new Exception('Failed to prepare duplicate check: ' . $conn->error);
        }
        $duplicateCheck->bind_param('ssi', $normalizedBlockName, $specialization, $blockId);
    }
    $duplicateCheck->execute();
    $duplicateResult = $duplicateCheck->get_result();
    $existing = $duplicateResult ? $duplicateResult->fetch_assoc() : null;
    $duplicateCheck->close();

    if ($existing) {
        respond(409, [
            'status' => 'error',
            'message' => $yearLevel <= 2
                ? 'Another block with the same name already exists.'
                : 'Another block with the same name and specialization already exists.',
        ], $conn);
    }

    $update = $conn->prepare('UPDATE blocks SET name = ?, capacity = ?, specialization = ? WHERE id = ?');
    if (!$update) {
        throw new Exception('Failed to prepare update statement: ' . $conn->error);
    }
    $update->bind_param('sisi', $normalizedBlockName, $capacity, $specialization, $blockId);
    $update->execute();

    if ($update->affected_rows === 0 && $conn->errno) {
        throw new Exception('Failed to update block: ' . $conn->error);
    }

    $update->close();

    respond(200, [
        'status' => 'success',
        'message' => 'Block updated successfully.',
    ], $conn);
} catch (Throwable $e) {
    respond(500, [
        'status' => 'error',
        'message' => $e->getMessage(),
    ], isset($conn) ? $conn : null);
}
