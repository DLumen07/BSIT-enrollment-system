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

function safe_value(?string $value): string {
    return $value !== null ? trim($value) : '';
}

$studentUserIdParam = isset($_POST['student_user_id']) ? (int) $_POST['student_user_id'] : 0;
$emailParam = safe_value($_POST['email'] ?? '');
$studentIdParam = safe_value($_POST['student_id'] ?? '');
$documentNameParam = safe_value($_POST['document_name'] ?? '');
$statusParam = safe_value($_POST['status'] ?? 'Submitted');

if ($studentUserIdParam <= 0 && $emailParam === '' && $studentIdParam === '') {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Student identifier is required.'
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
    exit;
}

if (!isset($_FILES['document'])) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'No document file uploaded.'
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
    exit;
}

$file = $_FILES['document'];
if (!is_array($file) || !isset($file['error']) || $file['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    $errorMessage = 'Failed to upload document.';
    if (isset($file['error'])) {
        switch ($file['error']) {
            case UPLOAD_ERR_INI_SIZE:
            case UPLOAD_ERR_FORM_SIZE:
                $errorMessage = 'Uploaded file exceeds the maximum allowed size.';
                break;
            case UPLOAD_ERR_PARTIAL:
                $errorMessage = 'The uploaded file was only partially uploaded.';
                break;
            case UPLOAD_ERR_NO_FILE:
                $errorMessage = 'No file was uploaded.';
                break;
            case UPLOAD_ERR_NO_TMP_DIR:
                $errorMessage = 'Missing a temporary folder on the server.';
                break;
            case UPLOAD_ERR_CANT_WRITE:
                $errorMessage = 'Failed to write uploaded file to disk.';
                break;
            case UPLOAD_ERR_EXTENSION:
                $errorMessage = 'A PHP extension stopped the file upload.';
                break;
            default:
                $errorMessage = 'Failed to upload document.';
                break;
        }
    }
    echo json_encode([
        'status' => 'error',
        'message' => $errorMessage
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
    exit;
}

$maxFileSize = 10 * 1024 * 1024;
if (isset($file['size']) && $file['size'] > $maxFileSize) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'File size exceeds the 10MB limit.'
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
    exit;
}

$originalFileName = $file['name'] ?? 'document';
$extension = strtolower(pathinfo($originalFileName, PATHINFO_EXTENSION));
$allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
$allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

if ($extension === '' || !in_array($extension, $allowedExtensions, true)) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Unsupported file type. Allowed types: JPG, PNG, WEBP, PDF.'
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
    exit;
}

if (isset($file['type']) && $file['type'] !== '' && !in_array($file['type'], $allowedMimeTypes, true)) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Unsupported file format provided.'
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
    exit;
}

$studentUserId = $studentUserIdParam;

