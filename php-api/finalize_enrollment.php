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

function fetch_block_subject_ids(mysqli $connection, int $blockId): array
{
    $stmt = $connection->prepare('SELECT DISTINCT subject_id FROM schedules WHERE block_id = ?');
    if (!$stmt) {
        throw new Exception('Failed to prepare block subject lookup: ' . $connection->error);
    }

    $stmt->bind_param('i', $blockId);
    $stmt->execute();
    $result = $stmt->get_result();

    $subjectIds = [];
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $subjectIds[] = isset($row['subject_id']) ? (int) $row['subject_id'] : 0;
        }
        $result->free();
    }

    $stmt->close();

    $normalized = [];
    foreach ($subjectIds as $subjectId) {
        if ($subjectId > 0) {
            $normalized[] = $subjectId;
        }
    }

    if (empty($normalized)) {
        return [];
    }

    sort($normalized, SORT_NUMERIC);

    return array_values(array_unique($normalized));
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

$studentUserId = isset($input['studentUserId']) ? (int) $input['studentUserId'] : 0;
$blockNameRaw = $input['blockName'] ?? '';
$blockName = is_string($blockNameRaw) ? trim($blockNameRaw) : '';
$subjectIdsInput = $input['subjectIds'] ?? [];
$applicationId = isset($input['applicationId']) ? (int) $input['applicationId'] : 0;
$mode = isset($input['mode']) ? strtolower((string) $input['mode']) : 'application';
$enrollmentTrackInput = $input['enrollmentTrack'] ?? null;
$enrollmentTrackValue = is_string($enrollmentTrackInput) ? trim($enrollmentTrackInput) : '';
$normalizedTrack = strtolower($enrollmentTrackValue);
$requestedEnrollmentTrack = $normalizedTrack === 'irregular' ? 'Irregular' : 'Regular';
$enrollmentTrack = $requestedEnrollmentTrack;

if ($studentUserId <= 0 || $blockName === '') {
    respond(400, [
        'status' => 'error',
        'message' => 'Student and block information are required.',
    ], isset($conn) ? $conn : null);
}

$subjectIds = [];
if (is_array($subjectIdsInput)) {
    foreach ($subjectIdsInput as $subjectId) {
        $id = (int) $subjectId;
        if ($id > 0) {
            $subjectIds[] = $id;
        }
    }
    $subjectIds = array_values(array_unique($subjectIds));
}

