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

$email = trim((string) ($payload['email'] ?? ''));
$profileData = $payload['profile'] ?? null;

if ($email === '' || !is_array($profileData)) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Student email and profile data are required.',
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
    exit;
}

function sanitize_input_string($value): string {
    if (is_string($value) || is_numeric($value)) {
        return trim((string) $value);
    }
    return '';
}

function format_output_string(?string $value): string {
    return $value !== null ? trim($value) : '';
}

function map_year_level(int $yearLevel): string {
    switch ($yearLevel) {
        case 1:
            return '1st Year';
        case 2:
            return '2nd Year';
        case 3:
            return '3rd Year';
        case 4:
            return '4th Year';
        default:
            return $yearLevel . 'th Year';
    }
}

function fetch_student_profile_data(mysqli $conn, int $userId): array {
    $studentSql = 'SELECT sp.*, u.email, b.name AS block_name
                    FROM student_profiles sp
                    INNER JOIN users u ON u.id = sp.user_id
                    LEFT JOIN blocks b ON b.id = sp.block_id
                    WHERE sp.user_id = ?
                    LIMIT 1';

    $studentStmt = $conn->prepare($studentSql);
    if (!$studentStmt) {
        throw new Exception('Failed to prepare student lookup query: ' . $conn->error, 500);
    }

    $studentStmt->bind_param('i', $userId);
    $studentStmt->execute();
    $studentResult = $studentStmt->get_result();

    if (!$studentResult instanceof mysqli_result || $studentResult->num_rows === 0) {
        $studentStmt->close();
        throw new Exception('Student profile could not be loaded after update.', 500);
    }

    $studentRow = $studentResult->fetch_assoc();
    $studentStmt->close();

    $blockId = isset($studentRow['block_id']) ? (int) $studentRow['block_id'] : null;
    $studentUserId = (int) $studentRow['user_id'];

    $fullName = format_output_string($studentRow['name'] ?? '');
    $nameParts = preg_split('/\s+/', $fullName, -1, PREG_SPLIT_NO_EMPTY);
    $firstName = '';
    $lastName = '';

    if (is_array($nameParts) && count($nameParts) > 0) {
        $firstName = array_shift($nameParts) ?? '';
        $lastName = count($nameParts) > 0 ? implode(' ', $nameParts) : '';
    }

    $middleName = format_output_string($studentRow['middle_name'] ?? '');
    $birthdate = format_output_string($studentRow['birthdate'] ?? '');
    $sex = format_output_string($studentRow['sex'] ?? '');
    $civilStatus = format_output_string($studentRow['civil_status'] ?? '');
    $nationality = format_output_string($studentRow['nationality'] ?? '');
    $religion = format_output_string($studentRow['religion'] ?? '');
    $dialect = format_output_string($studentRow['dialect'] ?? '');

    $currentAddress = format_output_string($studentRow['current_address'] ?? '');
    $permanentAddress = format_output_string($studentRow['permanent_address'] ?? '');

    $fathersName = format_output_string($studentRow['fathers_name'] ?? '');
    $fathersOccupation = format_output_string($studentRow['fathers_occupation'] ?? '');
    $mothersName = format_output_string($studentRow['mothers_name'] ?? '');
    $mothersOccupation = format_output_string($studentRow['mothers_occupation'] ?? '');
    $guardiansName = format_output_string($studentRow['guardians_name'] ?? '');

    $emergencyContactName = format_output_string($studentRow['emergency_contact_name'] ?? '');
    $emergencyContactAddress = format_output_string($studentRow['emergency_contact_address'] ?? '');
    $emergencyContactNumber = format_output_string($studentRow['emergency_contact_number'] ?? '');

    $elementarySchool = format_output_string($studentRow['elementary_school'] ?? '');
    $elemYearGraduated = format_output_string($studentRow['elem_year_graduated'] ?? '');
    $secondarySchool = format_output_string($studentRow['secondary_school'] ?? '');
    $secondaryYearGraduated = format_output_string($studentRow['secondary_year_graduated'] ?? '');
    $collegiateSchool = format_output_string($studentRow['collegiate_school'] ?? '');

    $studentIdNumber = format_output_string($studentRow['student_id_number'] ?? '');
    $course = format_output_string($studentRow['course'] ?? '');
    $yearLevelNumeric = isset($studentRow['year_level']) ? (int) $studentRow['year_level'] : 0;
    $yearLevelLabel = $yearLevelNumeric > 0 ? map_year_level($yearLevelNumeric) : '';
    $blockName = format_output_string($studentRow['block_name'] ?? '');
    $profileStatus = format_output_string($studentRow['status'] ?? '');
    $enrollmentStatus = format_output_string($studentRow['enrollment_status'] ?? '');
    $specialization = format_output_string($studentRow['specialization'] ?? '');
    $phoneNumber = format_output_string($studentRow['phone_number'] ?? '');

    $isEnrolled = strcasecmp($enrollmentStatus, 'Enrolled') === 0;

    $subjects = [];
    $subjectsSql = 'SELECT subj.id, subj.code, subj.description, subj.units
                     FROM student_subjects ss
                     INNER JOIN subjects subj ON subj.id = ss.subject_id
                     WHERE ss.student_user_id = ?
                     ORDER BY subj.code';
    $subjectsStmt = $conn->prepare($subjectsSql);
    if ($subjectsStmt) {
        $subjectsStmt->bind_param('i', $studentUserId);
        $subjectsStmt->execute();
        $subjectsResult = $subjectsStmt->get_result();
        while ($subjectsResult && ($row = $subjectsResult->fetch_assoc())) {
            $subjects[] = [
                'id' => (int) $row['id'],
                'code' => format_output_string($row['code'] ?? ''),
                'description' => format_output_string($row['description'] ?? ''),
                'units' => isset($row['units']) ? (int) $row['units'] : 0,
            ];
        }
        $subjectsStmt->close();
    }

    $schedule = [];
    $subjectScheduleMap = [];
    $subjectInstructorMap = [];

    $scheduleColorPalette = [
        'bg-blue-200/50 dark:bg-blue-800/50 border-blue-400',
        'bg-green-200/50 dark:bg-green-800/50 border-green-400',
        'bg-yellow-200/50 dark:bg-yellow-800/50 border-yellow-400',
        'bg-orange-200/50 dark:bg-orange-800/50 border-orange-400',
        'bg-purple-200/50 dark:bg-purple-800/50 border-purple-400',
        'bg-pink-200/50 dark:bg-pink-800/50 border-pink-400',
        'bg-red-200/50 dark:bg-red-900/50 border-red-500',
        'bg-indigo-200/50 dark:bg-indigo-800/50 border-indigo-400',
    ];

    if ($blockId !== null && $blockId > 0) {
        $scheduleSql = "SELECT sch.id, subj.code, subj.description, sch.day_of_week,
                                DATE_FORMAT(sch.start_time, '%H:%i') AS start_time,
                                DATE_FORMAT(sch.end_time, '%H:%i') AS end_time,
                                IFNULL(ip.name, 'TBA') AS instructor_name,
                                IFNULL(sch.room, 'TBA') AS room
                         FROM schedules sch
                         INNER JOIN subjects subj ON subj.id = sch.subject_id
                         LEFT JOIN instructor_profiles ip ON ip.user_id = sch.instructor_id
                         WHERE sch.block_id = ?
                         ORDER BY sch.day_of_week, sch.start_time";
        $scheduleStmt = $conn->prepare($scheduleSql);
        if ($scheduleStmt) {
            $scheduleStmt->bind_param('i', $blockId);
            $scheduleStmt->execute();
            $scheduleResult = $scheduleStmt->get_result();
            $colorCount = count($scheduleColorPalette);
            $colorIndex = 0;

            while ($scheduleResult && ($row = $scheduleResult->fetch_assoc())) {
                $color = $colorCount > 0
                    ? $scheduleColorPalette[$colorIndex % $colorCount]
                    : 'bg-blue-200/50 dark:bg-blue-800/50 border-blue-400';
                $colorIndex++;

                $subjectCode = format_output_string($row['code'] ?? '');
                $instructorName = format_output_string($row['instructor_name'] ?? 'TBA');
                $dayOfWeek = format_output_string($row['day_of_week'] ?? '');
                $startTime = format_output_string($row['start_time'] ?? '');
                $endTime = format_output_string($row['end_time'] ?? '');

                $schedule[] = [
                    'id' => isset($row['id']) ? (int) $row['id'] : 0,
                    'code' => $subjectCode,
                    'description' => format_output_string($row['description'] ?? ''),
                    'day' => $dayOfWeek,
                    'startTime' => $startTime,
                    'endTime' => $endTime,
                    'instructor' => $instructorName,
                    'room' => format_output_string($row['room'] ?? 'TBA'),
                    'color' => $color,
                ];

                if ($subjectCode !== '') {
                    $subjectInstructorMap[$subjectCode] = $instructorName;
                    $scheduleLabel = ($dayOfWeek !== '' ? strtoupper(substr($dayOfWeek, 0, 1)) : 'N')
                        . ' '
                        . $startTime
                        . '-' . $endTime;
                    if (!isset($subjectScheduleMap[$subjectCode])) {
                        $subjectScheduleMap[$subjectCode] = [];
                    }
                    if (!in_array($scheduleLabel, $subjectScheduleMap[$subjectCode], true)) {
                        $subjectScheduleMap[$subjectCode][] = $scheduleLabel;
                    }
                }
            }
            $scheduleStmt->close();
        }
    }

    $registeredSubjects = [];
    foreach ($subjects as $subject) {
        $code = $subject['code'];
        $registeredSubjects[] = [
            'code' => $code,
            'description' => $subject['description'],
            'units' => $subject['units'],
            'schedule' => isset($subjectScheduleMap[$code]) && count($subjectScheduleMap[$code]) > 0
                ? implode(', ', $subjectScheduleMap[$code])
                : 'TBA',
            'instructor' => $subjectInstructorMap[$code] ?? 'TBA',
        ];
    }

    $grades = [];
    $gradesSql = "SELECT sg.id, sg.academic_year, sg.semester, sg.grade, sg.remark, sg.graded_at,
                          subj.code, subj.description, subj.units,
                          term.term AS term_key, term.grade AS term_grade, term.weight AS term_weight, term.encoded_at AS term_encoded_at
                   FROM student_grades sg
                   INNER JOIN subjects subj ON subj.id = sg.subject_id
                   LEFT JOIN student_grade_terms term ON term.student_grade_id = sg.id
                   WHERE sg.student_user_id = ?
                   ORDER BY sg.academic_year DESC, sg.semester ASC, subj.code ASC";
    $gradesStmt = $conn->prepare($gradesSql);
    if ($gradesStmt) {
        $gradesStmt->bind_param('i', $studentUserId);
        $gradesStmt->execute();
        $gradesResult = $gradesStmt->get_result();
        $gradesById = [];
        while ($gradesResult && ($row = $gradesResult->fetch_assoc())) {
            $gradeId = isset($row['id']) ? (int) $row['id'] : 0;
            if (!isset($gradesById[$gradeId])) {
                $remarkValue = format_output_string($row['remark'] ?? '');
                $gradesById[$gradeId] = [
                    'id' => $gradeId,
                    'academicYear' => format_output_string($row['academic_year'] ?? ''),
                    'semester' => format_output_string($row['semester'] ?? ''),
                    'subjectCode' => format_output_string($row['code'] ?? ''),
                    'subjectDescription' => format_output_string($row['description'] ?? ''),
                    'units' => isset($row['units']) ? (int) $row['units'] : 0,
                    'grade' => isset($row['grade']) ? (float) $row['grade'] : null,
                    'remark' => $remarkValue !== '' ? $remarkValue : null,
                    'gradedAt' => isset($row['graded_at']) ? format_output_string($row['graded_at']) : null,
                    'terms' => [],
                ];
            }

            $termKey = $row['term_key'] ?? null;
            if ($termKey !== null && $termKey !== '') {
                $gradesById[$gradeId]['terms'][$termKey] = [
                    'term' => format_output_string($termKey),
                    'grade' => isset($row['term_grade']) ? (float) $row['term_grade'] : null,
                    'weight' => isset($row['term_weight']) ? (float) $row['term_weight'] : null,
                    'encodedAt' => isset($row['term_encoded_at']) ? format_output_string($row['term_encoded_at']) : null,
                ];
            }
        }
        $grades = array_values($gradesById);
        $gradesStmt->close();
    }

    return [
        'personal' => [
            'firstName' => $firstName,
            'lastName' => $lastName,
            'middleName' => $middleName,
            'birthdate' => $birthdate,
            'sex' => $sex,
            'civilStatus' => $civilStatus,
            'nationality' => $nationality,
            'religion' => $religion,
            'dialect' => $dialect,
        ],
        'contact' => [
            'email' => format_output_string($studentRow['email'] ?? ''),
            'phoneNumber' => $phoneNumber,
        ],
        'address' => [
            'currentAddress' => $currentAddress,
            'permanentAddress' => $permanentAddress,
        ],
        'family' => [
            'fathersName' => $fathersName,
            'fathersOccupation' => $fathersOccupation,
            'mothersName' => $mothersName,
            'mothersOccupation' => $mothersOccupation,
            'guardiansName' => $guardiansName,
        ],
        'additional' => [
            'emergencyContactName' => $emergencyContactName,
            'emergencyContactAddress' => $emergencyContactAddress,
            'emergencyContactNumber' => $emergencyContactNumber,
        ],
        'education' => [
            'elementarySchool' => $elementarySchool,
            'elemYearGraduated' => $elemYearGraduated,
            'secondarySchool' => $secondarySchool,
            'secondaryYearGraduated' => $secondaryYearGraduated,
            'collegiateSchool' => $collegiateSchool,
        ],
        'academic' => [
            'studentId' => $studentIdNumber,
            'course' => $course,
            'yearLevel' => $yearLevelLabel,
            'block' => $blockName,
            'status' => $profileStatus,
            'enrollmentStatus' => $enrollmentStatus,
            'dateEnrolled' => '',
            'specialization' => $specialization,
        ],
        'enrollment' => [
            'isEnrolled' => $isEnrolled,
            'registeredSubjects' => $registeredSubjects,
        ],
        'schedule' => $schedule,
        'grades' => $grades,
    ];
}

