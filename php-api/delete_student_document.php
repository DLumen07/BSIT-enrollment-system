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
        'message' => 'Only POST requests are allowed.'
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
    exit;
}

$rawBody = file_get_contents('php://input');
$payload = json_decode($rawBody, true);
if (!is_array($payload)) {
    $payload = $_POST;
}

$documentId = isset($payload['documentId']) ? (int) $payload['documentId'] : (isset($payload['document_id']) ? (int) $payload['document_id'] : 0);
$studentUserIdParam = isset($payload['student_user_id']) ? (int) $payload['student_user_id'] : 0;
$emailParam = isset($payload['email']) ? trim((string) $payload['email']) : '';
$studentIdParam = isset($payload['student_id']) ? trim((string) $payload['student_id']) : '';

if ($documentId <= 0) {
    http_response_code(422);
    echo json_encode([
        'status' => 'error',
        'message' => 'A valid documentId is required.'
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
    exit;
}

if ($studentUserIdParam <= 0 && $emailParam === '' && $studentIdParam === '') {
    http_response_code(422);
    echo json_encode([
        'status' => 'error',
        'message' => 'Student identifier is required.'
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
    exit;
}

try {
    if (!isset($conn) || !($conn instanceof mysqli)) {
        throw new Exception('Database connection is not available.');
    }

    $conn->set_charset('utf8mb4');

    $studentUserId = $studentUserIdParam;
    if ($studentUserId <= 0 && $emailParam !== '') {
        $userLookupSql = 'SELECT id FROM users WHERE email = ? LIMIT 1';
        $userLookupStmt = $conn->prepare($userLookupSql);
        if (!$userLookupStmt) {
            throw new Exception('Failed to prepare user lookup statement: ' . $conn->error);
        }
        $userLookupStmt->bind_param('s', $emailParam);
        $userLookupStmt->execute();
        $userResult = $userLookupStmt->get_result();
        if ($userResult && ($row = $userResult->fetch_assoc())) {
            $studentUserId = (int) $row['id'];
        }
        $userLookupStmt->close();
    }

    if ($studentUserId <= 0 && $studentIdParam !== '') {
        $studentLookupSql = 'SELECT user_id FROM student_profiles WHERE student_id_number = ? LIMIT 1';
        $studentLookupStmt = $conn->prepare($studentLookupSql);
        if (!$studentLookupStmt) {
            throw new Exception('Failed to prepare student lookup statement: ' . $conn->error);
        }
        $studentLookupStmt->bind_param('s', $studentIdParam);
        $studentLookupStmt->execute();
        $studentResult = $studentLookupStmt->get_result();
        if ($studentResult && ($row = $studentResult->fetch_assoc())) {
            $studentUserId = (int) $row['user_id'];
        }
        $studentLookupStmt->close();
    }

    $documentSql = 'SELECT id, student_user_id, file_path FROM student_documents WHERE id = ? LIMIT 1';
    $documentStmt = $conn->prepare($documentSql);
    if (!$documentStmt) {
        throw new Exception('Failed to prepare document lookup statement: ' . $conn->error);
    }
    $documentStmt->bind_param('i', $documentId);
    $documentStmt->execute();
    $documentResult = $documentStmt->get_result();
    $documentRow = $documentResult ? $documentResult->fetch_assoc() : null;
    $documentStmt->close();

    if (!$documentRow) {
        http_response_code(404);
        echo json_encode([
            'status' => 'error',
            'message' => 'Document not found.'
        ]);
        $conn->close();
        exit;
    }

    $documentOwnerId = isset($documentRow['student_user_id']) ? (int) $documentRow['student_user_id'] : 0;
    if ($studentUserId > 0 && $documentOwnerId !== $studentUserId) {
        http_response_code(403);
        echo json_encode([
            'status' => 'error',
            'message' => 'You are not allowed to delete this document.'
        ]);
        $conn->close();
        exit;
    }

    $deleteSql = 'DELETE FROM student_documents WHERE id = ? LIMIT 1';
    $deleteStmt = $conn->prepare($deleteSql);
    if (!$deleteStmt) {
        throw new Exception('Failed to prepare delete statement: ' . $conn->error);
    }
    $deleteStmt->bind_param('i', $documentId);
    if (!$deleteStmt->execute()) {
        $error = $deleteStmt->error;
        $deleteStmt->close();
        throw new Exception('Failed to delete document: ' . $error);
    }
    $deleteStmt->close();

    $filePath = $documentRow['file_path'] ?? '';
    if ($filePath !== '') {
        $absolutePath = __DIR__ . DIRECTORY_SEPARATOR . str_replace(['../', './'], '', $filePath);
        if (is_file($absolutePath)) {
            @unlink($absolutePath);
        }
    }

    echo json_encode([
        'status' => 'success',
        'message' => 'Document deleted successfully.',
        'data' => [
            'documentId' => $documentId,
        ],
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