try {
    if (!isset($conn) || !($conn instanceof mysqli)) {
        throw new Exception('Database connection is not available.');
    }

    $conn->set_charset('utf8mb4');

    $blockStmt = $conn->prepare('SELECT id, specialization FROM blocks WHERE name = ?');
    if (!$blockStmt) {
        throw new Exception('Failed to prepare block lookup: ' . $conn->error);
    }
    $blockStmt->bind_param('s', $blockName);
    $blockStmt->execute();
    $blockResult = $blockStmt->get_result();
    $block = $blockResult ? $blockResult->fetch_assoc() : null;
    $blockStmt->close();

    if (!$block) {
        respond(404, [
            'status' => 'error',
            'message' => 'Block not found.',
        ], $conn);
    }

    $blockId = (int) $block['id'];
    $blockSpecialization = $block['specialization'];

    $blockSubjectIds = fetch_block_subject_ids($conn, $blockId);
    $selectedSubjectIds = $subjectIds;
    $hasSubjectsAssigned = !empty($selectedSubjectIds);
    $matchesBlockLoad = $hasSubjectsAssigned;

    if (!empty($blockSubjectIds)) {
        $selectedComparison = $selectedSubjectIds;
        sort($selectedComparison, SORT_NUMERIC);
        $matchesBlockLoad = $selectedComparison === $blockSubjectIds;
    }

    $wasForcedIrregular = false;
    $irregularReason = null;

    if (!$matchesBlockLoad) {
        $wasForcedIrregular = true;
        $enrollmentTrack = 'Irregular';

        if (!empty($blockSubjectIds)) {
            $expectedCount = count($blockSubjectIds);
            $selectedCount = count($selectedSubjectIds);
            $irregularReason = sprintf(
                'Block %s expects %d subject%s but %d %s selected.',
                $blockName,
                $expectedCount,
                $expectedCount === 1 ? '' : 's',
                $selectedCount,
                $selectedCount === 1 ? 'was' : 'were'
            );
        } else {
            $irregularReason = 'No subjects were assigned for this student.';
        }
    } else {
        $wasForcedIrregular = false;
        $irregularReason = null;
        $enrollmentTrack = $enrollmentTrack === 'Irregular' ? 'Irregular' : $requestedEnrollmentTrack;
    }

    $conn->begin_transaction();

    $enrollmentStatus = 'Enrolled';
    $updateProfile = $conn->prepare('UPDATE student_profiles SET enrollment_status = ?, block_id = ?, specialization = ?, enrollment_track = ? WHERE user_id = ?');
    if (!$updateProfile) {
        throw new Exception('Failed to prepare student profile update: ' . $conn->error);
    }
    $updateProfile->bind_param('sissi', $enrollmentStatus, $blockId, $blockSpecialization, $enrollmentTrack, $studentUserId);
    $updateProfile->execute();
    if ($updateProfile->affected_rows === 0) {
        $updateProfile->close();
        $conn->rollback();
        respond(404, [
            'status' => 'error',
            'message' => 'Student profile not found.',
        ], $conn);
    }
    $updateProfile->close();

    $deleteSubjects = $conn->prepare('DELETE FROM student_subjects WHERE student_user_id = ?');
    if (!$deleteSubjects) {
        throw new Exception('Failed to prepare subject cleanup: ' . $conn->error);
    }
    $deleteSubjects->bind_param('i', $studentUserId);
    $deleteSubjects->execute();
    $deleteSubjects->close();

    if (!empty($subjectIds)) {
        $insertSubject = $conn->prepare('INSERT INTO student_subjects (student_user_id, subject_id) VALUES (?, ?)');
        if (!$insertSubject) {
            throw new Exception('Failed to prepare subject insert: ' . $conn->error);
        }
        foreach ($subjectIds as $subjectId) {
            $insertSubject->bind_param('ii', $studentUserId, $subjectId);
            $insertSubject->execute();
        }
        $insertSubject->close();
    }

    if ($applicationId > 0) {
        $deleteApplication = $conn->prepare('DELETE FROM enrollment_applications WHERE id = ? AND student_user_id = ?');
        if (!$deleteApplication) {
            throw new Exception('Failed to prepare application removal: ' . $conn->error);
        }
        $deleteApplication->bind_param('ii', $applicationId, $studentUserId);
        $deleteApplication->execute();
        if ($deleteApplication->affected_rows === 0) {
            $deleteApplication->close();
            throw new Exception('Failed to remove the enrollment application. Ensure the record exists.');
        }
        $deleteApplication->close();
    }

    $conn->commit();

    $responseData = [
        'status' => 'success',
        'message' => $mode === 'direct' ? 'Student enrolled successfully.' : 'Enrollment finalized successfully.',
        'data' => [
            'enrollmentTrack' => $enrollmentTrack,
            'wasForcedIrregular' => $wasForcedIrregular,
            'blockSubjectCount' => count($blockSubjectIds ?? []),
            'selectedSubjectCount' => count($subjectIds),
        ],
    ];

    if ($irregularReason !== null) {
        $responseData['data']['irregularReason'] = $irregularReason;
    }

    respond(200, $responseData, $conn);
} catch (Throwable $e) {
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->rollback();
    }

    respond(500, [
        'status' => 'error',
        'message' => $e->getMessage(),
    ], isset($conn) ? $conn : null);
}