$firstName = sanitize_input_string($profileData['firstName'] ?? '');
$lastName = sanitize_input_string($profileData['lastName'] ?? '');
$middleName = sanitize_input_string($profileData['middleName'] ?? '');
$birthdateRaw = sanitize_input_string($profileData['birthdate'] ?? '');
$sex = sanitize_input_string($profileData['sex'] ?? '');
$civilStatus = sanitize_input_string($profileData['civilStatus'] ?? '');
$nationality = sanitize_input_string($profileData['nationality'] ?? '');
$religion = sanitize_input_string($profileData['religion'] ?? '');
$dialect = sanitize_input_string($profileData['dialect'] ?? '');
$newEmail = sanitize_input_string($profileData['email'] ?? '');
$phoneNumber = sanitize_input_string($profileData['phoneNumber'] ?? '');
$currentAddress = sanitize_input_string($profileData['currentAddress'] ?? '');
$permanentAddress = sanitize_input_string($profileData['permanentAddress'] ?? '');
$fathersName = sanitize_input_string($profileData['fathersName'] ?? '');
$fathersOccupation = sanitize_input_string($profileData['fathersOccupation'] ?? '');
$mothersName = sanitize_input_string($profileData['mothersName'] ?? '');
$mothersOccupation = sanitize_input_string($profileData['mothersOccupation'] ?? '');
$guardiansName = sanitize_input_string($profileData['guardiansName'] ?? '');
$emergencyContactName = sanitize_input_string($profileData['emergencyContactName'] ?? '');
$emergencyContactAddress = sanitize_input_string($profileData['emergencyContactAddress'] ?? '');
$emergencyContactNumber = sanitize_input_string($profileData['emergencyContactNumber'] ?? '');
$elementarySchool = sanitize_input_string($profileData['elementarySchool'] ?? '');
$elemYearGraduated = sanitize_input_string($profileData['elemYearGraduated'] ?? '');
$secondarySchool = sanitize_input_string($profileData['secondarySchool'] ?? '');
$secondaryYearGraduated = sanitize_input_string($profileData['secondaryYearGraduated'] ?? '');
$collegiateSchool = sanitize_input_string($profileData['collegiateSchool'] ?? '');