try {
    $conn->set_charset('utf8mb4');

    if ($studentUserId <= 0) {
        if ($emailParam !== '') {
            $userLookupSql = 'SELECT id FROM users WHERE email = ? LIMIT 1';
            $userLookupStmt = $conn->prepare($userLookupSql);
            if (!$userLookupStmt) {
                throw new Exception('Failed to prepare user lookup by email: ' . $conn->error);
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
                throw new Exception('Failed to prepare student lookup by ID: ' . $conn->error);
            }
            $studentLookupStmt->bind_param('s', $studentIdParam);
            $studentLookupStmt->execute();
            $studentResult = $studentLookupStmt->get_result();
            if ($studentResult && ($row = $studentResult->fetch_assoc())) {
                $studentUserId = (int) $row['user_id'];
            }
            $studentLookupStmt->close();
        }
    }

    if ($studentUserId <= 0) {
        throw new Exception('Unable to resolve student account.');
    }

    $statusValue = in_array($statusParam, ['Submitted', 'Pending', 'Rejected'], true) ? $statusParam : 'Submitted';
    $documentName = $documentNameParam !== '' ? $documentNameParam : pathinfo($originalFileName, PATHINFO_FILENAME);

    $uploadDir = __DIR__ . DIRECTORY_SEPARATOR . 'uploads' . DIRECTORY_SEPARATOR . 'student_documents' . DIRECTORY_SEPARATOR;
    if (!is_dir($uploadDir)) {
        if (!mkdir($uploadDir, 0775, true) && !is_dir($uploadDir)) {
            throw new Exception('Failed to create upload directory.');
        }
    }

    $uniqueName = bin2hex(random_bytes(8)) . '_' . preg_replace('/[^A-Za-z0-9_\-\.]+/', '_', strtolower($originalFileName));
    if (!str_contains($uniqueName, '.')) {
        $uniqueName .= '.' . $extension;
    }

    $targetPath = $uploadDir . $uniqueName;
    if (!move_uploaded_file($file['tmp_name'], $targetPath)) {
        throw new Exception('Unable to save uploaded document.');
    }

    $relativePath = 'uploads/student_documents/' . $uniqueName;
    $fileSize = isset($file['size']) ? (int) $file['size'] : null;
    $fileMime = isset($file['type']) && $file['type'] !== '' ? $file['type'] : null;

    $insertSql = 'INSERT INTO student_documents (student_user_id, name, status, file_name, file_path, file_size, file_mime)
                  VALUES (?, ?, ?, ?, ?, ?, ?)';
    $insertStmt = $conn->prepare($insertSql);
    if (!$insertStmt) {
        if (is_file($targetPath)) {
            unlink($targetPath);
        }
        throw new Exception('Failed to prepare document insert statement: ' . $conn->error);
    }

    $fileNameStored = $uniqueName;
    $insertStmt->bind_param(
        'issssis',
        $studentUserId,
        $documentName,
        $statusValue,
        $fileNameStored,
        $relativePath,
        $fileSize,
        $fileMime
    );

    if (!$insertStmt->execute()) {
        $insertStmt->close();
        if (is_file($targetPath)) {
            unlink($targetPath);
        }
        throw new Exception('Failed to save document metadata: ' . $conn->error);
    }
    $insertStmt->close();

    $newDocumentId = $conn->insert_id;
    $selectSql = 'SELECT id, name, status, file_name, file_path, file_size, file_mime, uploaded_at, updated_at
                  FROM student_documents WHERE id = ? LIMIT 1';
    $selectStmt = $conn->prepare($selectSql);
    if (!$selectStmt) {
        throw new Exception('Failed to prepare document fetch statement: ' . $conn->error);
    }
    $selectStmt->bind_param('i', $newDocumentId);
    $selectStmt->execute();
    $documentResult = $selectStmt->get_result();
    $documentData = null;
    if ($documentResult && ($row = $documentResult->fetch_assoc())) {
        $statusValue = safe_value($row['status'] ?? '');
        $mimeValue = safe_value($row['file_mime'] ?? '');
        $uploadedAtValue = safe_value($row['uploaded_at'] ?? '');
        $updatedAtValue = safe_value($row['updated_at'] ?? '');
        $documentData = [
            'id' => isset($row['id']) ? (int) $row['id'] : $newDocumentId,
            'name' => safe_value($row['name'] ?? ''),
            'status' => $statusValue !== '' ? $statusValue : 'Submitted',
            'fileName' => safe_value($row['file_name'] ?? ''),
            'filePath' => safe_value($row['file_path'] ?? ''),
            'fileType' => $mimeValue !== '' ? $mimeValue : null,
            'fileSize' => isset($row['file_size']) ? (int) $row['file_size'] : null,
            'uploadedAt' => $uploadedAtValue !== '' ? $uploadedAtValue : null,
            'updatedAt' => $updatedAtValue !== '' ? $updatedAtValue : null,
        ];
    }
    $selectStmt->close();

    echo json_encode([
        'status' => 'success',
        'message' => 'Document uploaded successfully.',
        'data' => [
            'document' => $documentData
        ]
    ]);
} catch (Throwable $e) {
    if (isset($targetPath) && isset($uploadDir) && isset($uniqueName)) {
        $potentialFile = $uploadDir . $uniqueName;
        if (isset($potentialFile) && is_file($potentialFile)) {
            unlink($potentialFile);
        }
    }

    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
} finally {
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
?>
