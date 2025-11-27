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

function normalize_phased_schedule_payload($value): array
{
    $result = [
        'phases' => [],
        'activePhase' => null,
    ];

    if ($value === null) {
        return $result;
    }

    if (is_string($value)) {
        $decoded = json_decode($value, true);
        if (!is_array($decoded)) {
            return $result;
        }
        $value = $decoded;
    }

    if (!is_array($value)) {
        return $result;
    }

    if (isset($value['phases']) && is_array($value['phases'])) {
        $result['phases'] = $value['phases'];
    } else {
        $result['phases'] = $value;
    }

    if (isset($value['activePhase']) && is_string($value['activePhase'])) {
        $result['activePhase'] = trim((string) $value['activePhase']);
    } elseif (isset($value['_meta']['activePhase']) && is_string($value['_meta']['activePhase'])) {
        $result['activePhase'] = trim((string) $value['_meta']['activePhase']);
    }

    if ($result['activePhase'] === '') {
        $result['activePhase'] = null;
    }

    return $result;
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

$academicYear = isset($payload['academicYear']) ? trim((string) $payload['academicYear']) : '';
$semester = isset($payload['semester']) ? trim((string) $payload['semester']) : '';
$enrollmentStartDate = isset($payload['enrollmentStartDate']) ? trim((string) $payload['enrollmentStartDate']) : '';
$enrollmentEndDate = isset($payload['enrollmentEndDate']) ? trim((string) $payload['enrollmentEndDate']) : '';
$phasedSchedule = $payload['phasedSchedule'] ?? null;
$activeEnrollmentPhase = isset($payload['activeEnrollmentPhase']) ? strtolower(trim((string) $payload['activeEnrollmentPhase'])) : '';

if ($academicYear === '' || $semester === '') {
    respond(400, [
        'status' => 'error',
        'message' => 'Academic year and semester are required.',
    ], isset($conn) ? $conn : null);
}

if ($activeEnrollmentPhase !== '' && !preg_match('/^[a-z0-9\-]+$/', $activeEnrollmentPhase)) {
    respond(422, [
        'status' => 'error',
        'message' => 'Active enrollment phase format is invalid.',
    ], isset($conn) ? $conn : null);
}

$startDateValue = null;
if ($enrollmentStartDate !== '') {
    $startDate = DateTime::createFromFormat('Y-m-d', $enrollmentStartDate);
    if (!$startDate || $startDate->format('Y-m-d') !== $enrollmentStartDate) {
        respond(422, [
            'status' => 'error',
            'message' => 'Enrollment start date must follow the YYYY-MM-DD format.',
        ], isset($conn) ? $conn : null);
    }
    $startDateValue = $startDate->format('Y-m-d');
}

$endDateValue = null;
if ($enrollmentEndDate !== '') {
    $endDate = DateTime::createFromFormat('Y-m-d', $enrollmentEndDate);
    if (!$endDate || $endDate->format('Y-m-d') !== $enrollmentEndDate) {
        respond(422, [
            'status' => 'error',
            'message' => 'Enrollment end date must follow the YYYY-MM-DD format.',
        ], isset($conn) ? $conn : null);
    }
    $endDateValue = $endDate->format('Y-m-d');
}

if ($startDateValue !== null && $endDateValue !== null && $startDateValue > $endDateValue) {
    respond(422, [
        'status' => 'error',
        'message' => 'Enrollment start date cannot be later than the end date.',
    ], isset($conn) ? $conn : null);
}

$phasedScheduleJson = null;

try {
    if (!isset($conn) || !($conn instanceof mysqli)) {
        throw new Exception('Database connection is not available.');
    }

    $conn->set_charset('utf8mb4');

    $existingScheduleRow = null;
    if ($result = $conn->query('SELECT phased_schedule_json FROM system_settings WHERE id = 1 LIMIT 1')) {
        $existingScheduleRow = $result->fetch_assoc() ?: null;
        $result->free();
    }

    $existingSchedulePayload = normalize_phased_schedule_payload($existingScheduleRow['phased_schedule_json'] ?? null);
    $incomingSchedulePayload = normalize_phased_schedule_payload($phasedSchedule);

    $phasesToPersist = $phasedSchedule !== null
        ? $incomingSchedulePayload['phases']
        : $existingSchedulePayload['phases'];

    $activePhaseFromPayload = $incomingSchedulePayload['activePhase'];
    $activePhaseToPersist = $activeEnrollmentPhase !== ''
        ? $activeEnrollmentPhase
        : ($activePhaseFromPayload ?? $existingSchedulePayload['activePhase']);

    if ($activePhaseToPersist === '') {
        $activePhaseToPersist = null;
    }

    $shouldPersistPhasedData = !empty($phasesToPersist) || $activePhaseToPersist !== null;
    if ($shouldPersistPhasedData) {
        $phasedPayload = ['phases' => $phasesToPersist];
        if ($activePhaseToPersist !== null) {
            $phasedPayload['activePhase'] = $activePhaseToPersist;
        }

        $encoded = json_encode($phasedPayload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($encoded === false) {
            respond(422, [
                'status' => 'error',
                'message' => 'Unable to encode phased schedule as JSON.',
            ], $conn);
        }
        $phasedScheduleJson = $encoded;
    }

    $sql = 'INSERT INTO system_settings (id, academic_year, semester, enrollment_start_date, enrollment_end_date, phased_schedule_json)
            VALUES (1, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                academic_year = VALUES(academic_year),
                semester = VALUES(semester),
                enrollment_start_date = VALUES(enrollment_start_date),
                enrollment_end_date = VALUES(enrollment_end_date),
                phased_schedule_json = VALUES(phased_schedule_json)';
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception('Failed to prepare system settings statement: ' . $conn->error);
    }

    $stmt->bind_param(
        'sssss',
        $academicYear,
        $semester,
        $startDateValue,
        $endDateValue,
        $phasedScheduleJson
    );

    if (!$stmt->execute()) {
        $error = $stmt->error;
        $stmt->close();
        throw new Exception('Failed to persist system settings: ' . $error);
    }
    $stmt->close();

    respond(200, [
        'status' => 'success',
        'message' => 'System settings updated successfully.',
        'data' => [
            'academicYear' => $academicYear,
            'semester' => $semester,
            'enrollmentStartDate' => $startDateValue,
            'enrollmentEndDate' => $endDateValue,
            'phasedScheduleJson' => $phasedScheduleJson !== null ? json_decode($phasedScheduleJson, true) : null,
            'activeEnrollmentPhase' => $activePhaseToPersist,
        ],
    ], $conn);
} catch (Throwable $e) {
    respond(500, [
        'status' => 'error',
        'message' => $e->getMessage(),
    ], isset($conn) ? $conn : null);
}