if ($firstName === '' || $lastName === '') {
    http_response_code(422);
    echo json_encode([
        'status' => 'error',
        'message' => 'First name and last name are required.',
    ]);
    if ($conn instanceof mysqli) {
        $conn->close();
    }
    exit;
}

if ($newEmail === '' || !filter_var($newEmail, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode([
        'status' => 'error',
        'message' => 'A valid email address is required.',
    ]);
    if ($conn instanceof mysqli) {
        $conn->close();
    }
    exit;
}

$allowedSex = ['Male', 'Female'];
if ($sex !== '' && !in_array($sex, $allowedSex, true)) {
    $sex = '';
}

$allowedCivilStatus = ['Single', 'Married', 'Widowed', 'Separated'];
if ($civilStatus !== '' && !in_array($civilStatus, $allowedCivilStatus, true)) {
    $civilStatus = '';
}

$birthdateForDb = '';
if ($birthdateRaw !== '') {
    $birthdateObject = DateTime::createFromFormat('Y-m-d', $birthdateRaw);
    if ($birthdateObject === false) {
        $birthdateObject = DateTime::createFromFormat('m/d/Y', $birthdateRaw);
    }
    if ($birthdateObject === false) {
        http_response_code(422);
        echo json_encode([
            'status' => 'error',
            'message' => 'Invalid birthdate format. Use YYYY-MM-DD.',
        ]);
        if ($conn instanceof mysqli) {
            $conn->close();
        }
        exit;
    }
    $birthdateForDb = $birthdateObject->format('Y-m-d');
}

$transactionStarted = false;

try {
    $conn->set_charset('utf8mb4');

    $lookupSql = 'SELECT sp.user_id, u.email
                   FROM student_profiles sp
                   INNER JOIN users u ON u.id = sp.user_id
                   WHERE u.email = ?
                   LIMIT 1';
    $lookupStmt = $conn->prepare($lookupSql);
    if (!$lookupStmt) {
        throw new Exception('Failed to prepare student lookup query: ' . $conn->error, 500);
    }

    $lookupStmt->bind_param('s', $email);
    $lookupStmt->execute();
    $lookupResult = $lookupStmt->get_result();

    if (!$lookupResult instanceof mysqli_result || $lookupResult->num_rows === 0) {
        $lookupStmt->close();
        throw new Exception('Student profile not found.', 404);
    }

    $studentRow = $lookupResult->fetch_assoc();
    $lookupStmt->close();

    $studentUserId = (int) $studentRow['user_id'];
    $currentEmail = trim((string) ($studentRow['email'] ?? ''));

    $conn->begin_transaction();
    $transactionStarted = true;

    if ($newEmail !== '' && strcasecmp($newEmail, $currentEmail) !== 0) {
        $emailCheckSql = 'SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1';
        $emailCheckStmt = $conn->prepare($emailCheckSql);
        if (!$emailCheckStmt) {
            throw new Exception('Failed to prepare email uniqueness check: ' . $conn->error, 500);
        }
        $emailCheckStmt->bind_param('si', $newEmail, $studentUserId);
        $emailCheckStmt->execute();
        $emailCheckStmt->store_result();
        if ($emailCheckStmt->num_rows > 0) {
            $emailCheckStmt->close();
            throw new Exception('Another account already uses this email address.', 409);
        }
        $emailCheckStmt->close();

        $updateEmailSql = 'UPDATE users SET email = ? WHERE id = ? LIMIT 1';
        $updateEmailStmt = $conn->prepare($updateEmailSql);
        if (!$updateEmailStmt) {
            throw new Exception('Failed to prepare email update statement: ' . $conn->error, 500);
        }
        $updateEmailStmt->bind_param('si', $newEmail, $studentUserId);
        if (!$updateEmailStmt->execute()) {
            $updateEmailStmt->close();
            throw new Exception('Failed to update user email: ' . $updateEmailStmt->error, 500);
        }
        $updateEmailStmt->close();
    }

    $fullNameParts = array_filter([$firstName, $middleName, $lastName], static function ($part) {
        return $part !== '';
    });
    $fullName = count($fullNameParts) > 0 ? implode(' ', $fullNameParts) : $firstName;

    $updateProfileSql = <<<SQL
        UPDATE student_profiles SET
            name = ?,
            middle_name = NULLIF(?, ''),
            birthdate = NULLIF(?, ''),
            sex = NULLIF(?, ''),
            civil_status = NULLIF(?, ''),
            nationality = NULLIF(?, ''),
            religion = NULLIF(?, ''),
            dialect = NULLIF(?, ''),
            phone_number = NULLIF(?, ''),
            current_address = NULLIF(?, ''),
            permanent_address = NULLIF(?, ''),
            fathers_name = NULLIF(?, ''),
            fathers_occupation = NULLIF(?, ''),
            mothers_name = NULLIF(?, ''),
            mothers_occupation = NULLIF(?, ''),
            guardians_name = NULLIF(?, ''),
            emergency_contact_name = NULLIF(?, ''),
            emergency_contact_address = NULLIF(?, ''),
            emergency_contact_number = NULLIF(?, ''),
            elementary_school = NULLIF(?, ''),
            elem_year_graduated = NULLIF(?, ''),
            secondary_school = NULLIF(?, ''),
            secondary_year_graduated = NULLIF(?, ''),
            collegiate_school = NULLIF(?, '')
        WHERE user_id = ?
        LIMIT 1
    SQL;

    $updateProfileStmt = $conn->prepare($updateProfileSql);
    if (!$updateProfileStmt) {
        throw new Exception('Failed to prepare student profile update statement: ' . $conn->error, 500);
    }

    $parameterTypes = str_repeat('s', 24) . 'i';
    $updateProfileStmt->bind_param(
        $parameterTypes,
        $fullName,
        $middleName,
        $birthdateForDb,
        $sex,
        $civilStatus,
        $nationality,
        $religion,
        $dialect,
        $phoneNumber,
        $currentAddress,
        $permanentAddress,
        $fathersName,
        $fathersOccupation,
        $mothersName,
        $mothersOccupation,
        $guardiansName,
        $emergencyContactName,
        $emergencyContactAddress,
        $emergencyContactNumber,
        $elementarySchool,
        $elemYearGraduated,
        $secondarySchool,
        $secondaryYearGraduated,
        $collegiateSchool,
        $studentUserId
    );

    if (!$updateProfileStmt->execute()) {
        $error = $updateProfileStmt->error;
        $updateProfileStmt->close();
        throw new Exception('Failed to update student profile: ' . $error, 500);
    }

    $updateProfileStmt->close();

    $conn->commit();
    $transactionStarted = false;

    $updatedProfile = fetch_student_profile_data($conn, $studentUserId);

    echo json_encode([
        'status' => 'success',
        'message' => 'Student profile updated successfully.',
        'data' => $updatedProfile,
    ]);
} catch (Throwable $e) {
    if (isset($conn) && $conn instanceof mysqli) {
        if ($transactionStarted) {
            $conn->rollback();
        }
    }

    $code = $e->getCode();
    if ($code < 400 || $code >= 600) {
        $code = 500;
    }

    http_response_code($code);
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
