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

$documentId = isset($payload['documentId']) ? (int) $payload['documentId'] : 0;
$status = isset($payload['status']) ? trim((string) $payload['status']) : '';

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

$allowedStatuses = ['Submitted', 'Pending', 'Approved', 'Rejected'];
$normalizedStatus = null;
foreach ($allowedStatuses as $allowed) {
    if (strcasecmp($status, $allowed) === 0) {
        $normalizedStatus = $allowed;
        break;
    }
}

if ($normalizedStatus === null) {
    http_response_code(422);
    echo json_encode([
        'status' => 'error',
        'message' => 'Status must be one of: ' . implode(', ', $allowedStatuses) . '.',
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

    $selectSql = 'SELECT id FROM student_documents WHERE id = ? LIMIT 1';
    $selectStmt = $conn->prepare($selectSql);
    if (!$selectStmt) {
        throw new Exception('Failed to prepare document lookup statement: ' . $conn->error);
    }
    $selectStmt->bind_param('i', $documentId);
    $selectStmt->execute();
    $result = $selectStmt->get_result();
    if (!$result || !$result->fetch_assoc()) {
        $selectStmt->close();
        http_response_code(404);
        echo json_encode([
            'status' => 'error',
            'message' => 'Document not found.'
        ]);
        $conn->close();
        exit;
    }
    $selectStmt->close();

    $updateSql = 'UPDATE student_documents SET status = ?, updated_at = NOW() WHERE id = ? LIMIT 1';
    $updateStmt = $conn->prepare($updateSql);
    if (!$updateStmt) {
        throw new Exception('Failed to prepare document update statement: ' . $conn->error);
    }
    $updateStmt->bind_param('si', $normalizedStatus, $documentId);
    if (!$updateStmt->execute()) {
        $error = $updateStmt->error;
        $updateStmt->close();
        throw new Exception('Failed to update document status: ' . $error);
    }
    $updateStmt->close();

    $fetchSql = 'SELECT id, student_user_id, name, status, file_name, file_path, file_size, file_mime, uploaded_at, updated_at
                 FROM student_documents WHERE id = ? LIMIT 1';
    $fetchStmt = $conn->prepare($fetchSql);
    if (!$fetchStmt) {
        throw new Exception('Failed to prepare document fetch statement: ' . $conn->error);
    }
    $fetchStmt->bind_param('i', $documentId);
    $fetchStmt->execute();
    $documentResult = $fetchStmt->get_result();
    $documentData = null;
    if ($documentResult && ($row = $documentResult->fetch_assoc())) {
        $documentData = [
            'id' => isset($row['id']) ? (int) $row['id'] : $documentId,
            'studentUserId' => isset($row['student_user_id']) ? (int) $row['student_user_id'] : null,
            'name' => $row['name'] ?? '',
            'status' => $row['status'] ?? $normalizedStatus,
            'fileName' => $row['file_name'] ?? '',
            'filePath' => $row['file_path'] ?? '',
            'fileType' => isset($row['file_mime']) && $row['file_mime'] !== '' ? $row['file_mime'] : null,
            'fileSize' => isset($row['file_size']) ? (int) $row['file_size'] : null,
            'uploadedAt' => $row['uploaded_at'] ?? null,
            'updatedAt' => $row['updated_at'] ?? null,
        ];
    }
    $fetchStmt->close();

    echo json_encode([
        'status' => 'success',
        'message' => 'Document status updated.',
        'data' => [
            'document' => $documentData,
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
