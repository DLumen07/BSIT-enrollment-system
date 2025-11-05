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

function normalize_time_string(string $time): ?string
{
    $trimmed = trim($time);

    if ($trimmed === '') {
        return null;
    }

    if (preg_match('/^\d{2}:\d{2}$/', $trimmed) === 1) {
        return $trimmed . ':00';
    }

    if (preg_match('/^\d{2}:\d{2}:\d{2}$/', $trimmed) === 1) {
        return $trimmed;
    }

    return null;
}

function bind_params(mysqli_stmt $stmt, string $types, array $params): void
{
    $args = [$types];
    foreach ($params as $index => $value) {
        $args[] = &$params[$index];
    }

    if (!call_user_func_array([$stmt, 'bind_param'], $args)) {
        throw new RuntimeException('Failed to bind parameters for statement.');
    }
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

$scheduleId = isset($input['scheduleId']) ? (int) $input['scheduleId'] : 0;
$dayOfWeek = isset($input['dayOfWeek']) ? trim((string) $input['dayOfWeek']) : '';
$startTimeRaw = isset($input['startTime']) ? (string) $input['startTime'] : '';
$endTimeRaw = isset($input['endTime']) ? (string) $input['endTime'] : '';
$instructorIdValue = $input['instructorId'] ?? null;
$roomRaw = isset($input['room']) ? trim((string) $input['room']) : '';
$room = $roomRaw === '' ? null : $roomRaw;
if ($room !== null && mb_strlen($room) > 100) {
    $room = mb_substr($room, 0, 100);
}

if ($scheduleId <= 0) {
    respond(400, [
        'status' => 'error',
        'message' => 'A valid schedule ID is required.',
    ], isset($conn) ? $conn : null);
}

$validDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
if (!in_array($dayOfWeek, $validDays, true)) {
    respond(400, [
        'status' => 'error',
        'message' => 'Invalid day of week provided.',
    ], isset($conn) ? $conn : null);
}

$startTime = normalize_time_string($startTimeRaw);
$endTime = normalize_time_string($endTimeRaw);

if ($startTime === null || $endTime === null) {
    respond(400, [
        'status' => 'error',
        'message' => 'Start time and end time must be in HH:MM format.',
    ], isset($conn) ? $conn : null);
}

if ($startTime >= $endTime) {
    respond(400, [
        'status' => 'error',
        'message' => 'End time must be later than start time.',
    ], isset($conn) ? $conn : null);
}

$instructorId = null;
if ($instructorIdValue !== null && $instructorIdValue !== '') {
    if (is_numeric($instructorIdValue)) {
        $instructorId = (int) $instructorIdValue;
    }
}

try {
    if (!isset($conn) || !($conn instanceof mysqli)) {
        throw new Exception('Database connection is not available.');
    }

    $conn->set_charset('utf8mb4');

    $scheduleStmt = $conn->prepare('SELECT sch.block_id, sch.subject_id FROM schedules sch WHERE sch.id = ? LIMIT 1');
    if (!$scheduleStmt) {
        throw new Exception('Failed to prepare schedule lookup: ' . $conn->error);
    }
    $scheduleStmt->bind_param('i', $scheduleId);
    $scheduleStmt->execute();
    $scheduleStmt->bind_result($blockId, $subjectId);
    if (!$scheduleStmt->fetch()) {
        $scheduleStmt->close();
        respond(404, [
            'status' => 'error',
            'message' => 'The requested schedule could not be found.',
        ], $conn);
    }
    $scheduleStmt->close();
    $blockId = (int) $blockId;
    $subjectId = (int) $subjectId;

    $subjectStmt = $conn->prepare('SELECT code, description FROM subjects WHERE id = ? LIMIT 1');
    if (!$subjectStmt) {
        throw new Exception('Failed to prepare subject lookup: ' . $conn->error);
    }
    $subjectStmt->bind_param('i', $subjectId);
    $subjectStmt->execute();
    $subjectStmt->bind_result($subjectCode, $subjectDescription);
    if (!$subjectStmt->fetch()) {
        $subjectStmt->close();
        respond(500, [
            'status' => 'error',
            'message' => 'Failed to fetch subject details for this schedule.',
        ], $conn);
    }
    $subjectStmt->close();

    $instructorName = 'TBA';
    if ($instructorId !== null && $instructorId > 0) {
        $instructorStmt = $conn->prepare('SELECT ip.user_id, ip.name FROM instructor_profiles ip WHERE ip.user_id = ? LIMIT 1');
        if (!$instructorStmt) {
            throw new Exception('Failed to prepare instructor lookup: ' . $conn->error);
        }
        $instructorStmt->bind_param('i', $instructorId);
        $instructorStmt->execute();
        $instructorStmt->bind_result($instructorUserId, $foundInstructorName);
        if ($instructorStmt->fetch()) {
            $instructorName = $foundInstructorName;
            $instructorId = (int) $instructorUserId;
        } else {
            $instructorStmt->close();
            respond(404, [
                'status' => 'error',
                'message' => 'The specified instructor was not found.',
            ], $conn);
        }
        $instructorStmt->close();
    } else {
        $instructorId = null;
    }

    $conflictStmt = $conn->prepare('SELECT id FROM schedules WHERE block_id = ? AND day_of_week = ? AND NOT (? >= end_time OR ? <= start_time) AND id <> ? LIMIT 1');
    if (!$conflictStmt) {
        throw new Exception('Failed to prepare block conflict check: ' . $conn->error);
    }
    $conflictStmt->bind_param('isssi', $blockId, $dayOfWeek, $startTime, $endTime, $scheduleId);
    $conflictStmt->execute();
    $conflictStmt->store_result();
    if ($conflictStmt->num_rows > 0) {
        $conflictStmt->close();
        respond(409, [
            'status' => 'error',
            'message' => 'This block already has a class scheduled at the selected time.',
        ], $conn);
    }
    $conflictStmt->close();

    if ($instructorId !== null) {
        $instructorConflictStmt = $conn->prepare('SELECT id FROM schedules WHERE instructor_id = ? AND day_of_week = ? AND NOT (? >= end_time OR ? <= start_time) AND id <> ? LIMIT 1');
        if (!$instructorConflictStmt) {
            throw new Exception('Failed to prepare instructor conflict check: ' . $conn->error);
        }
        $instructorConflictStmt->bind_param('isssi', $instructorId, $dayOfWeek, $startTime, $endTime, $scheduleId);
        $instructorConflictStmt->execute();
        $instructorConflictStmt->store_result();
        if ($instructorConflictStmt->num_rows > 0) {
            $instructorConflictStmt->close();
            respond(409, [
                'status' => 'error',
                'message' => 'The selected instructor is already assigned during this timeslot.',
            ], $conn);
        }
        $instructorConflictStmt->close();
    }

    $assignments = [];
    $types = '';
    $params = [];

    if ($instructorId !== null) {
        $assignments[] = 'instructor_id = ?';
        $types .= 'i';
        $params[] = $instructorId;
    } else {
        $assignments[] = 'instructor_id = NULL';
    }

    $assignments[] = 'day_of_week = ?';
    $types .= 's';
    $params[] = $dayOfWeek;

    $assignments[] = 'start_time = ?';
    $types .= 's';
    $params[] = $startTime;

    $assignments[] = 'end_time = ?';
    $types .= 's';
    $params[] = $endTime;

    if ($room !== null) {
        $assignments[] = 'room = ?';
        $types .= 's';
        $params[] = $room;
    } else {
        $assignments[] = 'room = NULL';
    }

    $types .= 'i';
    $params[] = $scheduleId;

    $updateSql = 'UPDATE schedules SET ' . implode(', ', $assignments) . ' WHERE id = ?';
    $updateStmt = $conn->prepare($updateSql);
    if (!$updateStmt) {
        throw new Exception('Failed to prepare schedule update: ' . $conn->error);
    }

    bind_params($updateStmt, $types, $params);
    $updateStmt->execute();
    $updateStmt->close();

    $fetchStmt = $conn->prepare('SELECT sch.id, subj.code, subj.description, sch.day_of_week, DATE_FORMAT(sch.start_time, "%H:%i") AS start_time,
                                        DATE_FORMAT(sch.end_time, "%H:%i") AS end_time, sch.instructor_id, IFNULL(instr.name, "TBA") AS instructor_name,
                                        sch.room
                                 FROM schedules sch
                                 INNER JOIN subjects subj ON subj.id = sch.subject_id
                                 LEFT JOIN instructor_profiles instr ON instr.user_id = sch.instructor_id
                                 WHERE sch.id = ? LIMIT 1');
    if (!$fetchStmt) {
        throw new Exception('Failed to prepare schedule fetch: ' . $conn->error);
    }
    $fetchStmt->bind_param('i', $scheduleId);
    $fetchStmt->execute();
    $result = $fetchStmt->get_result();
    $scheduleRow = $result ? $result->fetch_assoc() : null;
    $fetchStmt->close();

    if (!$scheduleRow) {
        respond(500, [
            'status' => 'error',
            'message' => 'Failed to fetch the updated schedule.',
        ], $conn);
    }

    respond(200, [
        'status' => 'success',
        'message' => 'Schedule updated successfully.',
        'data' => [
            'schedule' => [
                'id' => (int) $scheduleRow['id'],
                'code' => $scheduleRow['code'],
                'description' => $scheduleRow['description'],
                'day' => $scheduleRow['day_of_week'],
                'startTime' => $scheduleRow['start_time'],
                'endTime' => $scheduleRow['end_time'],
                'instructor' => $scheduleRow['instructor_name'],
                'instructorId' => isset($scheduleRow['instructor_id']) ? (int) $scheduleRow['instructor_id'] : null,
                'room' => $scheduleRow['room'] !== null ? $scheduleRow['room'] : null,
            ],
        ],
    ], $conn);
} catch (Throwable $e) {
    respond(500, [
        'status' => 'error',
        'message' => $e->getMessage(),
    ], isset($conn) ? $conn : null);
}
