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

function normalize_name_part($value): string {
    if (!is_string($value) && !is_numeric($value)) {
        return '';
    }
    $trimmed = trim((string) $value);
    if ($trimmed === '') {
        return '';
    }
    $normalized = preg_replace('/\s+/u', ' ', $trimmed);
    return is_string($normalized) ? trim($normalized) : $trimmed;
}

function parse_full_name_components(string $fullName): array {
    $parts = preg_split('/\s+/', trim($fullName), -1, PREG_SPLIT_NO_EMPTY);
    if (!is_array($parts) || count($parts) === 0) {
        return ['', '', ''];
    }

    $first = array_shift($parts) ?? '';
    $last = '';
    if (count($parts) > 0) {
        $last = array_pop($parts) ?? '';
    }
    $middle = count($parts) > 0 ? implode(' ', $parts) : '';

    return [
        normalize_name_part($first),
        normalize_name_part($middle),
        normalize_name_part($last),
    ];
}

function compose_full_name(string $firstName, string $middleName, string $lastName): string {
    $segments = [];
    foreach ([$firstName, $middleName, $lastName] as $segment) {
        $normalized = normalize_name_part($segment);
        if ($normalized === '') {
            continue;
        }
        $duplicate = false;
        foreach ($segments as $existing) {
            if (strcasecmp($existing, $normalized) === 0) {
                $duplicate = true;
                break;
            }
        }
        if (!$duplicate) {
            $segments[] = $normalized;
        }
    }

    return implode(' ', $segments);
}

function normalize_for_comparison(string $value): string {
    $collapsed = preg_replace('/\s+/u', ' ', trim($value));
    if (!is_string($collapsed) || $collapsed === '') {
        $collapsed = trim($value);
    }

    return mb_strtolower($collapsed, 'UTF-8');
}

function ensure_student_profile_name_columns(mysqli $conn): void {
    static $ensured = false;

    if ($ensured) {
        return;
    }

    $definitions = [
        'first_name' => 'ADD COLUMN first_name varchar(255) DEFAULT NULL AFTER student_id_number',
        'last_name' => 'ADD COLUMN last_name varchar(255) DEFAULT NULL AFTER middle_name',
    ];

    foreach ($definitions as $column => $definition) {
        $safeColumn = $conn->real_escape_string($column);
        $columnResult = $conn->query("SHOW COLUMNS FROM student_profiles LIKE '{$safeColumn}'");
        if (!$columnResult) {
            throw new Exception('Failed to inspect student_profiles columns: ' . $conn->error);
        }
        $exists = $columnResult->num_rows > 0;
        $columnResult->free();

        if (!$exists) {
            if (!$conn->query("ALTER TABLE student_profiles {$definition}")) {
                throw new Exception('Failed to update student_profiles schema: ' . $conn->error);
            }
        }
    }

    $ensured = true;
}

$firstName = normalize_name_part($payload['firstName'] ?? '');
$middleName = normalize_name_part($payload['middleName'] ?? '');
$lastName = normalize_name_part($payload['lastName'] ?? '');
$fullNameInput = trim((string) ($payload['fullName'] ?? ''));
$email = trim((string) ($payload['email'] ?? ''));
$password = (string) ($payload['password'] ?? '');
$confirmPassword = (string) ($payload['confirmPassword'] ?? '');
$studentIdInput = trim((string) ($payload['studentIdNumber'] ?? ''));
$normalizedStudentId = $studentIdInput !== '' ? strtoupper($studentIdInput) : '';
$phoneNumber = trim((string) ($payload['phoneNumber'] ?? ''));

$desiredCourse = strtoupper(trim((string) ($payload['course'] ?? '')));
$desiredYearLevel = (int) ($payload['yearLevel'] ?? 0);

$validCourses = ['BSIT', 'ACT'];
$defaultCourse = 'BSIT';
$defaultYearLevel = 1;
$defaultStatus = 'New';

$course = in_array($desiredCourse, $validCourses, true) ? $desiredCourse : $defaultCourse;
$yearLevel = ($desiredYearLevel >= 1 && $desiredYearLevel <= 4) ? $desiredYearLevel : $defaultYearLevel;
$profileStatus = $defaultStatus;
$isReturningStudent = false;
$returningUserId = null;
$lookupProfile = null;

if (($firstName === '' || $lastName === '') && $fullNameInput !== '') {
    [$parsedFirst, $parsedMiddle, $parsedLast] = parse_full_name_components($fullNameInput);
    if ($firstName === '') {
        $firstName = $parsedFirst;
    }
    if ($middleName === '' && $parsedMiddle !== '') {
        $middleName = $parsedMiddle;
    }
    if ($lastName === '') {
        $lastName = $parsedLast;
    }
}

if ($firstName === '' || $lastName === '') {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'First name and last name are required.',
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
    exit;
}

