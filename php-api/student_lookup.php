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

$studentIdInput = trim((string) ($payload['studentIdNumber'] ?? ''));
$normalizedStudentId = $studentIdInput !== '' ? strtoupper($studentIdInput) : '';

if ($normalizedStudentId === '') {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Student ID is required.',
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
    exit;
}

try {
    $conn->set_charset('utf8mb4');

    $lookupSql = 'SELECT sp.user_id, sp.student_id_number, sp.name, sp.status, sp.course, sp.year_level, COALESCE(u.email, "") AS email'
        . ' FROM student_profiles sp'
        . ' LEFT JOIN users u ON u.id = sp.user_id'
        . ' WHERE sp.student_id_number = ?'
        . ' LIMIT 1';

    $lookupStmt = $conn->prepare($lookupSql);
    if (!$lookupStmt) {
        throw new Exception('Failed to prepare student lookup query: ' . $conn->error);
    }

    $lookupStmt->bind_param('s', $normalizedStudentId);
    $lookupStmt->execute();
    $lookupStmt->bind_result($userId, $studentIdNumber, $name, $status, $course, $yearLevel, $email);

    if ($lookupStmt->fetch()) {
        echo json_encode([
            'status' => 'success',
            'data' => [
                'userId' => $userId,
                'studentIdNumber' => $studentIdNumber,
                'name' => $name,
                'status' => $status,
                'course' => $course,
                'yearLevel' => $yearLevel,
                'email' => $email,
            ],
        ]);
        $lookupStmt->close();
        if ($conn instanceof mysqli) {
            $conn->close();
        }
        exit;
    }

    $lookupStmt->close();

    http_response_code(404);
    echo json_encode([
        'status' => 'error',
        'message' => 'Student ID not found.',
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
    ]);
} finally {
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
?>
