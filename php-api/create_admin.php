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

$name = isset($input['name']) ? trim((string) $input['name']) : '';
$email = isset($input['email']) ? strtolower(trim((string) $input['email'])) : '';
$password = isset($input['password']) ? (string) $input['password'] : '';
$role = isset($input['role']) ? trim((string) $input['role']) : 'Admin';
$avatar = isset($input['avatar']) ? trim((string) $input['avatar']) : '';

$allowedRoles = ['Super Admin', 'Admin', 'Moderator'];

if ($name === '' || $email === '' || $password === '') {
    respond(400, [
        'status' => 'error',
        'message' => 'Name, email, and password are required.',
    ], isset($conn) ? $conn : null);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(400, [
        'status' => 'error',
        'message' => 'Please provide a valid email address.',
    ], isset($conn) ? $conn : null);
}

if (!in_array($role, $allowedRoles, true)) {
    respond(400, [
        'status' => 'error',
        'message' => 'Invalid administrator role supplied.',
    ], isset($conn) ? $conn : null);
}

if (strlen($password) < 6) {
    respond(400, [
        'status' => 'error',
        'message' => 'Password must be at least 6 characters long.',
    ], isset($conn) ? $conn : null);
}

try {
    if (!isset($conn) || !($conn instanceof mysqli)) {
        throw new Exception('Database connection is not available.');
    }

    $conn->set_charset('utf8mb4');
    $conn->begin_transaction();
    $transactionStarted = true;

    $duplicateCheck = $conn->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    if (!$duplicateCheck) {
        throw new Exception('Failed to prepare duplicate email check: ' . $conn->error);
    }
    $duplicateCheck->bind_param('s', $email);
    $duplicateCheck->execute();
    $duplicateCheck->store_result();

    if ($duplicateCheck->num_rows > 0) {
        $duplicateCheck->close();
        $conn->rollback();
        respond(409, [
            'status' => 'error',
            'message' => 'An account with this email already exists.',
        ], $conn);
    }
    $duplicateCheck->close();

    $passwordHash = password_hash($password, PASSWORD_BCRYPT);
    $userRole = 'admin';

    $insertUser = $conn->prepare('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)');
    if (!$insertUser) {
        throw new Exception('Failed to prepare user insert: ' . $conn->error);
    }
    $insertUser->bind_param('sss', $email, $passwordHash, $userRole);
    $insertUser->execute();
    $userId = (int) $insertUser->insert_id;
    $insertUser->close();

    $avatarValue = $avatar !== '' ? $avatar : '';

    $insertProfile = $conn->prepare('INSERT INTO admin_profiles (user_id, name, avatar_url, admin_role) VALUES (?, ?, ?, ?)');
    if (!$insertProfile) {
        throw new Exception('Failed to prepare admin profile insert: ' . $conn->error);
    }
    $insertProfile->bind_param('isss', $userId, $name, $avatarValue, $role);
    $insertProfile->execute();
    $insertProfile->close();

    $conn->commit();
    $transactionStarted = false;

    respond(200, [
        'status' => 'success',
        'message' => 'Administrator created successfully.',
        'data' => [
            'admin' => [
                'id' => $userId,
                'name' => $name,
                'email' => $email,
                'role' => $role,
                'avatar' => $avatarValue ?? '',
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
