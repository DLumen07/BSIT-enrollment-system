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

function normalize_profile_status(?string $value): string {
    $normalized = safe_string($value);
    if ($normalized === '') {
        return '';
    }

    $formatted = ucwords(strtolower($normalized));
    return $formatted !== '' ? $formatted : $normalized;
}

function normalize_enrollment_track(?string $value): string {
    $normalized = safe_string($value);
    if ($normalized === '') {
        return 'Regular';
    }

    return strtolower($normalized) === 'irregular' ? 'Irregular' : 'Regular';
}

function compose_profile_status_display(string $profileStatus, string $enrollmentTrack): string {
    $status = $profileStatus !== '' ? $profileStatus : 'Old';
    if ($status === 'Old' && $enrollmentTrack === 'Irregular') {
        return 'Old (Irregular)';
    }

    return $status;
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

    $ensureAnnouncementsSql = <<<SQL
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

    if (!$conn->query($ensureAnnouncementsSql)) {
        throw new Exception('Failed to ensure announcements table exists: ' . $conn->error);
    }

    $ensureStudentDocumentsSql = <<<SQL
CREATE TABLE IF NOT EXISTS student_documents (
    id INT(11) NOT NULL AUTO_INCREMENT,
    student_user_id INT(11) NOT NULL,
    name VARCHAR(255) NOT NULL,
    status ENUM('Submitted','Pending','Rejected') NOT NULL DEFAULT 'Submitted',
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT DEFAULT NULL,
    file_mime VARCHAR(100) DEFAULT NULL,
    uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_student_documents_student (student_user_id),
    CONSTRAINT fk_student_documents_student FOREIGN KEY (student_user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
SQL;

    if (!$conn->query($ensureStudentDocumentsSql)) {
        throw new Exception('Failed to ensure student_documents table exists: ' . $conn->error);
    }

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
    $avatarUrl = safe_string($studentRow['avatar_url'] ?? '');
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
    $guardiansOccupation = safe_string($studentRow['guardians_occupation'] ?? '');
    $guardiansAddress = safe_string($studentRow['guardians_address'] ?? '');
    $livingWithFamily = safe_string($studentRow['living_with_family'] ?? '');
    $boarding = safe_string($studentRow['boarding'] ?? '');

    $emergencyContactName = safe_string($studentRow['emergency_contact_name'] ?? '');
    $emergencyContactAddress = safe_string($studentRow['emergency_contact_address'] ?? '');
    $emergencyContactNumber = safe_string($studentRow['emergency_contact_number'] ?? '');

    $elementarySchool = safe_string($studentRow['elementary_school'] ?? '');
    $elemYearGraduated = safe_string($studentRow['elem_year_graduated'] ?? '');
    $secondarySchool = safe_string($studentRow['secondary_school'] ?? '');
    $secondaryYearGraduated = safe_string($studentRow['secondary_year_graduated'] ?? '');
    $collegiateSchool = safe_string($studentRow['collegiate_school'] ?? '');
    $collegiateYearGraduated = safe_string($studentRow['collegiate_year_graduated'] ?? '');

    $studentIdNumber = safe_string($studentRow['student_id_number']);
    $course = safe_string($studentRow['course']);
    $yearLevelNumeric = isset($studentRow['year_level']) ? (int) $studentRow['year_level'] : 0;
    $yearLevelLabel = $yearLevelNumeric > 0 ? map_year_level($yearLevelNumeric) : '';
    $blockName = safe_string($studentRow['block_name'] ?? '');
    $profileStatusRaw = safe_string($studentRow['status'] ?? '');
    $profileStatus = normalize_profile_status($profileStatusRaw);
    if ($profileStatus === '') {
        $profileStatus = 'Old';
    }
    $enrollmentTrack = normalize_enrollment_track($studentRow['enrollment_track'] ?? '');
    $profileStatusDisplay = compose_profile_status_display($profileStatus, $enrollmentTrack);
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
            $remarkValue = safe_string($row['remark'] ?? '');
            $normalizedRemark = strtoupper($remarkValue);
            $isIncompleteRemark = $normalizedRemark === 'INC' || $normalizedRemark === 'INCOMPLETE';
            if ($isIncompleteRemark) {
                $remarkValue = 'INC';
            }
            $finalGradeValue = isset($row['grade']) ? (float) $row['grade'] : null;
            if ($isIncompleteRemark) {
                $finalGradeValue = 'INC';
            }

            if (!isset($gradesById[$gradeId])) {
                $gradesById[$gradeId] = [
                    'id' => $gradeId,
                    'academicYear' => safe_string($row['academic_year'] ?? ''),
                    'semester' => safe_string($row['semester'] ?? ''),
                    'subjectCode' => safe_string($row['code'] ?? ''),
                    'subjectDescription' => safe_string($row['description'] ?? ''),
                    'units' => isset($row['units']) ? (int) $row['units'] : 0,
                    'grade' => $finalGradeValue,
                    'remark' => $remarkValue !== '' ? $remarkValue : null,
                    'gradedAt' => isset($row['graded_at']) ? safe_string($row['graded_at']) : null,
                    'terms' => [],
                ];
            }

            $termKey = $row['term_key'] ?? null;
            if ($termKey !== null && $termKey !== '') {
                $termGradeValue = isset($row['term_grade']) ? (float) $row['term_grade'] : null;
                if ($isIncompleteRemark && $termGradeValue === null) {
                    $termGradeValue = 'INC';
                }
                $gradesById[$gradeId]['terms'][$termKey] = [
                    'term' => safe_string($termKey),
                    'grade' => $termGradeValue,
                    'weight' => isset($row['term_weight']) ? (float) $row['term_weight'] : null,
                    'encodedAt' => isset($row['term_encoded_at']) ? safe_string($row['term_encoded_at']) : null,
                ];
            }
        }
        $grades = array_values($gradesById);
        $gradesStmt->close();
    }

    $announcements = [];
    $announcementsSql = "SELECT a.id, a.title, a.message, a.audience, a.created_at, a.created_by,
                                IFNULL(ap.name, 'System') AS created_by_name,
                                u.email AS created_by_email
                         FROM announcements a
                         LEFT JOIN admin_profiles ap ON ap.user_id = a.created_by
                         LEFT JOIN users u ON u.id = a.created_by
                         WHERE a.audience IN ('All', 'Students')
                         ORDER BY a.created_at DESC
                         LIMIT 50";
    if ($result = $conn->query($announcementsSql)) {
        while ($row = $result->fetch_assoc()) {
            $createdByName = safe_string($row['created_by_name'] ?? '');
            $createdByEmail = safe_string($row['created_by_email'] ?? '');
            $announcements[] = [
                'id' => isset($row['id']) ? (int) $row['id'] : 0,
                'title' => safe_string($row['title'] ?? ''),
                'message' => safe_string($row['message'] ?? ''),
                'audience' => safe_string($row['audience'] ?? ''),
                'createdAt' => safe_string($row['created_at'] ?? ''),
                'createdBy' => [
                    'id' => isset($row['created_by']) ? (int) $row['created_by'] : null,
                    'name' => $createdByName !== '' ? $createdByName : 'System',
                    'email' => $createdByEmail !== '' ? $createdByEmail : null,
                ],
            ];
        }
        $result->free();
    }

    $enrollmentHistory = [];
    $historySql = 'SELECT academic_year, semester, status, notes, created_at
                   FROM student_enrollment_history
                   WHERE student_user_id = ?
                   ORDER BY created_at DESC';
    $historyStmt = $conn->prepare($historySql);
    if ($historyStmt) {
        $historyStmt->bind_param('i', $studentUserId);
        $historyStmt->execute();
        $historyResult = $historyStmt->get_result();
        while ($historyResult && ($row = $historyResult->fetch_assoc())) {
            $notesValue = safe_string($row['notes'] ?? '');
            $enrollmentHistory[] = [
                'academicYear' => safe_string($row['academic_year'] ?? ''),
                'semester' => safe_string($row['semester'] ?? ''),
                'status' => safe_string($row['status'] ?? ''),
                'recordedAt' => safe_string($row['created_at'] ?? ''),
                'gpa' => null,
                'notes' => $notesValue !== '' ? $notesValue : null,
            ];
        }
        $historyStmt->close();
    }

    $documents = [];
    $documentsSql = 'SELECT id, name, status, file_name, file_path, file_size, file_mime, uploaded_at, updated_at
                     FROM student_documents
                     WHERE student_user_id = ?
                     ORDER BY updated_at DESC';
    $documentsStmt = $conn->prepare($documentsSql);
    if ($documentsStmt) {
        $documentsStmt->bind_param('i', $studentUserId);
        $documentsStmt->execute();
        $documentsResult = $documentsStmt->get_result();
        while ($documentsResult && ($row = $documentsResult->fetch_assoc())) {
            $statusValue = safe_string($row['status'] ?? '');
            $mimeValue = safe_string($row['file_mime'] ?? '');
            $uploadedAtValue = safe_string($row['uploaded_at'] ?? '');
            $updatedAtValue = safe_string($row['updated_at'] ?? '');
            $documents[] = [
                'id' => isset($row['id']) ? (int) $row['id'] : 0,
                'name' => safe_string($row['name'] ?? ''),
                'status' => $statusValue !== '' ? $statusValue : 'Submitted',
                'fileName' => safe_string($row['file_name'] ?? ''),
                'filePath' => safe_string($row['file_path'] ?? ''),
                'fileType' => $mimeValue !== '' ? $mimeValue : null,
                'fileSize' => isset($row['file_size']) ? (int) $row['file_size'] : null,
                'uploadedAt' => $uploadedAtValue !== '' ? $uploadedAtValue : null,
                'updatedAt' => $updatedAtValue !== '' ? $updatedAtValue : null,
            ];
        }
        $documentsStmt->close();
    }

    $currentTerm = [
        'academicYear' => null,
        'semester' => null,
        'enrollmentStartDate' => null,
        'enrollmentEndDate' => null,
    ];

    $settingsSql = 'SELECT academic_year, semester, enrollment_start_date, enrollment_end_date FROM system_settings WHERE id = 1 LIMIT 1';
    if ($settingsResult = $conn->query($settingsSql)) {
        if ($settingsRow = $settingsResult->fetch_assoc()) {
            $academicYearSetting = safe_string($settingsRow['academic_year'] ?? '');
            $semesterSetting = safe_string($settingsRow['semester'] ?? '');
            $startSetting = safe_string($settingsRow['enrollment_start_date'] ?? '');
            $endSetting = safe_string($settingsRow['enrollment_end_date'] ?? '');

            $currentTerm = [
                'academicYear' => $academicYearSetting !== '' ? $academicYearSetting : null,
                'semester' => $semesterSetting !== '' ? $semesterSetting : null,
                'enrollmentStartDate' => $startSetting !== '' ? $startSetting : null,
                'enrollmentEndDate' => $endSetting !== '' ? $endSetting : null,
            ];
        }
        $settingsResult->free();
    }

    $classmates = [];
    if ($blockId !== null && $blockId > 0) {
        $classmatesSql = 'SELECT sp.student_id_number, sp.name, COALESCE(u.email, "") AS email, sp.avatar_url'
            . ' FROM student_profiles sp'
            . ' INNER JOIN users u ON u.id = sp.user_id'
            . ' WHERE sp.block_id = ? AND sp.user_id <> ?'
            . ' ORDER BY sp.name ASC';
        $classmatesStmt = $conn->prepare($classmatesSql);
        if ($classmatesStmt) {
            $classmatesStmt->bind_param('ii', $blockId, $studentUserId);
            $classmatesStmt->execute();
            $classmatesResult = $classmatesStmt->get_result();
            while ($classmatesResult && ($row = $classmatesResult->fetch_assoc())) {
                $studentIdValue = safe_string($row['student_id_number'] ?? '');
                $nameValue = safe_string($row['name'] ?? '');
                $emailValue = safe_string($row['email'] ?? '');
                if ($studentIdValue === '' && $nameValue === '') {
                    continue;
                }
                $avatarValue = safe_string($row['avatar_url'] ?? '');
                $classmates[] = [
                    'studentId' => $studentIdValue,
                    'name' => $nameValue,
                    'email' => $emailValue !== '' ? $emailValue : null,
                    'avatarUrl' => $avatarValue !== '' ? $avatarValue : null,
                ];
            }
            $classmatesStmt->close();
        }
    }

    $responseData = [
        'personal' => [
            'firstName' => $firstName,
            'lastName' => $lastName,
            'middleName' => $middleName,
            'avatarUrl' => $avatarUrl !== '' ? $avatarUrl : null,
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
            'guardiansOccupation' => $guardiansOccupation,
            'guardiansAddress' => $guardiansAddress,
        ],
        'additional' => [
            'emergencyContactName' => $emergencyContactName,
            'emergencyContactAddress' => $emergencyContactAddress,
            'emergencyContactNumber' => $emergencyContactNumber,
            'livingWithFamily' => $livingWithFamily,
            'boarding' => $boarding,
        ],
        'education' => [
            'elementarySchool' => $elementarySchool,
            'elemYearGraduated' => $elemYearGraduated,
            'secondarySchool' => $secondarySchool,
            'secondaryYearGraduated' => $secondaryYearGraduated,
            'collegiateSchool' => $collegiateSchool,
            'collegiateYearGraduated' => $collegiateYearGraduated,
        ],
        'academic' => [
            'studentId' => $studentIdNumber,
            'course' => $course,
            'yearLevel' => $yearLevelLabel,
            'block' => $blockName,
            'status' => $profileStatus,
            'statusDisplay' => $profileStatusDisplay,
            'enrollmentTrack' => $enrollmentTrack,
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
        'announcements' => $announcements,
        'records' => [
            'enrollmentHistory' => $enrollmentHistory,
            'documents' => $documents,
        ],
        'classmates' => $classmates,
        'currentTerm' => $currentTerm,
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
