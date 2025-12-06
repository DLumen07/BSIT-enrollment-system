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

$studentIdInput = trim((string) ($payload['studentIdNumber'] ?? $payload['studentId'] ?? ''));
$birthdateInput = trim((string) ($payload['birthdate'] ?? ''));
$newPassword = (string) ($payload['newPassword'] ?? '');
$confirmPassword = (string) ($payload['confirmPassword'] ?? '');
$normalizedStudentId = $studentIdInput !== '' ? strtoupper($studentIdInput) : '';

if ($normalizedStudentId === '' || $birthdateInput === '') {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Student ID and birthdate are required.',
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
    exit;
}

if ($newPassword === '' || $confirmPassword === '') {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'New password and confirmation are required.',
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
    exit;
}

if (strlen($newPassword) < 8) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'New password must be at least 8 characters long.',
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
    exit;
}

if ($newPassword !== $confirmPassword) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'New password and confirmation do not match.',
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
    exit;
}

function normalize_birthdate(string $value): ?string {
    $cleanValue = trim($value);
    if ($cleanValue === '') {
        return null;
    }

    $formats = ['Y-m-d', 'm/d/Y', 'm-d-Y', 'd/m/Y', 'd-m-Y', 'Y/m/d'];
    foreach ($formats as $format) {
        $date = DateTime::createFromFormat($format, $cleanValue);
        if ($date instanceof DateTimeInterface) {
            return $date->format('Y-m-d');
        }
    }

    $timestamp = strtotime($cleanValue);
    if ($timestamp !== false) {
        return date('Y-m-d', $timestamp);
    }

    return null;
}

$normalizedBirthdate = normalize_birthdate($birthdateInput);
if ($normalizedBirthdate === null) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Unable to understand the provided birthdate. Use formats like YYYY-MM-DD or MM/DD/YYYY.',
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
    exit;
}

try {
    $conn->set_charset('utf8mb4');

    $lookupSql = 'SELECT sp.user_id, sp.birthdate, u.password_hash
        FROM student_profiles sp
        INNER JOIN users u ON u.id = sp.user_id
        WHERE sp.student_id_number = ?
          AND DATE(sp.birthdate) = ?
        LIMIT 1';
    $lookupStmt = $conn->prepare($lookupSql);
    if (!$lookupStmt) {
        throw new Exception('Failed to prepare student lookup query: ' . $conn->error);
    }

    $lookupStmt->bind_param('ss', $normalizedStudentId, $normalizedBirthdate);
    $lookupStmt->execute();
    $lookupStmt->bind_result($userId, $storedBirthdate, $currentPasswordHash);

    if (!$lookupStmt->fetch()) {
        $lookupStmt->close();
        http_response_code(404);
        echo json_encode([
            'status' => 'error',
            'message' => 'Student record not found or details do not match.',
        ]);
        if ($conn instanceof mysqli) {
            $conn->close();
        }
        exit;
    }

    $lookupStmt->close();

    if ($storedBirthdate === null || trim((string) $storedBirthdate) === '') {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'Birthdate is missing on record. Please contact the registrar.',
        ]);
        if ($conn instanceof mysqli) {
            $conn->close();
        }
        exit;
    }

    $storedBirthdateNormalized = normalize_birthdate((string) $storedBirthdate);
    if ($storedBirthdateNormalized === null) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Stored birthdate is invalid. Please contact support.',
        ]);
        if ($conn instanceof mysqli) {
            $conn->close();
        }
        exit;
    }

    if ($storedBirthdateNormalized !== $normalizedBirthdate) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'The birthdate does not match our records.',
        ]);
        if ($conn instanceof mysqli) {
            $conn->close();
        }
        exit;
    }

    if (is_string($currentPasswordHash) && $currentPasswordHash !== '' && password_verify($newPassword, $currentPasswordHash)) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'Please choose a password different from your current one.',
        ]);
        if ($conn instanceof mysqli) {
            $conn->close();
        }
        exit;
    }

    $newPasswordHash = password_hash($newPassword, PASSWORD_BCRYPT);
    if ($newPasswordHash === false) {
        throw new Exception('Failed to hash the new password.');
    }

    $updateSql = 'UPDATE users SET password_hash = ? WHERE id = ? LIMIT 1';
    $updateStmt = $conn->prepare($updateSql);
    if (!$updateStmt) {
        throw new Exception('Failed to prepare password update statement: ' . $conn->error);
    }

    $updateStmt->bind_param('si', $newPasswordHash, $userId);
    if (!$updateStmt->execute() || $updateStmt->affected_rows < 0) {
        $updateStmt->close();
        throw new Exception('Unable to update the password. Please try again later.');
    }

    $updateStmt->close();

    echo json_encode([
        'status' => 'success',
        'message' => 'Password reset successfully. You can now log in with your new password.',
    ]);
} catch (Throwable $error) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $error->getMessage(),
    ]);
} finally {
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
