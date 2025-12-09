<?php
declare(strict_types=1);

header('Content-Type: application/json');

$allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

$determineAllowedOrigin = static function (string $origin) use ($allowedOrigins): ?string {
    if ($origin === '') {
        return $allowedOrigins[0] ?? null;
    }

    if (in_array($origin, $allowedOrigins, true)) {
        return $origin;
    }

    $parsed = parse_url($origin);
    if ($parsed === false) {
        return null;
    }

    $host = $parsed['host'] ?? '';
    $scheme = $parsed['scheme'] ?? 'http';
    $port = $parsed['port'] ?? ($scheme === 'https' ? 443 : 80);
    $isLoopback = in_array($host, ['localhost', '127.0.0.1'], true);
    $isPrivate = preg_match('/^(192\.168|10\.|172\.(1[6-9]|2[0-9]|3[0-1]))\./', $host) === 1;

    if ($port === 3000 && ($isLoopback || $isPrivate)) {
        return $origin;
    }

    return null;
};

$allowedOriginHeader = $determineAllowedOrigin($origin) ?? $allowedOrigins[0] ?? null;

if ($allowedOriginHeader !== null) {
    header("Access-Control-Allow-Origin: {$allowedOriginHeader}");
    header('Access-Control-Allow-Credentials: true');
}

header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept');
header('Access-Control-Max-Age: 86400');

function close_connection(?mysqli $connection): void
{
    if ($connection instanceof mysqli) {
        $connection->close();
    }
}

function respond(int $statusCode, array $payload, ?mysqli $connection = null): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    close_connection($connection);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    echo '';
    exit;
}

require_once 'db_config.php';

if ($allowedOriginHeader !== null) {
    header("Access-Control-Allow-Origin: {$allowedOriginHeader}", true);
    header('Access-Control-Allow-Credentials: true', true);
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept', true);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, [
        'status' => 'error',
        'message' => 'Only POST requests are allowed.',
    ], isset($conn) ? $conn : null);
}

$rawBody = file_get_contents('php://input');
$payload = json_decode($rawBody, true);
if (!is_array($payload)) {
    $payload = $_POST;
}

$studentIdNumber = trim((string) ($payload['studentIdNumber'] ?? ''));
$studentEmail = trim((string) ($payload['studentEmail'] ?? ''));
$studentName = trim((string) ($payload['studentName'] ?? ''));
$blockName = trim((string) ($payload['blockName'] ?? ''));
$course = strtoupper(trim((string) ($payload['course'] ?? '')));
$yearLevelLabel = trim((string) ($payload['yearLevel'] ?? ''));
$studentStatus = trim((string) ($payload['studentStatus'] ?? ''));
$specialization = $payload['specialization'] ?? null;

if ($studentIdNumber === '' && $studentEmail === '') {
    respond(400, [
        'status' => 'error',
        'message' => 'Student ID number or email is required.',
    ], isset($conn) ? $conn : null);
}

if ($blockName === '') {
    respond(400, [
        'status' => 'error',
        'message' => 'Block selection is required.',
    ], isset($conn) ? $conn : null);
}

if ($course === '' || !in_array($course, ['ACT', 'BSIT'], true)) {
    respond(400, [
        'status' => 'error',
        'message' => 'Invalid course specified for the enrollment application.',
    ], isset($conn) ? $conn : null);
}

if ($yearLevelLabel === '') {
    respond(400, [
        'status' => 'error',
        'message' => 'Year level is required.',
    ], isset($conn) ? $conn : null);
}

if ($studentStatus === '') {
    respond(400, [
        'status' => 'error',
        'message' => 'Student status is required.',
    ], isset($conn) ? $conn : null);
}

$subjects = [];
if (isset($payload['subjects']) && is_array($payload['subjects'])) {
    foreach ($payload['subjects'] as $subjectCode) {
        if (is_string($subjectCode)) {
            $trimmed = trim($subjectCode);
            if ($trimmed !== '') {
                $subjects[] = $trimmed;
            }
        }
    }
}

// Treat transferee based on status or explicit transfereeDetails payload
$isTransferee = strcasecmp($studentStatus, 'Transferee') === 0;
if (!$isTransferee && isset($payload['transfereeDetails']) && is_array($payload['transfereeDetails'])) {
    $isTransferee = true;
}

if (count($subjects) === 0 && !$isTransferee) {
    respond(400, [
        'status' => 'error',
        'message' => 'Select at least one subject before submitting the enrollment form.',
    ], isset($conn) ? $conn : null);
}

