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

$scheduleId = isset($input['scheduleId']) ? (int) $input['scheduleId'] : 0;

if ($scheduleId <= 0) {
    respond(400, [
        'status' => 'error',
        'message' => 'A valid schedule ID is required.',
    ], isset($conn) ? $conn : null);
}

try {
    if (!isset($conn) || !($conn instanceof mysqli)) {
        throw new Exception('Database connection is not available.');
    }

    $conn->set_charset('utf8mb4');

    $lookupStmt = $conn->prepare('SELECT id FROM schedules WHERE id = ? LIMIT 1');
    if (!$lookupStmt) {
        throw new Exception('Failed to prepare schedule lookup: ' . $conn->error);
    }
    $lookupStmt->bind_param('i', $scheduleId);
    $lookupStmt->execute();
    $lookupStmt->store_result();
    if ($lookupStmt->num_rows === 0) {
        $lookupStmt->close();
        respond(404, [
            'status' => 'error',
            'message' => 'The requested schedule could not be found.',
        ], $conn);
    }
    $lookupStmt->close();

    $deleteStmt = $conn->prepare('DELETE FROM schedules WHERE id = ? LIMIT 1');
    if (!$deleteStmt) {
        throw new Exception('Failed to prepare schedule delete: ' . $conn->error);
    }
    $deleteStmt->bind_param('i', $scheduleId);
    $deleteStmt->execute();
    $deleteStmt->close();

    respond(200, [
        'status' => 'success',
        'message' => 'Schedule deleted successfully.',
        'data' => [
            'scheduleId' => $scheduleId,
        ],
    ], $conn);
} catch (Throwable $e) {
    respond(500, [
        'status' => 'error',
        'message' => $e->getMessage(),
    ], isset($conn) ? $conn : null);
}
