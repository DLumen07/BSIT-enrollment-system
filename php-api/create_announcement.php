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

$title = isset($input['title']) ? trim((string) $input['title']) : '';
$message = isset($input['message']) ? trim((string) $input['message']) : '';
$audience = isset($input['audience']) ? trim((string) $input['audience']) : 'Students';
$createdBy = isset($input['createdBy']) ? (int) $input['createdBy'] : 0;

if ($title === '') {
    respond(400, [
        'status' => 'error',
        'message' => 'Announcement title is required.',
    ], isset($conn) ? $conn : null);
}

$titleLength = function_exists('mb_strlen') ? mb_strlen($title) : strlen($title);
if ($titleLength > 150) {
    respond(400, [
        'status' => 'error',
        'message' => 'Announcement title must be 150 characters or fewer.',
    ], isset($conn) ? $conn : null);
}

if ($message === '') {
    respond(400, [
        'status' => 'error',
        'message' => 'Announcement message is required.',
    ], isset($conn) ? $conn : null);
}

$allowedAudiences = ['All', 'Students', 'Instructors'];
if (!in_array($audience, $allowedAudiences, true)) {
    respond(400, [
        'status' => 'error',
        'message' => 'Audience must be one of: All, Students, or Instructors.',
    ], isset($conn) ? $conn : null);
}

if ($createdBy <= 0) {
    respond(400, [
        'status' => 'error',
        'message' => 'A valid administrator ID is required to publish an announcement.',
    ], isset($conn) ? $conn : null);
}

try {
    if (!isset($conn) || !($conn instanceof mysqli)) {
        throw new Exception('Database connection is unavailable.');
    }

    $conn->set_charset('utf8mb4');

    $ensureTableSql = <<<SQL
CREATE TABLE IF NOT EXISTS announcements (
    id INT(11) NOT NULL AUTO_INCREMENT,
    title VARCHAR(150) NOT NULL,
    message TEXT NOT NULL,
    audience ENUM('All','Students','Instructors') NOT NULL DEFAULT 'Students',
    created_by INT(11) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_announcements_audience (audience),
    KEY idx_announcements_created_by (created_by),
    CONSTRAINT fk_announcements_created_by FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
SQL;

    if (!$conn->query($ensureTableSql)) {
        throw new Exception('Failed to ensure announcements table exists: ' . $conn->error);
    }

    $userCheck = $conn->prepare('SELECT id FROM users WHERE id = ? AND role = "admin" LIMIT 1');
    if (!$userCheck) {
        throw new Exception('Failed to prepare user lookup: ' . $conn->error);
    }
    $userCheck->bind_param('i', $createdBy);
    $userCheck->execute();
    $userCheck->store_result();
    if ($userCheck->num_rows === 0) {
        $userCheck->close();
        respond(404, [
            'status' => 'error',
            'message' => 'Administrator account not found.',
        ], $conn);
    }
    $userCheck->close();

    $insertSql = 'INSERT INTO announcements (title, message, audience, created_by) VALUES (?, ?, ?, ?)';
    $insertStmt = $conn->prepare($insertSql);
    if (!$insertStmt) {
        throw new Exception('Failed to prepare announcement insert: ' . $conn->error);
    }
    $insertStmt->bind_param('sssi', $title, $message, $audience, $createdBy);
    $insertStmt->execute();
    $announcementId = (int) $insertStmt->insert_id;
    $insertStmt->close();

    $selectSql = <<<SQL
SELECT 
    a.id,
    a.title,
    a.message,
    a.audience,
    a.created_at,
    a.created_by,
    IFNULL(ap.name, 'System') AS created_by_name,
    u.email AS created_by_email
FROM announcements a
LEFT JOIN admin_profiles ap ON ap.user_id = a.created_by
LEFT JOIN users u ON u.id = a.created_by
WHERE a.id = ?
LIMIT 1
SQL;

    $selectStmt = $conn->prepare($selectSql);
    if (!$selectStmt) {
        throw new Exception('Failed to prepare announcement lookup: ' . $conn->error);
    }
    $selectStmt->bind_param('i', $announcementId);
    $selectStmt->execute();
    $result = $selectStmt->get_result();

    if (!$result || $result->num_rows === 0) {
        $selectStmt->close();
        throw new Exception('Unable to load the newly created announcement.');
    }

    $row = $result->fetch_assoc();
    $selectStmt->close();

    $announcement = [
        'id' => (int) ($row['id'] ?? 0),
        'title' => (string) ($row['title'] ?? ''),
        'message' => (string) ($row['message'] ?? ''),
        'audience' => (string) ($row['audience'] ?? 'Students'),
        'createdAt' => (string) ($row['created_at'] ?? ''),
        'createdBy' => [
            'id' => isset($row['created_by']) ? (int) $row['created_by'] : null,
            'name' => isset($row['created_by_name']) ? (string) $row['created_by_name'] : 'System',
            'email' => isset($row['created_by_email']) && $row['created_by_email'] !== null
                ? (string) $row['created_by_email']
                : null,
        ],
    ];

    respond(201, [
        'status' => 'success',
        'data' => [
            'announcement' => $announcement,
        ],
    ], $conn);
} catch (Throwable $e) {
    respond(500, [
        'status' => 'error',
        'message' => $e->getMessage(),
    ], isset($conn) ? $conn : null);
}
?>