function default_credentials(): array
{
    return [
        'birthCertificate' => false,
        'grades' => false,
        'goodMoral' => false,
        'registrationForm' => false,
        'transcript' => false,
    ];
}

function as_bool(mixed $value): bool
{
    if (is_bool($value)) {
        return $value;
    }

    if (is_numeric($value)) {
        return ((int) $value) === 1;
    }

    if (is_string($value)) {
        $normalized = strtolower(trim($value));
        return in_array($normalized, ['1', 'true', 'yes', 'y', 'on'], true);
    }

    return false;
}

$credentialsInput = is_array($payload['credentials'] ?? null) ? $payload['credentials'] : [];
$credentials = default_credentials();
foreach ($credentials as $key => $defaultValue) {
    if (array_key_exists($key, $credentialsInput)) {
        $credentials[$key] = as_bool($credentialsInput[$key]);
    } else {
        $credentials[$key] = $defaultValue;
    }
}

$formSnapshot = null;
if (isset($payload['formSnapshot']) && is_array($payload['formSnapshot'])) {
    $formSnapshot = $payload['formSnapshot'];
}

try {
    if (!isset($conn) || !($conn instanceof mysqli)) {
        throw new Exception('Database connection is not available.');
    }

    $conn->set_charset('utf8mb4');
    $conn->begin_transaction();

    $studentLookupSql = 'SELECT sp.user_id, sp.student_id_number, sp.name AS student_name, u.email
                         FROM student_profiles sp
                         INNER JOIN users u ON u.id = sp.user_id
                         WHERE sp.student_id_number = ?
                         LIMIT 1';

    $studentUserId = null;
    $resolvedStudentIdNumber = null;
    $resolvedStudentName = null;
    $resolvedStudentEmail = null;

    if ($studentIdNumber !== '') {
        $lookup = $conn->prepare($studentLookupSql);
        if (!$lookup) {
            throw new Exception('Failed to prepare student lookup statement.');
        }
        $lookup->bind_param('s', $studentIdNumber);
        $lookup->execute();
        $result = $lookup->get_result();
        $record = $result ? $result->fetch_assoc() : null;
        $lookup->close();

        if ($record) {
            $studentUserId = (int) $record['user_id'];
            $resolvedStudentIdNumber = (string) $record['student_id_number'];
            $resolvedStudentName = (string) $record['student_name'];
            $resolvedStudentEmail = (string) $record['email'];
        }
    }

    if ($studentUserId === null && $studentEmail !== '') {
        $emailLookupSql = 'SELECT sp.user_id, sp.student_id_number, sp.name AS student_name, u.email
                           FROM student_profiles sp
                           INNER JOIN users u ON u.id = sp.user_id
                           WHERE u.email = ?
                           LIMIT 1';
        $lookup = $conn->prepare($emailLookupSql);
        if (!$lookup) {
            throw new Exception('Failed to prepare student lookup by email.');
        }
        $lookup->bind_param('s', $studentEmail);
        $lookup->execute();
        $result = $lookup->get_result();
        $record = $result ? $result->fetch_assoc() : null;
        $lookup->close();

        if ($record) {
            $studentUserId = (int) $record['user_id'];
            $resolvedStudentIdNumber = (string) $record['student_id_number'];
            $resolvedStudentName = (string) $record['student_name'];
            $resolvedStudentEmail = (string) $record['email'];
        }
    }

    if ($studentUserId === null) {
        $conn->rollback();
        respond(404, [
            'status' => 'error',
            'message' => 'Student profile not found. Please update your profile first.',
        ], $conn);
    }

    $duplicateSql = 'SELECT id FROM enrollment_applications WHERE student_user_id = ? AND status = "pending" LIMIT 1';
    $duplicate = $conn->prepare($duplicateSql);
    if (!$duplicate) {
        throw new Exception('Failed to prepare duplicate application check.');
    }
    $duplicate->bind_param('i', $studentUserId);
    $duplicate->execute();
    $duplicateResult = $duplicate->get_result();
    $existingApplication = $duplicateResult ? $duplicateResult->fetch_assoc() : null;
    $duplicate->close();

    if ($existingApplication) {
        $conn->rollback();
        respond(409, [
            'status' => 'error',
            'message' => 'You already have a pending enrollment application.',
        ], $conn);
    }

    $blockLookup = $conn->prepare('SELECT id FROM blocks WHERE name = ? LIMIT 1');
    if (!$blockLookup) {
        throw new Exception('Failed to prepare block lookup statement.');
    }
    $blockLookup->bind_param('s', $blockName);
    $blockLookup->execute();
    $blockResult = $blockLookup->get_result();
    $blockRecord = $blockResult ? $blockResult->fetch_assoc() : null;
    $blockLookup->close();

    if (!$blockRecord) {
        $conn->rollback();
        respond(404, [
            'status' => 'error',
            'message' => 'Selected block was not found. Please refresh the page and try again.',
        ], $conn);
    }

    $normalizedSpecialization = null;
    if (is_string($specialization)) {
        $trimmedSpec = strtoupper(trim($specialization));
        if (in_array($trimmedSpec, ['AP', 'DD'], true)) {
            $normalizedSpecialization = $trimmedSpec;
        }
    }

    $transfereeDetailsPayload = null;
    if (isset($payload['transfereeDetails']) && is_array($payload['transfereeDetails'])) {
        $td = $payload['transfereeDetails'];
        $previousSchool = isset($td['previousSchool']) ? trim((string) $td['previousSchool']) : '';
        $earnedUnits = isset($td['earnedUnits']) ? trim((string) $td['earnedUnits']) : '';
        $notes = isset($td['notes']) ? trim((string) $td['notes']) : '';

        if ($previousSchool !== '' || $earnedUnits !== '' || $notes !== '') {
            $transfereeDetailsPayload = [
                'previousSchool' => $previousSchool !== '' ? $previousSchool : null,
                'earnedUnits' => $earnedUnits !== '' ? $earnedUnits : null,
                'notes' => $notes !== '' ? $notes : null,
            ];
        }
    }

    $applicationPayload = [
        'birthCertificate' => $credentials['birthCertificate'],
        'grades' => $credentials['grades'],
        'goodMoral' => $credentials['goodMoral'],
        'registrationForm' => $credentials['registrationForm'],
        'transfereeDetails' => $transfereeDetailsPayload,
        '_application' => [
            'student' => [
                'studentIdNumber' => $resolvedStudentIdNumber,
                'email' => $resolvedStudentEmail ?? $studentEmail,
                'name' => $studentName !== '' ? $studentName : $resolvedStudentName,
            ],
            'course' => $course,
            'yearLevel' => $yearLevelLabel,
            'studentStatus' => $studentStatus,
            'blockName' => $blockName,
            'specialization' => $normalizedSpecialization,
            'subjects' => $subjects,
            'formSnapshot' => $formSnapshot,
            'transfereeDetails' => $transfereeDetailsPayload,
        ],
    ];

    $formJson = json_encode($applicationPayload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if ($formJson === false) {
        throw new Exception('Failed to encode enrollment application payload.');
    }

    $status = 'pending';
    $insert = $conn->prepare('INSERT INTO enrollment_applications (student_user_id, status, block_name, form_data) VALUES (?, ?, ?, ?)');
    if (!$insert) {
        throw new Exception('Failed to prepare enrollment insertion statement.');
    }
    $insert->bind_param('isss', $studentUserId, $status, $blockName, $formJson);
    $insert->execute();
    $applicationId = $insert->insert_id;
    $insert->close();

    $fetch = $conn->prepare('SELECT id, status, block_name, `submitted_.at` AS submitted_at FROM enrollment_applications WHERE id = ? LIMIT 1');
    if (!$fetch) {
        throw new Exception('Failed to prepare application fetch statement.');
    }
    $fetch->bind_param('i', $applicationId);
    $fetch->execute();
    $applicationResult = $fetch->get_result();
    $applicationRow = $applicationResult ? $applicationResult->fetch_assoc() : null;
    $fetch->close();

    $conn->commit();

    respond(201, [
        'status' => 'success',
        'data' => [
            'id' => $applicationRow ? (int) $applicationRow['id'] : $applicationId,
            'status' => $applicationRow['status'] ?? 'pending',
            'blockName' => $applicationRow['block_name'] ?? $blockName,
            'submittedAt' => $applicationRow['submitted_at'] ?? null,
        ],
        'message' => 'Enrollment application submitted successfully.',
    ], $conn);
} catch (Throwable $e) {
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->rollback();
    }

    respond(500, [
        'status' => 'error',
        'message' => $e->getMessage(),
    ], isset($conn) ? $conn : null);
}
