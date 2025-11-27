<?php
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
            $isPrivateNetwork = preg_match('/^(192\\.168|10\\.|172\\.(1[6-9]|2[0-9]|3[0-1]))\\./', $host) === 1;
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

function respond(int $statusCode, array $payload, ?mysqli $connection = null): void {
    if ($connection instanceof mysqli) {
        $connection->close();
    }

    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    respond(204, ['status' => 'ok'], isset($conn) ? $conn : null);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, [
        'status' => 'error',
        'message' => 'Only POST requests are allowed.',
    ], isset($conn) ? $conn : null);
}

function safe_value(?string $value): string {
    return $value !== null ? trim($value) : '';
}

function delete_previous_avatar(?string $path): void {
    if (!$path) {
        return;
    }
    $trimmed = trim($path);
    if ($trimmed === '' || preg_match('/^(?:https?:)?\/\//i', $trimmed) === 1 || strpos($trimmed, 'data:') === 0) {
        return;
    }

    $normalized = str_replace(['/', '\\'], DIRECTORY_SEPARATOR, ltrim($trimmed, '\\/'));
    $fullPath = __DIR__ . DIRECTORY_SEPARATOR . $normalized;
    $uploadsDir = __DIR__ . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'avatars' . DIRECTORY_SEPARATOR;

    if (strpos($fullPath, $uploadsDir) !== 0) {
        return;
    }

    if (is_file($fullPath)) {
        @unlink($fullPath);
    }
}

$role = strtolower(safe_value($_POST['role'] ?? ''));
$allowedRoles = ['student', 'instructor', 'admin'];
if (!in_array($role, $allowedRoles, true)) {
    respond(422, [
        'status' => 'error',
        'message' => 'A valid role (student, instructor, admin) is required.',
    ], isset($conn) ? $conn : null);
}

if (!isset($_FILES['avatar'])) {
    respond(400, [
        'status' => 'error',
        'message' => 'No avatar file uploaded.',
    ], isset($conn) ? $conn : null);
}

$file = $_FILES['avatar'];
if (!is_array($file) || !isset($file['error']) || $file['error'] !== UPLOAD_ERR_OK) {
    $errorMessage = 'Failed to upload avatar.';
    if (isset($file['error'])) {
        switch ($file['error']) {
            case UPLOAD_ERR_INI_SIZE:
            case UPLOAD_ERR_FORM_SIZE:
                $errorMessage = 'Uploaded file exceeds the maximum allowed size.';
                break;
            case UPLOAD_ERR_PARTIAL:
                $errorMessage = 'The uploaded file was only partially uploaded.';
                break;
            case UPLOAD_ERR_NO_FILE:
                $errorMessage = 'No file was uploaded.';
                break;
            case UPLOAD_ERR_NO_TMP_DIR:
                $errorMessage = 'Missing a temporary folder on the server.';
                break;
            case UPLOAD_ERR_CANT_WRITE:
                $errorMessage = 'Failed to write uploaded file to disk.';
                break;
            case UPLOAD_ERR_EXTENSION:
                $errorMessage = 'A PHP extension stopped the file upload.';
                break;
            default:
                $errorMessage = 'Failed to upload avatar.';
                break;
        }
    }

    respond(400, [
        'status' => 'error',
        'message' => $errorMessage,
    ], isset($conn) ? $conn : null);
}

$maxFileSize = 5 * 1024 * 1024;
if (isset($file['size']) && $file['size'] > $maxFileSize) {
    respond(400, [
        'status' => 'error',
        'message' => 'File size exceeds the 5MB limit.',
    ], isset($conn) ? $conn : null);
}

$originalFileName = $file['name'] ?? 'avatar';
$extension = strtolower(pathinfo($originalFileName, PATHINFO_EXTENSION));
$allowedExtensions = ['jpg', 'jpeg', 'png', 'webp'];
$allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];

if ($extension === '' || !in_array($extension, $allowedExtensions, true)) {
    respond(400, [
        'status' => 'error',
        'message' => 'Unsupported file type. Allowed types: JPG, PNG, WEBP.',
    ], isset($conn) ? $conn : null);
}

if (isset($file['type']) && $file['type'] !== '' && !in_array($file['type'], $allowedMimeTypes, true)) {
    respond(400, [
        'status' => 'error',
        'message' => 'Unsupported file format provided.',
    ], isset($conn) ? $conn : null);
}

$userIdParam = 0;
if (isset($_POST['user_id'])) {
    $userIdParam = (int) $_POST['user_id'];
} elseif (isset($_POST['id'])) {
    $userIdParam = (int) $_POST['id'];
}
$emailParam = safe_value($_POST['email'] ?? '');
$studentIdParam = safe_value($_POST['student_id'] ?? '');