$fullName = compose_full_name($firstName, $middleName, $lastName);
$firstNameKey = normalize_for_comparison($firstName);
$lastNameKey = normalize_for_comparison($lastName);
$fullNameKey = normalize_for_comparison($fullName);
$firstNameCompactKey = str_replace(' ', '', $firstNameKey);
$lastNameCompactKey = str_replace(' ', '', $lastNameKey);
$fullNameCompactKey = str_replace(' ', '', $fullNameKey);

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'A valid email address is required.',
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
    exit;
}

if (strlen($password) < 8) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Password must be at least 8 characters long.',
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
    exit;
}

if ($password !== $confirmPassword) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Passwords do not match.',
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
    exit;
}

try {
    $transactionStarted = false;
    $conn->set_charset('utf8mb4');
    ensure_student_profile_name_columns($conn);

    if ($normalizedStudentId !== '') {
        $lookupSql = 'SELECT user_id, student_id_number, name, course, year_level, status FROM student_profiles WHERE student_id_number = ? LIMIT 1';
        $lookupStmt = $conn->prepare($lookupSql);
        if (!$lookupStmt) {
            throw new Exception('Failed to prepare student lookup query: ' . $conn->error);
        }
        $lookupStmt->bind_param('s', $normalizedStudentId);
        $lookupStmt->execute();
        $lookupStmt->bind_result($foundUserId, $foundStudentId, $foundName, $foundCourse, $foundYearLevel, $foundStatus);
        if ($lookupStmt->fetch()) {
            $lookupProfile = [
                'user_id' => $foundUserId,
                'student_id_number' => $foundStudentId,
                'name' => $foundName,
                'course' => $foundCourse,
                'year_level' => $foundYearLevel,
                'status' => $foundStatus,
            ];
            $isReturningStudent = true;
            $returningUserId = (int) $foundUserId;
            $course = in_array($foundCourse, $validCourses, true) ? $foundCourse : $course;
            $yearLevel = (int) $foundYearLevel > 0 ? (int) $foundYearLevel : $yearLevel;
            $profileStatus = $foundStatus !== null && $foundStatus !== '' ? $foundStatus : 'Old';
        }
        $lookupStmt->close();
    }

    if (!$isReturningStudent) {
        $nameCheckSql = 'SELECT sp.student_id_number FROM student_profiles sp WHERE ((sp.first_name IS NOT NULL AND sp.last_name IS NOT NULL AND REPLACE(LOWER(sp.first_name), " ", "") = ? AND REPLACE(LOWER(sp.last_name), " ", "") = ?) OR REPLACE(LOWER(sp.name), " ", "") = ?) LIMIT 1';
        $nameCheckStmt = $conn->prepare($nameCheckSql);
        if (!$nameCheckStmt) {
            throw new Exception('Failed to prepare duplicate name check: ' . $conn->error);
        }
        $nameCheckStmt->bind_param('sss', $firstNameCompactKey, $lastNameCompactKey, $fullNameCompactKey);
        $nameCheckStmt->execute();
        $nameCheckStmt->bind_result($existingStudentIdForName);
        if ($nameCheckStmt->fetch()) {
            $nameCheckStmt->close();
            http_response_code(409);
            echo json_encode([
                'status' => 'error',
                'message' => 'A student with the same name already exists. If this is you, use the returning student option with your Student ID.',
                'data' => [
                    'studentIdNumber' => $existingStudentIdForName,
                ],
            ]);
            if ($conn instanceof mysqli) {
                $conn->close();
            }
            exit;
        }
        $nameCheckStmt->close();
    }

    $emailExistsSql = 'SELECT id FROM users WHERE email = ? LIMIT 1';
    $emailStmt = $conn->prepare($emailExistsSql);
    if (!$emailStmt) {
        throw new Exception('Failed to prepare email verification query: ' . $conn->error);
    }
    $emailStmt->bind_param('s', $email);
    $emailStmt->execute();
    $emailStmt->bind_result($existingUserIdWithEmail);
    $emailExistsForDifferentUser = false;
    if ($emailStmt->fetch()) {
        if (!$isReturningStudent || $existingUserIdWithEmail !== $returningUserId) {
            $emailExistsForDifferentUser = true;
        }
    }
    $emailStmt->close();

    if ($emailExistsForDifferentUser) {
        http_response_code(409);
        echo json_encode([
            'status' => 'error',
            'message' => 'An account with this email already exists.',
        ]);
        if ($conn instanceof mysqli) {
            $conn->close();
        }
        exit;
    }

    $conn->begin_transaction();
    $transactionStarted = true;

    $passwordHash = password_hash($password, PASSWORD_BCRYPT);

    if ($isReturningStudent && $returningUserId !== null) {
        $updateUserSql = "UPDATE users SET email = ?, password_hash = ?, role = 'student' WHERE id = ?";
        $updateUserStmt = $conn->prepare($updateUserSql);
        if (!$updateUserStmt) {
            throw new Exception('Failed to prepare user update statement: ' . $conn->error);
        }
        $updateUserStmt->bind_param('ssi', $email, $passwordHash, $returningUserId);
        if (!$updateUserStmt->execute()) {
            throw new Exception('Failed to update existing student account: ' . $updateUserStmt->error);
        }
        $updateUserStmt->close();

        $studentIdNumber = $lookupProfile['student_id_number'];
        $profileStatus = $profileStatus ?: 'Old';

        $updateProfileSql = 'UPDATE student_profiles SET first_name = ?, middle_name = NULLIF(?, ""), last_name = ?, name = ?, status = ?, course = ?, year_level = ?, phone_number = NULLIF(?, "") WHERE user_id = ?';
        $updateProfileStmt = $conn->prepare($updateProfileSql);
        if (!$updateProfileStmt) {
            throw new Exception('Failed to prepare profile update statement: ' . $conn->error);
        }
        $updateProfileStmt->bind_param('ssssssisi', $firstName, $middleName, $lastName, $fullName, $profileStatus, $course, $yearLevel, $phoneNumber, $returningUserId);
        if (!$updateProfileStmt->execute()) {
            throw new Exception('Failed to update student profile: ' . $updateProfileStmt->error);
        }
        $updateProfileStmt->close();

        $userId = $returningUserId;
    } else {
        $insertUserSql = "INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'student')";
        $userStmt = $conn->prepare($insertUserSql);
        if (!$userStmt) {
            throw new Exception('Failed to prepare user insert statement: ' . $conn->error);
        }
        $userStmt->bind_param('ss', $email, $passwordHash);
        if (!$userStmt->execute()) {
            throw new Exception('Failed to create user account: ' . $userStmt->error);
        }
        $userId = $conn->insert_id;
        $userStmt->close();

        $currentYear = date('y');
        $idPrefix = sprintf('%s-00-', $currentYear);
        $nextIdSql = 'SELECT student_id_number FROM student_profiles WHERE student_id_number LIKE CONCAT(?, "%") ORDER BY student_id_number DESC LIMIT 1';
        $idStmt = $conn->prepare($nextIdSql);
        if (!$idStmt) {
            throw new Exception('Failed to prepare student ID query: ' . $conn->error);
        }
        $idStmt->bind_param('s', $idPrefix);
        $idStmt->execute();
        $idStmt->bind_result($lastStudentId);
        $sequenceNumber = 1;
        if ($idStmt->fetch() && $lastStudentId !== null) {
            $parts = explode('-', $lastStudentId);
            $lastSequence = (int) end($parts);
            $sequenceNumber = $lastSequence + 1;
        }
        $idStmt->close();

        $studentIdNumber = sprintf('%s%04d', $idPrefix, $sequenceNumber);
        $profileStatus = 'New';

        $insertProfileSql = 'INSERT INTO student_profiles (
            user_id, student_id_number, first_name, middle_name, last_name, name, course, year_level, enrollment_status, status, phone_number
        ) VALUES (?, ?, ?, NULLIF(?, ""), ?, ?, ?, ?, "Not Enrolled", ?, NULLIF(?, ""))';
        $profileStmt = $conn->prepare($insertProfileSql);
        if (!$profileStmt) {
            throw new Exception('Failed to prepare student profile insert statement: ' . $conn->error);
        }
        $profileStmt->bind_param(
            'issssssiss',
            $userId,
            $studentIdNumber,
            $firstName,
            $middleName,
            $lastName,
            $fullName,
            $course,
            $yearLevel,
            $profileStatus,
            $phoneNumber
        );
        if (!$profileStmt->execute()) {
            throw new Exception('Failed to create student profile: ' . $profileStmt->error);
        }
        $profileStmt->close();
    }

    $conn->commit();
    $transactionStarted = false;

    echo json_encode([
        'status' => 'success',
        'message' => ($isReturningStudent
            ? 'Student account updated successfully. Student ID: ' . $studentIdNumber
            : 'Student account created successfully. Assigned Student ID: ' . $studentIdNumber),
        'data' => [
            'userId' => $userId,
            'studentIdNumber' => $studentIdNumber,
            'email' => $email,
            'firstName' => $firstName,
            'middleName' => $middleName,
            'lastName' => $lastName,
            'name' => $fullName,
            'status' => $profileStatus,
            'course' => $course,
            'yearLevel' => $yearLevel,
            'isReturning' => $isReturningStudent,
        ],
    ]);
} catch (Throwable $e) {
    if (isset($conn) && $conn instanceof mysqli) {
        if ($transactionStarted) {
            $conn->rollback();
        }
        if ($conn->errno) {
            error_log('Student signup DB error: ' . $conn->error);
        }
    }
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
