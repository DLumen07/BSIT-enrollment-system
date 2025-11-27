<?php
declare(strict_types=1);

require_once 'db_config.php';
require_once __DIR__ . '/subject_prerequisite_utils.php';

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

function parse_year_level($value, ?string $fallbackKey = null): ?int
{
    $mapping = [
        '1st-year' => 1,
        '1st year' => 1,
        '2nd-year' => 2,
        '2nd year' => 2,
        '3rd-year' => 3,
        '3rd year' => 3,
        '4th-year' => 4,
        '4th year' => 4,
    ];

    $candidates = [];
    if ($value !== null) {
        $candidates[] = $value;
    }
    if ($fallbackKey !== null) {
        $candidates[] = $fallbackKey;
    }

    foreach ($candidates as $candidate) {
        if (is_int($candidate)) {
            return $candidate;
        }
        if (is_numeric($candidate)) {
            return (int) $candidate;
        }
        if (is_string($candidate)) {
            $normalized = strtolower(trim($candidate));
            if (isset($mapping[$normalized])) {
                return $mapping[$normalized];
            }
            if (preg_match('/^(\d+)/', $normalized, $matches) === 1) {
                return (int) $matches[1];
            }
        }
    }

    return null;
}

function normalize_year_key(int $yearLevel): string
{
    switch ($yearLevel) {
        case 1:
            return '1st-year';
        case 2:
            return '2nd-year';
        case 3:
            return '3rd-year';
        case 4:
            return '4th-year';
        default:
            return $yearLevel . 'th-year';
    }
}

function normalize_semester_value($value): ?string
{
    if ($value === null) {
        return null;
    }

    if (is_string($value)) {
        $normalized = strtolower(trim($value));

        if ($normalized === '1st-sem' || $normalized === '1st sem' || $normalized === 'first' || $normalized === 'first semester') {
            return '1st-sem';
        }
        if ($normalized === '2nd-sem' || $normalized === '2nd sem' || $normalized === 'second' || $normalized === 'second semester') {
            return '2nd-sem';
        }
        if ($normalized === 'summer' || $normalized === 'midyear' || $normalized === 'mid-year') {
            return 'summer';
        }
    }

    return null;
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

$code = isset($input['code']) ? strtoupper(trim((string) $input['code'])) : '';
$description = isset($input['description']) ? trim((string) $input['description']) : '';
$units = isset($input['units']) ? (int) $input['units'] : 0;
$yearLevelValue = $input['yearLevel'] ?? null;
$yearKey = isset($input['yearKey']) ? trim((string) $input['yearKey']) : null;
$prerequisiteCodeRaw = isset($input['prerequisite']) ? trim((string) $input['prerequisite']) : '';
$prerequisiteCode = $prerequisiteCodeRaw !== '' ? strtoupper($prerequisiteCodeRaw) : '';
$prerequisiteListRaw = $input['prerequisites'] ?? null;
$prerequisiteCodes = normalize_prerequisite_codes($prerequisiteListRaw, $prerequisiteCode !== '' ? $prerequisiteCode : null);
$semesterRaw = $input['semester'] ?? null;
$semesterValue = normalize_semester_value($semesterRaw);
$semester = $semesterValue ?? '1st-sem';

$yearLevel = parse_year_level($yearLevelValue, $yearKey);

if ($code === '' || $description === '') {
    respond(400, [
        'status' => 'error',
        'message' => 'Subject code and description are required.',
    ], isset($conn) ? $conn : null);
}

if ($units <= 0) {
    respond(400, [
        'status' => 'error',
        'message' => 'Units must be a positive number.',
    ], isset($conn) ? $conn : null);
}

if ($yearLevel === null || $yearLevel < 1) {
    respond(400, [
        'status' => 'error',
        'message' => 'A valid year level is required.',
    ], isset($conn) ? $conn : null);
}

if ($semesterValue === null && $semesterRaw !== null) {
    respond(400, [
        'status' => 'error',
        'message' => 'Semester selection is invalid.',
    ], isset($conn) ? $conn : null);
}

if (!empty($prerequisiteCodes) && in_array($code, $prerequisiteCodes, true)) {
    respond(400, [
        'status' => 'error',
        'message' => 'A subject cannot list itself as a prerequisite.',
    ], isset($conn) ? $conn : null);
}

try {
    if (!isset($conn) || !($conn instanceof mysqli)) {
        throw new Exception('Database connection is not available.');
    }

    $conn->set_charset('utf8mb4');

    $conn->begin_transaction();
    $transactionStarted = true;

    $duplicateStmt = $conn->prepare('SELECT id FROM subjects WHERE code = ? LIMIT 1');
    if (!$duplicateStmt) {
        throw new Exception('Failed to prepare duplicate subject lookup: ' . $conn->error);
    }
    $duplicateStmt->bind_param('s', $code);
    $duplicateStmt->execute();
    $duplicateStmt->store_result();

    if ($duplicateStmt->num_rows > 0) {
        $duplicateStmt->close();
        $conn->rollback();
        respond(409, [
            'status' => 'error',
            'message' => 'A subject with this code already exists.',
        ], $conn);
    }
    $duplicateStmt->close();

    $prerequisiteIds = [];
    if (!empty($prerequisiteCodes)) {
        try {
            $prerequisiteIds = resolve_prerequisite_ids($conn, $prerequisiteCodes);
        } catch (InvalidArgumentException $validationError) {
            $conn->rollback();
            respond(400, [
                'status' => 'error',
                'message' => $validationError->getMessage(),
            ], $conn);
        }
    }

    $primaryPrerequisiteId = $prerequisiteIds[0] ?? null;

    if ($primaryPrerequisiteId === null) {
        $insertStmt = $conn->prepare('INSERT INTO subjects (code, description, units, semester, prerequisite_id, year_level) VALUES (?, ?, ?, ?, NULL, ?)');
        if (!$insertStmt) {
            throw new Exception('Failed to prepare subject insert: ' . $conn->error);
        }
        $insertStmt->bind_param('ssisi', $code, $description, $units, $semester, $yearLevel);
    } else {
        $insertStmt = $conn->prepare('INSERT INTO subjects (code, description, units, semester, prerequisite_id, year_level) VALUES (?, ?, ?, ?, ?, ?)');
        if (!$insertStmt) {
            throw new Exception('Failed to prepare subject insert: ' . $conn->error);
        }
        $insertStmt->bind_param('ssisii', $code, $description, $units, $semester, $primaryPrerequisiteId, $yearLevel);
    }

    $insertStmt->execute();
    $insertStmt->close();

    $newSubjectId = (int) $conn->insert_id;

    if (!empty($prerequisiteIds)) {
        sync_subject_prerequisites($conn, $newSubjectId, $prerequisiteIds);
    }

    $conn->commit();
    $transactionStarted = false;

    respond(200, [
        'status' => 'success',
        'message' => 'Subject created successfully.',
        'data' => [
            'subject' => [
                'id' => $newSubjectId,
                'code' => $code,
                'description' => $description,
                'units' => $units,
                'prerequisite' => $prerequisiteCodes[0] ?? null,
                'prerequisites' => $prerequisiteCodes,
                'yearLevel' => $yearLevel,
                'yearKey' => normalize_year_key($yearLevel),
                'semester' => $semester,
            ],
        ],
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
