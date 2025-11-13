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

header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'status' => 'error',
        'message' => 'Only GET requests are allowed.',
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
    exit;
}

$emailParam = trim((string) ($_GET['email'] ?? ''));
$studentIdParam = trim((string) ($_GET['student_id'] ?? ''));

if ($emailParam === '' && $studentIdParam === '') {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Student email or student ID is required.',
    ]);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
    exit;
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

function safe_string(?string $value): string {
    return $value !== null ? trim($value) : '';
}

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

try {
    $conn->set_charset('utf8mb4');

    $studentSql = 'SELECT sp.*, u.email, u.id AS user_id, b.name AS block_name
                    FROM student_profiles sp
                    INNER JOIN users u ON u.id = sp.user_id
                    LEFT JOIN blocks b ON b.id = sp.block_id
                    WHERE ' . ($emailParam !== '' ? 'u.email = ?' : 'sp.student_id_number = ?') . '
                    LIMIT 1';

    $studentStmt = $conn->prepare($studentSql);
    if (!$studentStmt) {
        throw new Exception('Failed to prepare student lookup query: ' . $conn->error);
    }

    $lookupValue = $emailParam !== '' ? $emailParam : $studentIdParam;
    $studentStmt->bind_param('s', $lookupValue);
    $studentStmt->execute();
    $studentResult = $studentStmt->get_result();

    if (!$studentResult instanceof mysqli_result || $studentResult->num_rows === 0) {
        http_response_code(404);
        echo json_encode([
            'status' => 'error',
            'message' => 'Student not found.',
        ]);
        $studentStmt->close();
        if ($conn instanceof mysqli) {
            $conn->close();
        }
        exit;
    }

    $studentRow = $studentResult->fetch_assoc();
    $studentStmt->close();

    $studentUserId = (int) $studentRow['user_id'];
    $blockId = isset($studentRow['block_id']) ? (int) $studentRow['block_id'] : null;

    $fullName = safe_string($studentRow['name']);
    $nameParts = preg_split('/\s+/', $fullName, -1, PREG_SPLIT_NO_EMPTY);
    $firstName = '';
    $lastName = '';

    if (is_array($nameParts) && count($nameParts) > 0) {
        $firstName = array_shift($nameParts) ?? '';
        $lastName = count($nameParts) > 0 ? implode(' ', $nameParts) : '';
    }

    $middleName = safe_string($studentRow['middle_name'] ?? '');
    $birthdate = safe_string($studentRow['birthdate'] ?? '');
    $sex = safe_string($studentRow['sex'] ?? '');
    $civilStatus = safe_string($studentRow['civil_status'] ?? '');
    $nationality = safe_string($studentRow['nationality'] ?? '');
    $religion = safe_string($studentRow['religion'] ?? '');
    $dialect = safe_string($studentRow['dialect'] ?? '');

    $currentAddress = safe_string($studentRow['current_address'] ?? '');
    $permanentAddress = safe_string($studentRow['permanent_address'] ?? '');

    $fathersName = safe_string($studentRow['fathers_name'] ?? '');
    $fathersOccupation = safe_string($studentRow['fathers_occupation'] ?? '');
    $mothersName = safe_string($studentRow['mothers_name'] ?? '');
    $mothersOccupation = safe_string($studentRow['mothers_occupation'] ?? '');
    $guardiansName = safe_string($studentRow['guardians_name'] ?? '');

    $emergencyContactName = safe_string($studentRow['emergency_contact_name'] ?? '');
    $emergencyContactAddress = safe_string($studentRow['emergency_contact_address'] ?? '');
    $emergencyContactNumber = safe_string($studentRow['emergency_contact_number'] ?? '');

    $elementarySchool = safe_string($studentRow['elementary_school'] ?? '');
    $elemYearGraduated = safe_string($studentRow['elem_year_graduated'] ?? '');
    $secondarySchool = safe_string($studentRow['secondary_school'] ?? '');
    $secondaryYearGraduated = safe_string($studentRow['secondary_year_graduated'] ?? '');
    $collegiateSchool = safe_string($studentRow['collegiate_school'] ?? '');

    $studentIdNumber = safe_string($studentRow['student_id_number']);
    $course = safe_string($studentRow['course']);
    $yearLevelNumeric = isset($studentRow['year_level']) ? (int) $studentRow['year_level'] : 0;
    $yearLevelLabel = $yearLevelNumeric > 0 ? map_year_level($yearLevelNumeric) : '';
    $blockName = safe_string($studentRow['block_name'] ?? '');
    $profileStatus = safe_string($studentRow['status'] ?? '');
    $enrollmentStatus = safe_string($studentRow['enrollment_status'] ?? '');
    $specialization = safe_string($studentRow['specialization'] ?? '');
    $phoneNumber = safe_string($studentRow['phone_number'] ?? '');

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
                'code' => safe_string($row['code']),
                'description' => safe_string($row['description']),
                'units' => (int) $row['units'],
            ];
        }
        $subjectsStmt->close();
    }

    $schedule = [];
    $subjectScheduleMap = [];
    $subjectInstructorMap = [];

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
                $color = $colorCount > 0 ? $scheduleColorPalette[$colorIndex % $colorCount] : 'bg-blue-200/50 dark:bg-blue-800/50 border-blue-400';
                $colorIndex++;

                $schedule[] = [
                    'id' => (int) $row['id'],
                    'code' => safe_string($row['code']),
                    'description' => safe_string($row['description']),
                    'day' => safe_string($row['day_of_week']),
                    'startTime' => safe_string($row['start_time']),
                    'endTime' => safe_string($row['end_time']),
                    'instructor' => safe_string($row['instructor_name']),
                    'room' => safe_string($row['room']),
                    'color' => $color,
                ];

                $subjectCode = safe_string($row['code']);
                $subjectInstructorMap[$subjectCode] = safe_string($row['instructor_name']);
                $scheduleLabel = strtoupper(substr(safe_string($row['day_of_week']), 0, 1)) . ' ' . safe_string($row['start_time']) . '-' . safe_string($row['end_time']);
                if (!isset($subjectScheduleMap[$subjectCode])) {
                    $subjectScheduleMap[$subjectCode] = [];
                }
                if (!in_array($scheduleLabel, $subjectScheduleMap[$subjectCode], true)) {
                    $subjectScheduleMap[$subjectCode][] = $scheduleLabel;
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

    $responseData = [
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
            'email' => safe_string($studentRow['email'] ?? ''),
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
    ];

    echo json_encode([
        'status' => 'success',
        'data' => $responseData,
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
