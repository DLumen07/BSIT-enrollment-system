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
$name = isset($input['name']) ? trim((string) $input['name']) : '';
$email = isset($input['email']) ? strtolower(trim((string) $input['email'])) : '';
$password = isset($input['password']) && $input['password'] !== '' ? (string) $input['password'] : null;
$subjectsRaw = $input['subjects'] ?? null;
$avatar = isset($input['avatar']) ? trim((string) $input['avatar']) : null;
$department = isset($input['department']) ? trim((string) $input['department']) : null;

if ($instructorId <= 0) {
    respond(400, [
        'status' => 'error',
        'message' => 'Instructor ID is required.',
    ], isset($conn) ? $conn : null);
}

if ($name === '' || $email === '') {
    respond(400, [
        'status' => 'error',
        'message' => 'Name and email are required.',
    ], isset($conn) ? $conn : null);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(400, [
        'status' => 'error',
        'message' => 'Please provide a valid email address.',
    ], isset($conn) ? $conn : null);
}

if ($password !== null && strlen($password) < 6) {
    respond(400, [
        'status' => 'error',
        'message' => 'Password must be at least 6 characters long.',
    ], isset($conn) ? $conn : null);
}

$subjects = null;
if (is_array($subjectsRaw)) {
    $subjects = [];
    foreach ($subjectsRaw as $subjectCode) {
        if (is_string($subjectCode)) {
            $code = strtoupper(trim($subjectCode));
            if ($code !== '') {
                $subjects[] = $code;
            }
        }
    }
    $subjects = array_values(array_unique($subjects));
}

try {
    if (!isset($conn) || !($conn instanceof mysqli)) {
        throw new Exception('Database connection is not available.');
    }

    $conn->set_charset('utf8mb4');

    $ensureTableSql = <<<SQL
CREATE TABLE IF NOT EXISTS instructor_subjects (
    instructor_id INT(11) NOT NULL,
    subject_id INT(11) NOT NULL,
    PRIMARY KEY (instructor_id, subject_id),
    KEY idx_subject_id (subject_id),
    CONSTRAINT fk_instructor_subjects_instructor FOREIGN KEY (instructor_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_instructor_subjects_subject FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
SQL;

    if (!$conn->query($ensureTableSql)) {
        throw new Exception('Failed to ensure instructor_subjects table exists: ' . $conn->error);
    }

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

    $duplicateCheck = $conn->prepare('SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1');
    if (!$duplicateCheck) {
        throw new Exception('Failed to prepare duplicate email check: ' . $conn->error);
    }
    $duplicateCheck->bind_param('si', $email, $instructorId);
    $duplicateCheck->execute();
    $duplicateCheck->store_result();
    if ($duplicateCheck->num_rows > 0) {
        $duplicateCheck->close();
        $conn->rollback();
        respond(409, [
            'status' => 'error',
            'message' => 'Another account with this email already exists.',
        ], $conn);
    }
    $duplicateCheck->close();

    if ($password !== null) {
        $passwordHash = password_hash($password, PASSWORD_BCRYPT);
        $updateUser = $conn->prepare('UPDATE users SET email = ?, password_hash = ? WHERE id = ?');
        if (!$updateUser) {
            throw new Exception('Failed to prepare user update: ' . $conn->error);
        }
        $updateUser->bind_param('ssi', $email, $passwordHash, $instructorId);
    } else {
        $updateUser = $conn->prepare('UPDATE users SET email = ? WHERE id = ?');
        if (!$updateUser) {
            throw new Exception('Failed to prepare user update: ' . $conn->error);
        }
        $updateUser->bind_param('si', $email, $instructorId);
    }
    $updateUser->execute();
    $updateUser->close();

    $avatarValue = $avatar !== null && $avatar !== '' ? $avatar : '';
    $departmentValue = $department !== null && $department !== '' ? $department : '';

    $updateProfile = $conn->prepare('UPDATE instructor_profiles SET name = ?, avatar_url = ?, department = ? WHERE user_id = ?');
    if (!$updateProfile) {
        throw new Exception('Failed to prepare profile update: ' . $conn->error);
    }
    $updateProfile->bind_param('sssi', $name, $avatarValue, $departmentValue, $instructorId);
    $updateProfile->execute();
    $updateProfile->close();

    if (is_array($subjects)) {
        $deleteAssignments = $conn->prepare('DELETE FROM instructor_subjects WHERE instructor_id = ?');
        if (!$deleteAssignments) {
            throw new Exception('Failed to prepare assignment cleanup: ' . $conn->error);
        }
        $deleteAssignments->bind_param('i', $instructorId);
        $deleteAssignments->execute();
        $deleteAssignments->close();

        if (!empty($subjects)) {
            $placeholders = implode(',', array_fill(0, count($subjects), '?'));
            $types = str_repeat('s', count($subjects));
            $subjectLookupSql = "SELECT id, code FROM subjects WHERE code IN ($placeholders)";
            $subjectStmt = $conn->prepare($subjectLookupSql);
            if (!$subjectStmt) {
                throw new Exception('Failed to prepare subject lookup: ' . $conn->error);
            }

            $subjectStmt->bind_param($types, ...$subjects);
            $subjectStmt->execute();
            $result = $subjectStmt->get_result();
            $subjectMap = [];
            while ($row = $result->fetch_assoc()) {
                $subjectMap[$row['code']] = (int) $row['id'];
            }
            $subjectStmt->close();

            $missingSubjects = array_diff($subjects, array_keys($subjectMap));
            if (!empty($missingSubjects)) {
                $conn->rollback();
                respond(400, [
                    'status' => 'error',
                    'message' => 'The following subjects were not found: ' . implode(', ', $missingSubjects),
                ], $conn);
            }

            $insertAssignment = $conn->prepare('INSERT INTO instructor_subjects (instructor_id, subject_id) VALUES (?, ?)');
            if (!$insertAssignment) {
                throw new Exception('Failed to prepare subject assignment insert: ' . $conn->error);
            }
            foreach ($subjectMap as $subjectCode => $subjectId) {
                $insertAssignment->bind_param('ii', $instructorId, $subjectId);
                $insertAssignment->execute();
            }
            $insertAssignment->close();
        }
    }

    $conn->commit();
    $transactionStarted = false;

    respond(200, [
        'status' => 'success',
        'message' => 'Instructor updated successfully.',
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
