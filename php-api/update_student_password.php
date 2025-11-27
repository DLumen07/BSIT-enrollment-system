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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'status' => 'error',
        'message' => 'Only POST requests are allowed.',
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
    exit;
}

$rawBody = file_get_contents('php://input');
$payload = json_decode($rawBody, true);

if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Invalid JSON payload.',
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
    exit;
}

$email = trim((string) ($payload['email'] ?? ''));
$currentPassword = (string) ($payload['currentPassword'] ?? '');
$newPassword = (string) ($payload['newPassword'] ?? '');

if ($email === '' || $currentPassword === '' || $newPassword === '') {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Email, current password, and new password are required.',
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
    exit;
}

if (strlen($newPassword) < 8) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'New password must be at least 8 characters long.',
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
    exit;
}

try {
    $conn->set_charset('utf8mb4');

    $findUserSql = 'SELECT id, password_hash FROM users WHERE email = ? AND role = "student" LIMIT 1';
    $findUserStmt = $conn->prepare($findUserSql);
    if (!$findUserStmt) {
        throw new Exception('Failed to prepare user lookup statement: ' . $conn->error, 500);
    }

    $findUserStmt->bind_param('s', $email);
    $findUserStmt->execute();
    $userResult = $findUserStmt->get_result();

    if (!$userResult instanceof mysqli_result || $userResult->num_rows === 0) {
        $findUserStmt->close();
        http_response_code(404);
        echo json_encode([
            'status' => 'error',
            'message' => 'Student account not found.',
        ]);
        if ($conn instanceof mysqli) {
            $conn->close();
        }
        exit;
    }

    $userRow = $userResult->fetch_assoc();
    $findUserStmt->close();

    $userId = (int) $userRow['id'];
    $passwordHash = $userRow['password_hash'] ?? '';

    if (!is_string($passwordHash) || !password_verify($currentPassword, $passwordHash)) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'The current password you entered is incorrect.',
        ]);
        if ($conn instanceof mysqli) {
            $conn->close();
        }
        exit;
    }

    if (password_verify($newPassword, $passwordHash)) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'Please choose a different password from your current one.',
        ]);
        if ($conn instanceof mysqli) {
            $conn->close();
        }
        exit;
    }

    $newPasswordHash = password_hash($newPassword, PASSWORD_BCRYPT);
    if ($newPasswordHash === false) {
        throw new Exception('Failed to hash the new password.', 500);
    }

    $updateSql = 'UPDATE users SET password_hash = ? WHERE id = ? LIMIT 1';
    $updateStmt = $conn->prepare($updateSql);
    if (!$updateStmt) {
        throw new Exception('Failed to prepare password update statement: ' . $conn->error, 500);
    }

    $updateStmt->bind_param('si', $newPasswordHash, $userId);
    $updateStmt->execute();

    if ($updateStmt->affected_rows < 0) {
        $updateStmt->close();
        throw new Exception('Unable to update the password. Please try again later.', 500);
    }

    $updateStmt->close();

    echo json_encode([
        'status' => 'success',
        'message' => 'Password updated successfully.',
    ]);
} catch (Exception $error) {
    $statusCode = $error->getCode();
    if ($statusCode < 400 || $statusCode > 599) {
        $statusCode = 500;
    }

    http_response_code($statusCode);
    echo json_encode([
        'status' => 'error',
        'message' => $error->getMessage(),
    ]);
} finally {
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
