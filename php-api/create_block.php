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

function normalize_year_level($value): int
{
    if (is_int($value)) {
        return $value;
    }

    if (is_string($value)) {
        $normalized = strtolower(trim($value));
        $map = [
            '1' => 1,
            '1st-year' => 1,
            'first-year' => 1,
            '2' => 2,
            '2nd-year' => 2,
            'second-year' => 2,
            '3' => 3,
            '3rd-year' => 3,
            'third-year' => 3,
            '4' => 4,
            '4th-year' => 4,
            'fourth-year' => 4,
        ];
        return $map[$normalized] ?? 0;
    }

    return 0;
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

$blockName = isset($input['name']) ? trim((string) $input['name']) : '';
$course = isset($input['course']) ? strtoupper(trim((string) $input['course'])) : '';
$yearLevelValue = $input['yearLevel'] ?? null;
$capacity = isset($input['capacity']) ? (int) $input['capacity'] : 0;
$specializationRaw = $input['specialization'] ?? null;
$specialization = is_string($specializationRaw) ? strtoupper(trim($specializationRaw)) : null;

$yearLevel = normalize_year_level($yearLevelValue);

if ($blockName === '' || $capacity <= 0 || $yearLevel < 1 || $yearLevel > 4) {
    respond(400, [
        'status' => 'error',
        'message' => 'Block name, capacity, and a valid year level are required.',
    ], isset($conn) ? $conn : null);
}

if (!in_array($course, ['ACT', 'BSIT'], true)) {
    respond(400, [
        'status' => 'error',
        'message' => 'Course must be either ACT or BSIT.',
    ], isset($conn) ? $conn : null);
}

if ($yearLevel <= 2) {
    $specialization = null;
} elseif ($specialization !== null && !in_array($specialization, ['AP', 'DD'], true)) {
    respond(400, [
        'status' => 'error',
        'message' => 'Specialization must be AP or DD for upper-year blocks.',
    ], isset($conn) ? $conn : null);
}

$sectionRaw = preg_replace('/^' . preg_quote($course, '/') . '\s*/i', '', $blockName);
$sectionRaw = is_string($sectionRaw) ? trim($sectionRaw) : '';
$normalizedSection = normalize_block_section($sectionRaw !== '' ? $sectionRaw : $blockName, $yearLevel);
$normalizedBlockName = sprintf('%s %s', $course, $normalizedSection);

try {
    if (!isset($conn) || !($conn instanceof mysqli)) {
        throw new Exception('Database connection is not available.');
    }

    $conn->set_charset('utf8mb4');

    if ($yearLevel <= 2) {
        $duplicateCheck = $conn->prepare('SELECT id FROM blocks WHERE name = ? LIMIT 1');
        if (!$duplicateCheck) {
            throw new Exception('Failed to prepare duplicate check: ' . $conn->error);
        }
        $duplicateCheck->bind_param('s', $normalizedBlockName);
    } else {
        $duplicateCheck = $conn->prepare('SELECT id FROM blocks WHERE name = ? AND specialization = ? LIMIT 1');
        if (!$duplicateCheck) {
            throw new Exception('Failed to prepare duplicate check: ' . $conn->error);
        }
        $duplicateCheck->bind_param('ss', $normalizedBlockName, $specialization);
    }
    $duplicateCheck->execute();
    $duplicateResult = $duplicateCheck->get_result();
    $existing = $duplicateResult ? $duplicateResult->fetch_assoc() : null;
    $duplicateCheck->close();

    if ($existing) {
        respond(409, [
            'status' => 'error',
            'message' => $yearLevel <= 2
                ? 'A block with the same name already exists.'
                : 'A block with the same name and specialization already exists.',
        ], $conn);
    }

    $insert = $conn->prepare('INSERT INTO blocks (name, year_level, course, specialization, capacity) VALUES (?, ?, ?, ?, ?)');
    if (!$insert) {
        throw new Exception('Failed to prepare insert statement: ' . $conn->error);
    }
    $insert->bind_param('sissi', $normalizedBlockName, $yearLevel, $course, $specialization, $capacity);
    $insert->execute();
    $insert->close();

    $blockId = (int) $conn->insert_id;

    $fetch = $conn->prepare('SELECT id, name, year_level, course, specialization, capacity FROM blocks WHERE id = ?');
    if (!$fetch) {
        throw new Exception('Failed to prepare block fetch statement: ' . $conn->error);
    }
    $fetch->bind_param('i', $blockId);
    $fetch->execute();
    $result = $fetch->get_result();
    $block = $result ? $result->fetch_assoc() : null;
    $fetch->close();

    if (!$block) {
        throw new Exception('Failed to load block details after creation.');
    }

    respond(200, [
        'status' => 'success',
        'data' => [
            'block' => [
                'id' => (int) $block['id'],
                'name' => $block['name'],
                'yearLevel' => (int) $block['year_level'],
                'course' => $block['course'],
                'specialization' => $block['specialization'] ?? null,
                'capacity' => (int) $block['capacity'],
                'section' => $normalizedSection,
            ],
        ],
        'message' => 'Block created successfully.',
    ], $conn);
} catch (Throwable $e) {
    respond(500, [
        'status' => 'error',
        'message' => $e->getMessage(),
    ], isset($conn) ? $conn : null);
}