try {
    if (!isset($conn) || !($conn instanceof mysqli)) {
        throw new Exception('Database connection is not available.');
    }

    $conn->set_charset('utf8mb4');

    $resolvedUserId = 0;

    $resolveByUserId = function () use ($conn, $role, $userIdParam) {
        if ($userIdParam <= 0) {
            return 0;
        }
        $stmt = $conn->prepare('SELECT id FROM users WHERE id = ? AND role = ? LIMIT 1');
        if (!$stmt) {
            throw new Exception('Failed to prepare user lookup: ' . $conn->error);
        }
        $stmt->bind_param('is', $userIdParam, $role);
        $stmt->execute();
        $stmt->store_result();
        $foundId = $stmt->num_rows > 0 ? $userIdParam : 0;
        $stmt->close();
        return $foundId;
    };

    $resolveByEmail = function () use ($conn, $role, $emailParam) {
        if ($emailParam === '') {
            return 0;
        }
        $stmt = $conn->prepare('SELECT id FROM users WHERE email = ? AND role = ? LIMIT 1');
        if (!$stmt) {
            throw new Exception('Failed to prepare email lookup: ' . $conn->error);
        }
        $stmt->bind_param('ss', $emailParam, $role);
        $stmt->execute();
        $result = $stmt->get_result();
        $userRow = 0;
        if ($result && ($row = $result->fetch_assoc())) {
            $userRow = isset($row['id']) ? (int) $row['id'] : 0;
        }
        if ($result) {
            $result->free();
        }
        $stmt->close();
        return $userRow;
    };

    $resolveStudentId = function () use ($conn, $studentIdParam) {
        if ($studentIdParam === '') {
            return 0;
        }
        $stmt = $conn->prepare('SELECT user_id FROM student_profiles WHERE student_id_number = ? LIMIT 1');
        if (!$stmt) {
            throw new Exception('Failed to prepare student ID lookup: ' . $conn->error);
        }
        $stmt->bind_param('s', $studentIdParam);
        $stmt->execute();
        $result = $stmt->get_result();
        $userRow = 0;
        if ($result && ($row = $result->fetch_assoc())) {
            $userRow = isset($row['user_id']) ? (int) $row['user_id'] : 0;
        }
        if ($result) {
            $result->free();
        }
        $stmt->close();
        return $userRow;
    };

    $resolvedUserId = $resolveByUserId();
    if ($resolvedUserId <= 0) {
        $resolvedUserId = $resolveByEmail();
    }
    if ($resolvedUserId <= 0 && $role === 'student') {
        $resolvedUserId = $resolveStudentId();
    }

    if ($resolvedUserId <= 0) {
        respond(404, [
            'status' => 'error',
            'message' => 'Unable to resolve account for avatar upload.',
        ], $conn);
    }

    $selectProfileSql = '';
    switch ($role) {
        case 'student':
            $selectProfileSql = 'SELECT avatar_url FROM student_profiles WHERE user_id = ? LIMIT 1';
            break;
        case 'instructor':
            $selectProfileSql = 'SELECT avatar_url FROM instructor_profiles WHERE user_id = ? LIMIT 1';
            break;
        case 'admin':
            $selectProfileSql = 'SELECT avatar_url FROM admin_profiles WHERE user_id = ? LIMIT 1';
            break;
    }

    if ($selectProfileSql === '') {
        throw new Exception('Unsupported role for avatar upload.');
    }

    $selectStmt = $conn->prepare($selectProfileSql);
    if (!$selectStmt) {
        throw new Exception('Failed to prepare avatar lookup: ' . $conn->error);
    }
    $selectStmt->bind_param('i', $resolvedUserId);
    $selectStmt->execute();
    $result = $selectStmt->get_result();
    $profileRow = null;
    if ($result && ($row = $result->fetch_assoc())) {
        $profileRow = $row;
    }
    if ($result) {
        $result->free();
    }
    $selectStmt->close();

    if (!$profileRow) {
        throw new Exception('Profile not found for the specified user.');
    }

    $previousAvatarPath = isset($profileRow['avatar_url']) ? trim((string) $profileRow['avatar_url']) : '';

    $uploadDir = __DIR__ . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'avatars' . DIRECTORY_SEPARATOR . $role . DIRECTORY_SEPARATOR;
    if (!is_dir($uploadDir)) {
        if (!mkdir($uploadDir, 0775, true) && !is_dir($uploadDir)) {
            throw new Exception('Failed to create avatar upload directory.');
        }
    }

    $sanitizedOriginal = preg_replace('/[^A-Za-z0-9_\-\.]+/', '_', strtolower($originalFileName));
    $uniqueName = bin2hex(random_bytes(8)) . '_' . $sanitizedOriginal;
    if (strpos($uniqueName, '.') === false && $extension !== '') {
        $uniqueName .= '.' . $extension;
    }

    $targetPath = $uploadDir . $uniqueName;
    if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
        throw new Exception('Unable to save uploaded avatar.');
    }

    $relativePath = 'uploads/avatars/' . $role . '/' . $uniqueName;

    $updateSql = '';
    switch ($role) {
        case 'student':
            $updateSql = 'UPDATE student_profiles SET avatar_url = ? WHERE user_id = ? LIMIT 1';
            break;
        case 'instructor':
            $updateSql = 'UPDATE instructor_profiles SET avatar_url = ? WHERE user_id = ? LIMIT 1';
            break;
        case 'admin':
            $updateSql = 'UPDATE admin_profiles SET avatar_url = ? WHERE user_id = ? LIMIT 1';
            break;
    }

    $updateStmt = $conn->prepare($updateSql);
    if (!$updateStmt) {
        if (is_file($targetPath)) {
            unlink($targetPath);
        }
        throw new Exception('Failed to prepare avatar update statement: ' . $conn->error);
    }
    $updateStmt->bind_param('si', $relativePath, $resolvedUserId);
    if (!$updateStmt->execute()) {
        $updateStmt->close();
        if (is_file($targetPath)) {
            unlink($targetPath);
        }
        throw new Exception('Failed to update avatar: ' . $conn->error);
    }
    $updateStmt->close();

    delete_previous_avatar($previousAvatarPath);

    respond(200, [
        'status' => 'success',
        'message' => 'Avatar updated successfully.',
        'data' => [
            'avatarUrl' => $relativePath,
            'role' => $role,
            'userId' => $resolvedUserId,
        ],
    ], $conn);
} catch (Throwable $e) {
    respond(500, [
        'status' => 'error',
        'message' => $e->getMessage(),
    ], isset($conn) ? $conn : null);
}
?>
