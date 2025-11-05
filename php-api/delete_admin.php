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

$userId = isset($input['userId']) ? (int) $input['userId'] : 0;

if ($userId <= 0) {
    respond(400, [
        'status' => 'error',
        'message' => 'A valid administrator ID is required.',
    ], isset($conn) ? $conn : null);
}

try {
    if (!isset($conn) || !($conn instanceof mysqli)) {
        throw new Exception('Database connection is not available.');
    }

    $conn->set_charset('utf8mb4');

    $lookup = $conn->prepare('SELECT ap.admin_role FROM users u INNER JOIN admin_profiles ap ON ap.user_id = u.id WHERE u.id = ? AND u.role = "admin" LIMIT 1');
    if (!$lookup) {
        throw new Exception('Failed to prepare admin lookup: ' . $conn->error);
    }
    $lookup->bind_param('i', $userId);
    $lookup->execute();
    $result = $lookup->get_result();
    $adminRow = $result ? $result->fetch_assoc() : null;
    $lookup->close();

    if (!$adminRow) {
        respond(404, [
            'status' => 'error',
            'message' => 'Administrator not found.',
        ], $conn);
    }

    $adminRole = $adminRow['admin_role'] ?? '';

    if ($adminRole === 'Super Admin') {
        $countStmt = $conn->prepare('SELECT COUNT(*) AS super_admins FROM admin_profiles WHERE admin_role = "Super Admin" AND user_id <> ?');
        if (!$countStmt) {
            throw new Exception('Failed to prepare super admin count query: ' . $conn->error);
        }
        $countStmt->bind_param('i', $userId);
        $countStmt->execute();
        $countResult = $countStmt->get_result();
        $countRow = $countResult ? $countResult->fetch_assoc() : null;
        $countStmt->close();

        $remainingSuperAdmins = $countRow ? (int) $countRow['super_admins'] : 0;
        if ($remainingSuperAdmins <= 0) {
            respond(409, [
                'status' => 'error',
                'message' => 'Cannot delete the last Super Admin account.',
            ], $conn);
        }
    }

    $conn->begin_transaction();
    $transactionStarted = true;

    $deleteUser = $conn->prepare('DELETE FROM users WHERE id = ? AND role = "admin" LIMIT 1');
    if (!$deleteUser) {
        throw new Exception('Failed to prepare administrator delete statement: ' . $conn->error);
    }
    $deleteUser->bind_param('i', $userId);
    $deleteUser->execute();
    $affected = $deleteUser->affected_rows;
    $deleteUser->close();

    if ($affected === 0) {
        throw new Exception('Failed to delete administrator account.');
    }

    $conn->commit();
    $transactionStarted = false;

    respond(200, [
        'status' => 'success',
        'message' => 'Administrator deleted successfully.',
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
