<?php
declare(strict_types=1);

require_once 'db_config.php';

header('Content-Type: application/json');

$allowedOrigins = ['http://localhost:3000'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if ($origin !== '' && in_array($origin, $allowedOrigins, true)) {
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

function fetch_student_subjects(mysqli $connection, int $studentUserId): array
{
    $stmt = $connection->prepare('SELECT subj.id, subj.code, subj.description, subj.units
                                   FROM student_subjects ss
                                   INNER JOIN subjects subj ON subj.id = ss.subject_id
                                   WHERE ss.student_user_id = ?
                                   ORDER BY subj.code');
    if (!$stmt) {
        throw new Exception('Failed to prepare subject list lookup: ' . $connection->error);
    }

    $stmt->bind_param('i', $studentUserId);
    $stmt->execute();
    $result = $stmt->get_result();

    $subjects = [];
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $subjects[] = [
                'id' => isset($row['id']) ? (int) $row['id'] : 0,
                'code' => (string) ($row['code'] ?? ''),
                'description' => (string) ($row['description'] ?? ''),
                'units' => isset($row['units']) ? (int) $row['units'] : 0,
            ];
        }
        $result->free();
    }

    $stmt->close();

    return $subjects;
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
$subjectId = isset($input['subjectId']) ? (int) $input['subjectId'] : 0;
$actionRaw = isset($input['action']) ? (string) $input['action'] : '';
$action = strtolower(trim($actionRaw));

if ($studentUserId <= 0 || $subjectId <= 0) {
    respond(400, [
        'status' => 'error',
        'message' => 'Student and subject identifiers are required.',
    ], isset($conn) ? $conn : null);
}

if (!in_array($action, ['add', 'remove'], true)) {
    respond(400, [
        'status' => 'error',
        'message' => 'Invalid action. Use "add" or "remove".',
    ], isset($conn) ? $conn : null);
}

try {
    if (!isset($conn) || !($conn instanceof mysqli)) {
        throw new Exception('Database connection is not available.');
    }

    $conn->set_charset('utf8mb4');

    $studentStmt = $conn->prepare('SELECT user_id FROM student_profiles WHERE user_id = ? LIMIT 1');
    if (!$studentStmt) {
        throw new Exception('Failed to prepare student lookup: ' . $conn->error);
    }
    $studentStmt->bind_param('i', $studentUserId);
    $studentStmt->execute();
    $studentStmt->store_result();
    if ($studentStmt->num_rows === 0) {
        $studentStmt->close();
        respond(404, [
            'status' => 'error',
            'message' => 'Student profile not found.',
        ], $conn);
    }
    $studentStmt->close();

    $subjectStmt = $conn->prepare('SELECT id, code, description FROM subjects WHERE id = ? LIMIT 1');
    if (!$subjectStmt) {
        throw new Exception('Failed to prepare subject lookup: ' . $conn->error);
    }
    $subjectStmt->bind_param('i', $subjectId);
    $subjectStmt->execute();
    $subjectStmt->store_result();
    if ($subjectStmt->num_rows === 0) {
        $subjectStmt->close();
        respond(404, [
            'status' => 'error',
            'message' => 'Subject not found.',
        ], $conn);
    }
    $subjectStmt->close();

    if ($action === 'add') {
        $existsStmt = $conn->prepare('SELECT 1 FROM student_subjects WHERE student_user_id = ? AND subject_id = ? LIMIT 1');
        if (!$existsStmt) {
            throw new Exception('Failed to prepare duplicate check: ' . $conn->error);
        }
        $existsStmt->bind_param('ii', $studentUserId, $subjectId);
        $existsStmt->execute();
        $existsStmt->store_result();
        if ($existsStmt->num_rows > 0) {
            $existsStmt->close();
            respond(409, [
                'status' => 'error',
                'message' => 'Subject is already assigned to this student.',
            ], $conn);
        }
        $existsStmt->close();

        $insertStmt = $conn->prepare('INSERT INTO student_subjects (student_user_id, subject_id) VALUES (?, ?)');
        if (!$insertStmt) {
            throw new Exception('Failed to prepare subject assignment: ' . $conn->error);
        }
        $insertStmt->bind_param('ii', $studentUserId, $subjectId);
        if (!$insertStmt->execute()) {
            $insertStmt->close();
            throw new Exception('Failed to assign subject: ' . $insertStmt->error);
        }
        $insertStmt->close();
    } else {
        $deleteStmt = $conn->prepare('DELETE FROM student_subjects WHERE student_user_id = ? AND subject_id = ? LIMIT 1');
        if (!$deleteStmt) {
            throw new Exception('Failed to prepare subject removal: ' . $conn->error);
        }
        $deleteStmt->bind_param('ii', $studentUserId, $subjectId);
        $deleteStmt->execute();
        if ($deleteStmt->affected_rows === 0) {
            $deleteStmt->close();
            respond(404, [
                'status' => 'error',
                'message' => 'Subject assignment not found for this student.',
            ], $conn);
        }
        $deleteStmt->close();
    }

    $subjects = fetch_student_subjects($conn, $studentUserId);

    respond(200, [
        'status' => 'success',
        'message' => $action === 'add' ? 'Subject assigned successfully.' : 'Subject removed successfully.',
        'data' => [
            'subjects' => $subjects,
        ],
    ], $conn);
} catch (Throwable $e) {
    respond(500, [
        'status' => 'error',
        'message' => $e->getMessage(),
    ], isset($conn) ? $conn : null);
}
