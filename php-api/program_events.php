<?php
declare(strict_types=1);

require_once 'db_config.php';

header('Content-Type: application/json; charset=UTF-8');

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

header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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

function normalize_event_row(array $row): array
{
    $eventId = isset($row['id']) ? (int) $row['id'] : 0;
    return [
        'id' => $eventId,
        'eventDate' => isset($row['event_date']) ? (string) $row['event_date'] : null,
        'title' => (string) ($row['title'] ?? ''),
        'description' => array_key_exists('description', $row) && $row['description'] !== null
            ? (string) $row['description']
            : null,
        'createdAt' => (string) ($row['created_at'] ?? ''),
        'updatedAt' => (string) ($row['updated_at'] ?? ''),
        'createdBy' => [
            'id' => isset($row['created_by']) ? (int) $row['created_by'] : null,
            'name' => array_key_exists('created_by_name', $row) && $row['created_by_name'] !== null
                ? (string) $row['created_by_name']
                : null,
            'email' => array_key_exists('created_by_email', $row) && $row['created_by_email'] !== null
                ? (string) $row['created_by_email']
                : null,
        ],
    ];
}

function load_event_by_id(mysqli $connection, int $eventId): ?array
{
    $lookupSql = <<<SQL
SELECT 
    pe.id,
    pe.event_date,
    pe.title,
    pe.description,
    pe.created_by,
    pe.created_at,
    pe.updated_at,
    ap.name AS created_by_name,
    u.email AS created_by_email
FROM program_events pe
LEFT JOIN admin_profiles ap ON ap.user_id = pe.created_by
LEFT JOIN users u ON u.id = pe.created_by
WHERE pe.id = ?
LIMIT 1
SQL;

    $lookupStmt = $connection->prepare($lookupSql);
    if (!$lookupStmt) {
        throw new Exception('Failed to prepare event lookup: ' . $connection->error);
    }

    $lookupStmt->bind_param('i', $eventId);
    $lookupStmt->execute();
    $result = $lookupStmt->get_result();
    $row = $result ? $result->fetch_assoc() : null;
    $lookupStmt->close();

    if (!$row) {
        return null;
    }

    return normalize_event_row($row);
}

