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

$blockName = isset($input['blockName']) ? trim((string) $input['blockName']) : '';
$subjectId = isset($input['subjectId']) ? (int) $input['subjectId'] : 0;
$dayOfWeek = isset($input['dayOfWeek']) ? trim((string) $input['dayOfWeek']) : '';
$startTimeRaw = isset($input['startTime']) ? (string) $input['startTime'] : '';
$endTimeRaw = isset($input['endTime']) ? (string) $input['endTime'] : '';
$instructorIdValue = $input['instructorId'] ?? null;
$room = isset($input['room']) ? trim((string) $input['room']) : '';
if ($room === '') {
    $room = null;
} elseif (mb_strlen($room) > 100) {
    $room = mb_substr($room, 0, 100);
}

$instructorId = null;
if ($instructorIdValue !== null && $instructorIdValue !== '') {
    if (is_numeric($instructorIdValue)) {
        $instructorId = (int) $instructorIdValue;
    }
}

if ($blockName === '' || $subjectId <= 0) {
    respond(400, [
        'status' => 'error',
        'message' => 'Block name and subject are required.',
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

try {
    if (!isset($conn) || !($conn instanceof mysqli)) {
        throw new Exception('Database connection is not available.');
    }

    $conn->set_charset('utf8mb4');

    $blockStmt = $conn->prepare('SELECT id FROM blocks WHERE name = ? LIMIT 1');
    if (!$blockStmt) {
        throw new Exception('Failed to prepare block lookup: ' . $conn->error);
    }
    $blockStmt->bind_param('s', $blockName);
    $blockStmt->execute();
    $blockStmt->bind_result($blockId);
    if (!$blockStmt->fetch()) {
        $blockStmt->close();
        respond(404, [
            'status' => 'error',
            'message' => 'The specified block was not found.',
        ], $conn);
    }
    $blockStmt->close();
    $blockId = (int) $blockId;

    $subjectStmt = $conn->prepare('SELECT id, code, description FROM subjects WHERE id = ? LIMIT 1');
    if (!$subjectStmt) {
        throw new Exception('Failed to prepare subject lookup: ' . $conn->error);
    }
    $subjectStmt->bind_param('i', $subjectId);
    $subjectStmt->execute();
    $subjectStmt->bind_result($subjectRowId, $subjectCode, $subjectDescription);
    if (!$subjectStmt->fetch()) {
        $subjectStmt->close();
        respond(404, [
            'status' => 'error',
            'message' => 'The specified subject was not found.',
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

    $conflictStmt = $conn->prepare('SELECT id FROM schedules WHERE block_id = ? AND day_of_week = ? AND NOT (? >= end_time OR ? <= start_time) LIMIT 1');
    if (!$conflictStmt) {
        throw new Exception('Failed to prepare block conflict check: ' . $conn->error);
    }
    $conflictStmt->bind_param('isss', $blockId, $dayOfWeek, $startTime, $endTime);
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
        $instructorConflictStmt = $conn->prepare('SELECT id FROM schedules WHERE instructor_id = ? AND day_of_week = ? AND NOT (? >= end_time OR ? <= start_time) LIMIT 1');
        if (!$instructorConflictStmt) {
            throw new Exception('Failed to prepare instructor conflict check: ' . $conn->error);
        }
        $instructorConflictStmt->bind_param('isss', $instructorId, $dayOfWeek, $startTime, $endTime);
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

    if ($instructorId !== null) {
        $insertStmt = $conn->prepare('INSERT INTO schedules (block_id, subject_id, instructor_id, day_of_week, start_time, end_time' . ($room !== null ? ', room' : '') . ') VALUES (?, ?, ?, ?, ?, ?' . ($room !== null ? ', ?' : '') . ')');
        if (!$insertStmt) {
            throw new Exception('Failed to prepare schedule insert: ' . $conn->error);
        }
        if ($room !== null) {
            $insertStmt->bind_param('iiissss', $blockId, $subjectRowId, $instructorId, $dayOfWeek, $startTime, $endTime, $room);
        } else {
            $insertStmt->bind_param('iiisss', $blockId, $subjectRowId, $instructorId, $dayOfWeek, $startTime, $endTime);
        }
    } else {
        $insertStmt = $conn->prepare('INSERT INTO schedules (block_id, subject_id, day_of_week, start_time, end_time' . ($room !== null ? ', room' : '') . ') VALUES (?, ?, ?, ?, ?' . ($room !== null ? ', ?' : '') . ')');
        if (!$insertStmt) {
            throw new Exception('Failed to prepare schedule insert: ' . $conn->error);
        }
        if ($room !== null) {
            $insertStmt->bind_param('iissss', $blockId, $subjectRowId, $dayOfWeek, $startTime, $endTime, $room);
        } else {
            $insertStmt->bind_param('iisss', $blockId, $subjectRowId, $dayOfWeek, $startTime, $endTime);
        }
    }

    $insertStmt->execute();
    $insertStmt->close();

    $newScheduleId = (int) $conn->insert_id;

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
    $fetchStmt->bind_param('i', $newScheduleId);
    $fetchStmt->execute();
    $result = $fetchStmt->get_result();
    $scheduleRow = $result ? $result->fetch_assoc() : null;
    $fetchStmt->close();

    if (!$scheduleRow) {
        respond(500, [
            'status' => 'error',
            'message' => 'Failed to fetch the created schedule.',
        ], $conn);
    }

    respond(200, [
        'status' => 'success',
        'message' => 'Schedule created successfully.',
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
