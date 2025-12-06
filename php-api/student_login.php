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
$password = (string) ($payload['password'] ?? '');

if ($email === '' || $password === '') {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Email and password are required.',
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
    exit;
}

try {
    $conn->set_charset('utf8mb4');

    $lookupSql = 'SELECT u.id, u.email, u.password_hash, sp.student_id_number, sp.name, sp.birthdate'
        . ' FROM users u'
        . ' INNER JOIN student_profiles sp ON sp.user_id = u.id'
        . ' WHERE u.email = ? AND u.role = "student"'
        . ' LIMIT 1';

    $lookupStmt = $conn->prepare($lookupSql);
    if (!$lookupStmt) {
        throw new Exception('Failed to prepare login query: ' . $conn->error);
    }

    $lookupStmt->bind_param('s', $email);
    $lookupStmt->execute();
    $result = $lookupStmt->get_result();

    if (!$result instanceof mysqli_result || $result->num_rows === 0) {
        $lookupStmt->close();
        http_response_code(401);
        echo json_encode([
            'status' => 'error',
            'message' => 'Invalid email or password.',
        ]);
        if ($conn instanceof mysqli) {
            $conn->close();
        }
        exit;
    }

    $userRow = $result->fetch_assoc();
    $lookupStmt->close();

    $passwordHash = $userRow['password_hash'] ?? '';
    if (!is_string($passwordHash) || $passwordHash === '') {
        http_response_code(401);
        echo json_encode([
            'status' => 'error',
            'message' => 'Invalid email or password.',
        ]);
        if ($conn instanceof mysqli) {
            $conn->close();
        }
        exit;
    }

    if (!password_verify($password, $passwordHash)) {
        http_response_code(401);
        echo json_encode([
            'status' => 'error',
            'message' => 'Invalid email or password.',
        ]);
        if ($conn instanceof mysqli) {
            $conn->close();
        }
        exit;
    }

    $needsPasswordUpdate = false;
    $birthdateRaw = $userRow['birthdate'] ?? null;
    if (is_string($birthdateRaw) && trim($birthdateRaw) !== '') {
        $timestamp = strtotime($birthdateRaw);
        if ($timestamp !== false) {
            $temporaryPassword = strtolower(date('F', $timestamp))
                . date('d', $timestamp)
                . date('Y', $timestamp);
            if (hash_equals($temporaryPassword, $password)) {
                $needsPasswordUpdate = true;
            }
        }
    }

    echo json_encode([
        'status' => 'success',
        'message' => 'Login successful.',
        'data' => [
            'email' => $userRow['email'] ?? $email,
            'studentId' => $userRow['student_id_number'] ?? '',
            'name' => $userRow['name'] ?? '',
            'needsPasswordUpdate' => $needsPasswordUpdate,
        ],
    ]);
} catch (Throwable $error) {
    $statusCode = $error->getCode();
    if (!is_int($statusCode) || $statusCode < 400 || $statusCode > 599) {
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
?>