try {
    if (!isset($conn) || !($conn instanceof mysqli)) {
        throw new Exception('Database connection is unavailable.');
    }

    $conn->set_charset('utf8mb4');

    $ensureTableSql = <<<SQL
CREATE TABLE IF NOT EXISTS program_events (
    id INT(11) NOT NULL AUTO_INCREMENT,
    event_date DATE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT NULL,
    created_by INT(11) DEFAULT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_program_events_event_date (event_date),
    KEY idx_program_events_created_by (created_by),
    CONSTRAINT fk_program_events_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
SQL;

    if (!$conn->query($ensureTableSql)) {
        throw new Exception('Failed to ensure program_events table exists: ' . $conn->error);
    }

    $rawBody = file_get_contents('php://input');
    $input = json_decode($rawBody, true);
    if (!is_array($input)) {
        $input = [];
    }

    if ($_SERVER['REQUEST_METHOD'] === 'GET' && empty($input)) {
        $input = $_GET ?? [];
    }

    $action = $input['action'] ?? null;
    if (!is_string($action) || $action === '') {
        $action = $_SERVER['REQUEST_METHOD'] === 'GET' ? 'list' : 'list';
    }

    $action = strtolower($action);

    switch ($action) {
        case 'list':
            $listSql = <<<SQL
SELECT 
    pe.id,
    pe.event_date,
    pe.title,
    pe.description,
    pe.created_by,
    pe.created_at,
    pe.updated_at,
    ap.name AS created_by_name,
    u.email AS created_by_email
FROM program_events pe
LEFT JOIN admin_profiles ap ON ap.user_id = pe.created_by
LEFT JOIN users u ON u.id = pe.created_by
ORDER BY pe.event_date ASC, pe.created_at ASC
SQL;

            $result = $conn->query($listSql);
            if (!$result) {
                throw new Exception('Failed to load program events: ' . $conn->error);
            }

            $events = [];
            while ($row = $result->fetch_assoc()) {
                $events[] = normalize_event_row($row);
            }

            respond(200, [
                'status' => 'success',
                'data' => [
                    'events' => $events,
                ],
            ], $conn);
            break;

        case 'create':
            $title = isset($input['title']) ? trim((string) $input['title']) : '';
            $description = isset($input['description']) && $input['description'] !== null
                ? trim((string) $input['description'])
                : null;
            $eventDateRaw = isset($input['eventDate']) ? trim((string) $input['eventDate']) : '';
            $createdBy = isset($input['createdBy']) ? (int) $input['createdBy'] : 0;

            if ($title === '') {
                respond(400, [
                    'status' => 'error',
                    'message' => 'Event title is required.',
                ], $conn);
            }

            $titleLength = function_exists('mb_strlen') ? mb_strlen($title) : strlen($title);
            if ($titleLength > 255) {
                respond(400, [
                    'status' => 'error',
                    'message' => 'Event title must be 255 characters or fewer.',
                ], $conn);
            }

            if ($eventDateRaw === '') {
                respond(400, [
                    'status' => 'error',
                    'message' => 'Event date is required.',
                ], $conn);
            }

            $eventDate = DateTimeImmutable::createFromFormat('Y-m-d', $eventDateRaw);
            if (!$eventDate) {
                respond(400, [
                    'status' => 'error',
                    'message' => 'Event date must be in YYYY-MM-DD format.',
                ], $conn);
            }

            if ($createdBy <= 0) {
                respond(400, [
                    'status' => 'error',
                    'message' => 'A valid administrator ID is required to create events.',
                ], $conn);
            }

            $adminLookup = $conn->prepare('SELECT id FROM users WHERE id = ? AND role = "admin" LIMIT 1');
            if (!$adminLookup) {
                throw new Exception('Failed to prepare admin lookup: ' . $conn->error);
            }
            $adminLookup->bind_param('i', $createdBy);
            $adminLookup->execute();
            $adminLookup->store_result();
            if ($adminLookup->num_rows === 0) {
                $adminLookup->close();
                respond(404, [
                    'status' => 'error',
                    'message' => 'Administrator account not found.',
                ], $conn);
            }
            $adminLookup->close();

            $insertSql = 'INSERT INTO program_events (event_date, title, description, created_by) VALUES (?, ?, ?, ?)';
            $insertStmt = $conn->prepare($insertSql);
            if (!$insertStmt) {
                throw new Exception('Failed to prepare program event insert: ' . $conn->error);
            }
            $eventDateFormatted = $eventDate->format('Y-m-d');
            $insertStmt->bind_param('sssi', $eventDateFormatted, $title, $description, $createdBy);
            $insertStmt->execute();
            $newEventId = (int) $insertStmt->insert_id;
            $insertStmt->close();

            $event = load_event_by_id($conn, $newEventId);
            if ($event === null) {
                throw new Exception('Unable to load the newly created program event.');
            }

            respond(201, [
                'status' => 'success',
                'data' => [
                    'event' => $event,
                ],
            ], $conn);
            break;

        case 'delete':
            $eventId = isset($input['eventId']) ? (int) $input['eventId'] : 0;
            if ($eventId <= 0) {
                respond(400, [
                    'status' => 'error',
                    'message' => 'A valid event ID is required to delete.',
                ], $conn);
            }

            $existingEvent = load_event_by_id($conn, $eventId);
            if ($existingEvent === null) {
                respond(404, [
                    'status' => 'error',
                    'message' => 'Program event not found.',
                ], $conn);
            }

            $deleteStmt = $conn->prepare('DELETE FROM program_events WHERE id = ? LIMIT 1');
            if (!$deleteStmt) {
                throw new Exception('Failed to prepare program event delete: ' . $conn->error);
            }
            $deleteStmt->bind_param('i', $eventId);
            $deleteStmt->execute();
            $deleteStmt->close();

            respond(200, [
                'status' => 'success',
                'data' => [
                    'deletedEventId' => $eventId,
                ],
            ], $conn);
            break;

        default:
            respond(400, [
                'status' => 'error',
                'message' => 'Unsupported action for program events.',
            ], $conn);
    }
} catch (Throwable $e) {
    respond(500, [
        'status' => 'error',
        'message' => $e->getMessage(),
    ], isset($conn) ? $conn : null);
}
?>
