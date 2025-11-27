<?php
require_once 'db_config.php';
require_once __DIR__ . '/subject_prerequisite_utils.php';

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

$studentEnrollmentStatusFilter = null;
if (isset($_GET['student_enrollment_status'])) {
    $statusParam = trim((string) $_GET['student_enrollment_status']);
    if ($statusParam !== '') {
        $studentEnrollmentStatusFilter = $statusParam;
    }
}

function normalize_year_key(int $yearLevel): string {
    switch ($yearLevel) {
        case 1:
            return '1st-year';
        case 2:
            return '2nd-year';
        case 3:
            return '3rd-year';
        case 4:
            return '4th-year';
        default:
            return $yearLevel . 'th-year';
    }
}

function default_credentials(): array {
    return [
        'birthCertificate' => false,
        'grades' => false,
        'goodMoral' => false,
        'registrationForm' => false,
    ];
}

function build_academic_year_options(?string $currentAcademicYear): array {
    $options = [];
    $startYear = null;

    if ($currentAcademicYear !== null && preg_match('/^(\d{4})-(\d{4})$/', $currentAcademicYear, $matches) === 1) {
        $startYear = (int) $matches[1];
    }

    if ($startYear === null) {
        $startYear = (int) date('Y');
    }

    for ($offset = -1; $offset <= 3; $offset++) {
        $yearStart = $startYear + $offset;
        if ($yearStart < 2000) {
            continue;
        }
        $options[] = sprintf('%d-%d', $yearStart, $yearStart + 1);
    }

    $options = array_values(array_unique($options));

    if ($currentAcademicYear !== null && $currentAcademicYear !== '' && !in_array($currentAcademicYear, $options, true)) {
        array_unshift($options, $currentAcademicYear);
    }

    return $options;
}

function get_semester_options(): array {
    return [
        [ 'value' => '1st-sem', 'label' => '1st Semester' ],
        [ 'value' => '2nd-sem', 'label' => '2nd Semester' ],
        [ 'value' => 'summer', 'label' => 'Summer' ],
    ];
}

function get_semester_sort_order(): array {
    return [
        '1st-sem' => 1,
        '2nd-sem' => 2,
        'summer' => 3,
    ];
}

function normalize_status_label(?string $value): string {
    $trimmed = trim((string) $value);
    if ($trimmed === '') {
        return '';
    }
    return ucwords(strtolower($trimmed));
}

function normalize_enrollment_track(?string $value): string {
    $trimmed = trim((string) $value);
    if ($trimmed === '') {
        return 'Regular';
    }

    $lower = strtolower($trimmed);
    if ($lower === 'irregular') {
        return 'Irregular';
    }

    return 'Regular';
}

function compose_profile_status_display(?string $profileStatus, ?string $enrollmentTrack): string {
    $normalizedStatus = normalize_status_label($profileStatus);
    if ($normalizedStatus === '') {
        $normalizedStatus = 'Old';
    }

    $normalizedTrack = normalize_enrollment_track($enrollmentTrack);
    if ($normalizedStatus === 'Old' && $normalizedTrack === 'Irregular') {
        return 'Old (Irregular)';
    }

    return $normalizedStatus;
}

function format_year_level_label(int $yearLevel): string {
    if ($yearLevel <= 0) {
        return 'Unassigned';
    }

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

function build_term_key(string $academicYear, string $semester): string {
    return $academicYear . '::' . $semester;
}

function finalize_report_entry(array $entry): array {
    $counts = $entry['yearLevelCounts'] ?? [];
    $distribution = [];
    if (!empty($counts)) {
        ksort($counts, SORT_NUMERIC);
        foreach ($counts as $level => $count) {
            $intLevel = (int) $level;
            $distribution[] = [
                'yearLevel' => $intLevel,
                'yearKey' => $intLevel > 0 ? normalize_year_key($intLevel) : 'unassigned',
                'label' => format_year_level_label($intLevel),
                'students' => (int) $count,
            ];
        }
    }

    $entry['yearLevelDistribution'] = $distribution;
    unset($entry['yearLevelCounts']);

    if (!empty($entry['masterList'])) {
        usort($entry['masterList'], static function (array $a, array $b): int {
            return strcasecmp((string) ($a['name'] ?? ''), (string) ($b['name'] ?? ''));
        });
    } else {
        $entry['masterList'] = [];
    }

    return $entry;
}

try {
    $conn->set_charset('utf8mb4');

    $systemSettings = [
        'academic_year' => null,
        'semester' => null,
        'enrollment_start_date' => null,
        'enrollment_end_date' => null,
        'phased_schedule_json' => null,
    ];

    $settingsQuery = 'SELECT academic_year, semester, enrollment_start_date, enrollment_end_date, phased_schedule_json FROM system_settings ORDER BY id ASC LIMIT 1';
    if ($settingsResult = $conn->query($settingsQuery)) {
        $row = $settingsResult->fetch_assoc();
        if ($row) {
            $systemSettings = array_merge($systemSettings, $row);
        }
        $settingsResult->free();
    }

    $academicYear = isset($systemSettings['academic_year']) && $systemSettings['academic_year'] !== ''
        ? $systemSettings['academic_year']
        : sprintf('%d-%d', (int) date('Y'), (int) date('Y') + 1);
    $semester = isset($systemSettings['semester']) && $systemSettings['semester'] !== ''
        ? $systemSettings['semester']
        : '1st-sem';
    $enrollmentStartDate = $systemSettings['enrollment_start_date'] ?? null;
    $enrollmentEndDate = $systemSettings['enrollment_end_date'] ?? null;

    $phasedSchedule = [];
    if (!empty($systemSettings['phased_schedule_json'])) {
        $decodedSchedule = json_decode((string) $systemSettings['phased_schedule_json'], true);
        if (is_array($decodedSchedule)) {
            $phasedSchedule = $decodedSchedule;
        }
    }

    $academicYearOptions = build_academic_year_options($academicYear);
    $semesterOptions = get_semester_options();

    $ensureInstructorSubjectsSql = <<<SQL
CREATE TABLE IF NOT EXISTS instructor_subjects (
    instructor_id INT(11) NOT NULL,
    subject_id INT(11) NOT NULL,
    PRIMARY KEY (instructor_id, subject_id),
    KEY idx_subject_id (subject_id),
    CONSTRAINT fk_instructor_subjects_instructor FOREIGN KEY (instructor_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_instructor_subjects_subject FOREIGN KEY (subject_id) REFERENCES subjects (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
SQL;

    if (!$conn->query($ensureInstructorSubjectsSql) && $conn->errno !== 1146) {
        throw new Exception('Failed to ensure instructor_subjects table exists: ' . $conn->error);
    }

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

    $ensureTeachingHistorySql = <<<SQL
CREATE TABLE IF NOT EXISTS teaching_assignment_history (
    id INT(11) NOT NULL AUTO_INCREMENT,
    schedule_id INT(11) DEFAULT NULL,
    block_id INT(11) DEFAULT NULL,
    block_name VARCHAR(255) NOT NULL,
    course ENUM('BSIT','ACT') DEFAULT NULL,
    specialization ENUM('AP','DD') DEFAULT NULL,
    year_level INT(11) DEFAULT NULL,
    subject_id INT(11) DEFAULT NULL,
    subject_code VARCHAR(50) NOT NULL,
    subject_description VARCHAR(255) DEFAULT NULL,
    units INT(11) DEFAULT NULL,
    day_of_week ENUM('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday') DEFAULT NULL,
    start_time TIME DEFAULT NULL,
    end_time TIME DEFAULT NULL,
    room VARCHAR(255) DEFAULT NULL,
    instructor_user_id INT(11) DEFAULT NULL,
    instructor_name VARCHAR(255) DEFAULT NULL,
    instructor_email VARCHAR(255) DEFAULT NULL,
    academic_year VARCHAR(20) NOT NULL,
    semester VARCHAR(20) NOT NULL,
    captured_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_teaching_assignment_term (academic_year, semester),
    KEY idx_teaching_assignment_instructor (instructor_user_id),
    KEY idx_teaching_assignment_block (block_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
SQL;

    if (!$conn->query($ensureTeachingHistorySql)) {
        throw new Exception('Failed to ensure teaching assignment history table exists: ' . $conn->error);
    }

    $semesterColumnCheck = $conn->query("SHOW COLUMNS FROM subjects LIKE 'semester'");
    $hasSemesterColumn = false;
    if ($semesterColumnCheck instanceof mysqli_result) {
        $hasSemesterColumn = $semesterColumnCheck->num_rows > 0;
        $semesterColumnCheck->free();
    }

    if (!$hasSemesterColumn) {
        $alterSemesterSql = "ALTER TABLE subjects ADD COLUMN semester ENUM('1st-sem','2nd-sem','summer') NOT NULL DEFAULT '1st-sem' AFTER units";
        if (!$conn->query($alterSemesterSql)) {
            throw new Exception('Failed to ensure semester column exists on subjects table: ' . $conn->error);
        }
    }

    $adminUsers = [];
    $adminQuery = "SELECT u.id, ap.name, u.email, ap.admin_role, ap.avatar_url
                    FROM admin_profiles ap
                    INNER JOIN users u ON ap.user_id = u.id";
    if ($result = $conn->query($adminQuery)) {
        while ($row = $result->fetch_assoc()) {
            $adminUsers[] = [
                'id' => (int) $row['id'],
                'name' => $row['name'],
                'email' => $row['email'],
                'role' => $row['admin_role'],
                'avatar' => $row['avatar_url'] ?? '',
            ];
        }
        $result->free();
    } else {
        throw new Exception('Failed to fetch admin users: ' . $conn->error);
    }

    $subjectsByYear = [];
    $availableSubjects = [];
    $subjectPrerequisitesMap = fetch_subject_prerequisite_map($conn);
    $subjectsQuery = "SELECT s.id, s.code, s.description, s.units, s.year_level, s.semester, prereq.code AS prerequisite_code
                       FROM subjects s
                       LEFT JOIN subjects prereq ON s.prerequisite_id = prereq.id
                       ORDER BY s.year_level, FIELD(s.semester, '1st-sem','2nd-sem','summer'), s.code";
    if ($result = $conn->query($subjectsQuery)) {
        while ($row = $result->fetch_assoc()) {
            $yearKey = normalize_year_key((int) $row['year_level']);
            if (!isset($subjectsByYear[$yearKey])) {
                $subjectsByYear[$yearKey] = [];
            }
            $semesterValue = isset($row['semester']) ? (string) $row['semester'] : '1st-sem';
            if (!in_array($semesterValue, ['1st-sem', '2nd-sem', 'summer'], true)) {
                $semesterValue = '1st-sem';
            }
            $subjectId = (int) $row['id'];
            $prerequisiteList = $subjectPrerequisitesMap[$subjectId] ?? [];
            $legacyPrerequisiteCode = isset($row['prerequisite_code']) && $row['prerequisite_code'] !== ''
                ? (string) $row['prerequisite_code']
                : null;
            if (empty($prerequisiteList) && $legacyPrerequisiteCode !== null) {
                $prerequisiteList = [$legacyPrerequisiteCode];
            }
            $subjectsByYear[$yearKey][] = [
                'id' => $subjectId,
                'code' => $row['code'],
                'description' => $row['description'],
                'units' => (int) $row['units'],
                'prerequisite' => $prerequisiteList[0] ?? null,
                'prerequisites' => $prerequisiteList,
                'semester' => $semesterValue,
            ];
            $availableSubjects[] = [
                'id' => $row['code'],
                'label' => $row['code'] . ' - ' . $row['description'],
                'semester' => $semesterValue,
                'yearLevel' => (int) $row['year_level'],
            ];
        }
        $result->free();
    } else {
        throw new Exception('Failed to fetch subjects: ' . $conn->error);
    }

    $blocks = [];
    $blocksQuery = "SELECT b.id, b.name, b.year_level, b.course, b.specialization, b.capacity,
                           SUM(CASE WHEN sp.enrollment_status = 'Enrolled' THEN 1 ELSE 0 END) AS enrolled
                    FROM blocks b
                    LEFT JOIN student_profiles sp ON sp.block_id = b.id
                    GROUP BY b.id";
    if ($result = $conn->query($blocksQuery)) {
        while ($row = $result->fetch_assoc()) {
            $blocks[] = [
                'id' => (int) $row['id'],
                'name' => $row['name'],
                'capacity' => (int) $row['capacity'],
                'enrolled' => (int) $row['enrolled'],
                'course' => $row['course'],
                'specialization' => $row['specialization'],
                'year' => normalize_year_key((int) $row['year_level']),
            ];
        }
        $result->free();
    } else {
        throw new Exception('Failed to fetch blocks: ' . $conn->error);
    }

    $studentSubjectsMap = [];
    $studentSubjectsQuery = "SELECT ss.student_user_id, s.id, s.code, s.description, s.units
                              FROM student_subjects ss
                              INNER JOIN subjects s ON ss.subject_id = s.id";
    if ($result = $conn->query($studentSubjectsQuery)) {
        while ($row = $result->fetch_assoc()) {
            $studentId = (int) $row['student_user_id'];
            if (!isset($studentSubjectsMap[$studentId])) {
                $studentSubjectsMap[$studentId] = [];
            }
            $studentSubjectsMap[$studentId][] = [
                'id' => (int) $row['id'],
                'code' => $row['code'],
                'description' => $row['description'],
                'units' => (int) $row['units'],
            ];
        }
        $result->free();
    } else {
        throw new Exception('Failed to fetch student subjects: ' . $conn->error);
    }

    $gradesMap = [];
    $gradesQuery = "SELECT
                        sg.id AS grade_id,
                        sg.student_user_id,
                        sg.grade AS final_grade,
                        sg.academic_year,
                        sg.semester,
                        sg.remark,
                        sg.graded_at,
                        subj.code AS subject_code,
                        subj.description AS subject_description,
                        subj.units AS subject_units,
                        term.term AS term_key,
                        term.grade AS term_grade,
                        term.weight AS term_weight,
                        term.encoded_at AS term_encoded_at
                    FROM student_grades sg
                    INNER JOIN subjects subj ON subj.id = sg.subject_id
                    LEFT JOIN student_grade_terms term ON term.student_grade_id = sg.id";
    if ($result = $conn->query($gradesQuery)) {
        while ($row = $result->fetch_assoc()) {
            $studentId = (int) $row['student_user_id'];
            $gradeId = isset($row['grade_id']) ? (int) $row['grade_id'] : 0;

            if (!isset($gradesMap[$studentId])) {
                $gradesMap[$studentId] = [];
            }
            $remarkValue = isset($row['remark']) ? trim((string) $row['remark']) : null;
            $normalizedRemark = $remarkValue !== null ? strtoupper($remarkValue) : null;
            $isIncompleteRemark = $normalizedRemark === 'INC' || $normalizedRemark === 'INCOMPLETE';
            if ($isIncompleteRemark) {
                $remarkValue = 'INC';
            }

            $finalGradeValue = isset($row['final_grade']) ? (float) $row['final_grade'] : null;
            if ($isIncompleteRemark) {
                $finalGradeValue = 'INC';
            }

            if (!isset($gradesMap[$studentId][$gradeId])) {
                $gradesMap[$studentId][$gradeId] = [
                    'id' => $gradeId,
                    'subjectCode' => $row['subject_code'],
                    'subjectDescription' => $row['subject_description'],
                    'units' => isset($row['subject_units']) ? (int) $row['subject_units'] : null,
                    'grade' => $finalGradeValue,
                    'academicYear' => $row['academic_year'],
                    'semester' => $row['semester'],
                    'remark' => $remarkValue,
                    'gradedAt' => $row['graded_at'] ?? null,
                    'terms' => [],
                ];
            }

            $termKey = $row['term_key'] ?? null;
            if ($termKey !== null && $termKey !== '') {
                $termGradeValue = isset($row['term_grade']) ? (float) $row['term_grade'] : null;
                if ($isIncompleteRemark && $termGradeValue === null) {
                    $termGradeValue = 'INC';
                }
                $gradesMap[$studentId][$gradeId]['terms'][$termKey] = [
                    'term' => $termKey,
                    'grade' => $termGradeValue,
                    'weight' => isset($row['term_weight']) ? (float) $row['term_weight'] : null,
                    'encodedAt' => $row['term_encoded_at'] ?? null,
                ];
            }
        }
        $result->free();

        foreach ($gradesMap as $studentId => $gradeEntries) {
            $gradesMap[$studentId] = array_values($gradeEntries);
        }
    } else {
        throw new Exception('Failed to fetch grades: ' . $conn->error);
    }

    $currentTermStatusMap = [];
    if ($academicYear !== '' && $semester !== '') {
        $currentTermStatusQuery = "SELECT seh.student_user_id, seh.status
                                     FROM student_enrollment_history seh
                                     INNER JOIN (
                                         SELECT student_user_id, MAX(id) AS latest_id
                                         FROM student_enrollment_history
                                         WHERE academic_year = ? AND semester = ?
                                         GROUP BY student_user_id
                                     ) latest ON latest.student_user_id = seh.student_user_id AND latest.latest_id = seh.id";

        $termStatusStmt = $conn->prepare($currentTermStatusQuery);
        if ($termStatusStmt) {
            $termStatusStmt->bind_param('ss', $academicYear, $semester);
            if ($termStatusStmt->execute()) {
                $termStatusResult = $termStatusStmt->get_result();
                if ($termStatusResult instanceof mysqli_result) {
                    while ($termRow = $termStatusResult->fetch_assoc()) {
                        $currentTermStatusMap[(int) $termRow['student_user_id']] = $termRow['status'];
                    }
                    $termStatusResult->free();
                }
            }
            $termStatusStmt->close();
        }
    }

    $students = [];
    $studentsQuery = "SELECT sp.*, u.email, b.name AS block_name
                       FROM student_profiles sp
                       INNER JOIN users u ON u.id = sp.user_id
                       LEFT JOIN blocks b ON b.id = sp.block_id";
    $studentsStmt = null;
    if ($studentEnrollmentStatusFilter !== null) {
        $studentsQuery .= " WHERE sp.enrollment_status = ?";
    }
    $studentsQuery .= " ORDER BY sp.name";

    if ($studentEnrollmentStatusFilter !== null) {
        $studentsStmt = $conn->prepare($studentsQuery);
        if (!$studentsStmt) {
            throw new Exception('Failed to prepare students query: ' . $conn->error);
        }
        $studentsStmt->bind_param('s', $studentEnrollmentStatusFilter);
        $studentsStmt->execute();
        $result = $studentsStmt->get_result();
    } else {
        $result = $conn->query($studentsQuery);
    }

    if ($result instanceof mysqli_result) {
        while ($row = $result->fetch_assoc()) {
            $studentUserId = (int) $row['user_id'];
            $rawEnrollmentStatus = isset($row['enrollment_status']) ? trim((string) $row['enrollment_status']) : '';
            $normalizedEnrollmentStatus = $rawEnrollmentStatus !== ''
                ? ucwords(strtolower($rawEnrollmentStatus))
                : $rawEnrollmentStatus;
            $profileStatus = normalize_status_label($row['status'] ?? '');
            if ($profileStatus === '') {
                $profileStatus = 'Old';
            }
            $enrollmentTrack = normalize_enrollment_track($row['enrollment_track'] ?? '');
            $profileStatusDisplay = compose_profile_status_display($profileStatus, $enrollmentTrack);
            $students[] = [
                'id' => $studentUserId,
                'studentId' => $row['student_id_number'],
                'name' => $row['name'],
                'avatar' => $row['avatar_url'] ?? '',
                'email' => $row['email'],
                'course' => $row['course'],
                'year' => (int) $row['year_level'],
                'status' => $normalizedEnrollmentStatus,
                'profileStatus' => $profileStatus,
                'profileStatusDisplay' => $profileStatusDisplay,
                'enrollmentTrack' => $enrollmentTrack,
                'block' => $row['block_name'],
                'enlistedSubjects' => $studentSubjectsMap[$studentUserId] ?? [],
                'sex' => $row['sex'],
                'phoneNumber' => $row['phone_number'],
                'promotionHoldReason' => $row['promotion_hold_reason'] ?? null,
                'specialization' => $row['specialization'],
                'currentTermStatus' => $currentTermStatusMap[$studentUserId] ?? null,
            ];
        }
        $result->free();
    } else {
        if ($studentsStmt instanceof mysqli_stmt) {
            $studentsStmt->close();
        }
        throw new Exception('Failed to fetch students: ' . $conn->error);
    }

    if ($studentsStmt instanceof mysqli_stmt) {
        $studentsStmt->close();
    }

    $gradesByStudentNumber = [];
    foreach ($students as $student) {
        $studentUserId = (int) $student['id'];
        $studentNumber = $student['studentId'];
        $gradesByStudentNumber[$studentNumber] = $gradesMap[$studentUserId] ?? [];
    }

    $instructors = [];
    $instructorLookup = [];
    $instructorQuery = "SELECT ip.user_id, ip.name, ip.avatar_url, ip.department, u.email
                          FROM instructor_profiles ip
                          INNER JOIN users u ON u.id = ip.user_id";
    $instructorSubjects = [];
    $instructorSubjectsQuery = "SELECT sch.instructor_id, subj.code
                                 FROM schedules sch
                                 INNER JOIN subjects subj ON subj.id = sch.subject_id
                                 WHERE sch.instructor_id IS NOT NULL";
    if ($result = $conn->query($instructorSubjectsQuery)) {
        while ($row = $result->fetch_assoc()) {
            $instId = (int) $row['instructor_id'];
            if (!isset($instructorSubjects[$instId])) {
                $instructorSubjects[$instId] = [];
            }
            if (!in_array($row['code'], $instructorSubjects[$instId], true)) {
                $instructorSubjects[$instId][] = $row['code'];
            }
        }
        $result->free();
    } else {
        throw new Exception('Failed to fetch instructor subjects: ' . $conn->error);
    }

    $manualInstructorSubjects = [];
    $manualSubjectsQuery = "SELECT ins.instructor_id, subj.code
                             FROM instructor_subjects ins
                             INNER JOIN subjects subj ON subj.id = ins.subject_id";
    $manualResult = $conn->query($manualSubjectsQuery);
    if ($manualResult instanceof mysqli_result) {
        while ($row = $manualResult->fetch_assoc()) {
            $instId = (int) $row['instructor_id'];
            if (!isset($manualInstructorSubjects[$instId])) {
                $manualInstructorSubjects[$instId] = [];
            }
            if (!in_array($row['code'], $manualInstructorSubjects[$instId], true)) {
                $manualInstructorSubjects[$instId][] = $row['code'];
            }
        }
        $manualResult->free();
    } elseif ($conn->errno !== 1146) { // 1146: table doesn't exist yet
        throw new Exception('Failed to fetch instructor subject assignments: ' . $conn->error);
    }

    foreach ($manualInstructorSubjects as $instId => $subjectsForInstructor) {
        if (!isset($instructorSubjects[$instId])) {
            $instructorSubjects[$instId] = [];
        }
        foreach ($subjectsForInstructor as $subjectCode) {
            if (!in_array($subjectCode, $instructorSubjects[$instId], true)) {
                $instructorSubjects[$instId][] = $subjectCode;
            }
        }
    }

    if ($result = $conn->query($instructorQuery)) {
        while ($row = $result->fetch_assoc()) {
            $instructorId = (int) $row['user_id'];
            $instructorRecord = [
                'id' => $instructorId,
                'name' => $row['name'],
                'email' => $row['email'],
                'subjects' => $instructorSubjects[$instructorId] ?? [],
                'avatar' => $row['avatar_url'] ?? '',
            ];
            $instructors[] = $instructorRecord;
            $instructorLookup[$instructorId] = $instructorRecord;
        }
        $result->free();
    } else {
        throw new Exception('Failed to fetch instructor profiles: ' . $conn->error);
    }

    $scheduleMap = [];
    $currentTeachingAssignments = [];
    $currentAssignmentCounters = [];
    $scheduleQuery = "SELECT sch.id, b.name AS block_name, subj.code, subj.description,
                              sch.day_of_week, DATE_FORMAT(sch.start_time, '%H:%i') AS start_time,
                              DATE_FORMAT(sch.end_time, '%H:%i') AS end_time,
                              sch.instructor_id,
                              IFNULL(instr.name, 'TBA') AS instructor_name,
                              sch.room
                       FROM schedules sch
                       INNER JOIN blocks b ON b.id = sch.block_id
                       INNER JOIN subjects subj ON subj.id = sch.subject_id
                       LEFT JOIN instructor_profiles instr ON instr.user_id = sch.instructor_id";
    if ($result = $conn->query($scheduleQuery)) {
        while ($row = $result->fetch_assoc()) {
            $blockName = $row['block_name'];
            if (!isset($scheduleMap[$blockName])) {
                $scheduleMap[$blockName] = [];
            }
            $scheduleEntry = [
                'id' => (int) $row['id'],
                'code' => $row['code'],
                'description' => $row['description'],
                'day' => $row['day_of_week'],
                'startTime' => $row['start_time'],
                'endTime' => $row['end_time'],
                'instructorId' => isset($row['instructor_id']) ? (int) $row['instructor_id'] : null,
                'instructor' => $row['instructor_name'],
                'room' => $row['room'] ?? null,
                'color' => 'bg-blue-200/50 dark:bg-blue-800/50 border-blue-400',
            ];
            $scheduleMap[$blockName][] = $scheduleEntry;

            $assignmentKey = sprintf('%s|%s|%s|%s', $academicYear, $semester, $blockName, $row['code']);
            $currentAssignmentCounters[$assignmentKey] = ($currentAssignmentCounters[$assignmentKey] ?? 0) + 1;
            $assignmentId = $assignmentKey . '|' . $currentAssignmentCounters[$assignmentKey];

            $instructorId = isset($row['instructor_id']) ? (int) $row['instructor_id'] : null;
            if ($instructorId !== null && $instructorId <= 0) {
                $instructorId = null;
            }

            $instructorDetails = ($instructorId !== null && isset($instructorLookup[$instructorId]))
                ? $instructorLookup[$instructorId]
                : null;

            $instructorName = trim((string) ($row['instructor_name'] ?? ''));
            if ($instructorName === '' && $instructorDetails !== null) {
                $instructorName = (string) $instructorDetails['name'];
            }
            if ($instructorName === '') {
                $instructorName = 'TBA';
            }

            $instructorEmail = $instructorDetails['email'] ?? null;
            if (is_string($instructorEmail) && trim($instructorEmail) === '') {
                $instructorEmail = null;
            }

            $currentTeachingAssignments[] = [
                'id' => $assignmentId,
                'academicYear' => $academicYear,
                'semester' => $semester,
                'block' => $blockName,
                'subjectCode' => $row['code'],
                'subjectDescription' => $row['description'] ?? $row['code'],
                'instructorId' => $instructorDetails['id'] ?? $instructorId,
                'instructorName' => $instructorName,
                'instructorEmail' => $instructorEmail,
            ];
        }
        $result->free();
    } else {
        throw new Exception('Failed to fetch schedules: ' . $conn->error);
    }

    $teachingAssignmentsHistory = [];
    $historyAssignmentCounters = [];
    $teachingAssignmentHistoryQuery = "SELECT id, academic_year, semester, block_name, subject_code, subject_description,
                                              instructor_user_id, instructor_name, instructor_email, captured_at
                                       FROM teaching_assignment_history
                                       ORDER BY academic_year DESC,
                                                FIELD(semester, '1st-sem','2nd-sem','summer'),
                                                block_name,
                                                subject_code,
                                                captured_at DESC,
                                                id DESC";
    $historyAssignmentsResult = $conn->query($teachingAssignmentHistoryQuery);
    if ($historyAssignmentsResult instanceof mysqli_result) {
        while ($row = $historyAssignmentsResult->fetch_assoc()) {
            $rowAcademicYear = trim((string) ($row['academic_year'] ?? ''));
            $rowSemester = trim((string) ($row['semester'] ?? ''));
            $blockName = trim((string) ($row['block_name'] ?? ''));
            $subjectCode = trim((string) ($row['subject_code'] ?? ''));

            if ($rowAcademicYear === '' || $rowSemester === '' || $subjectCode === '') {
                continue;
            }

            if ($blockName === '') {
                $blockName = 'Unassigned';
            }

            $counterKey = sprintf('%s|%s|%s|%s', $rowAcademicYear, $rowSemester, $blockName, $subjectCode);
            $historyAssignmentCounters[$counterKey] = ($historyAssignmentCounters[$counterKey] ?? 0) + 1;
            $assignmentId = sprintf('history|%s|%d', $counterKey, $historyAssignmentCounters[$counterKey]);

            $subjectDescription = trim((string) ($row['subject_description'] ?? ''));
            if ($subjectDescription === '') {
                $subjectDescription = $subjectCode;
            }

            $instructorId = isset($row['instructor_user_id']) ? (int) $row['instructor_user_id'] : null;
            if ($instructorId !== null && $instructorId <= 0) {
                $instructorId = null;
            }

            $instructorDetails = ($instructorId !== null && isset($instructorLookup[$instructorId]))
                ? $instructorLookup[$instructorId]
                : null;

            $instructorName = trim((string) ($row['instructor_name'] ?? ''));
            if ($instructorName === '' && $instructorDetails !== null) {
                $instructorName = (string) $instructorDetails['name'];
            }
            if ($instructorName === '') {
                $instructorName = 'TBA';
            }

            $instructorEmail = trim((string) ($row['instructor_email'] ?? ''));
            if ($instructorEmail === '' && $instructorDetails !== null) {
                $instructorEmail = (string) ($instructorDetails['email'] ?? '');
            }
            if ($instructorEmail === '') {
                $instructorEmail = null;
            }

            $teachingAssignmentsHistory[] = [
                'id' => $assignmentId,
                'academicYear' => $rowAcademicYear,
                'semester' => $rowSemester,
                'block' => $blockName,
                'subjectCode' => $subjectCode,
                'subjectDescription' => $subjectDescription,
                'instructorId' => $instructorDetails['id'] ?? $instructorId,
                'instructorName' => $instructorName,
                'instructorEmail' => $instructorEmail,
            ];
        }
        $historyAssignmentsResult->free();
    } elseif ($conn->errno !== 1146) {
        throw new Exception('Failed to fetch teaching assignment history: ' . $conn->error);
    }

    $assignmentMap = [];
    foreach ($teachingAssignmentsHistory as $assignment) {
        $assignmentMap[$assignment['id']] = $assignment;
    }
    foreach ($currentTeachingAssignments as $assignment) {
        $assignmentMap[$assignment['id']] = $assignment;
    }

    $teachingAssignments = array_values($assignmentMap);
    $assignmentSemesterOrder = get_semester_sort_order();
    if (!empty($teachingAssignments)) {
        usort($teachingAssignments, static function (array $a, array $b) use ($assignmentSemesterOrder): int {
            if ($a['academicYear'] === $b['academicYear']) {
                $orderA = $assignmentSemesterOrder[$a['semester']] ?? 99;
                $orderB = $assignmentSemesterOrder[$b['semester']] ?? 99;
                if ($orderA === $orderB) {
                    if ($a['block'] === $b['block']) {
                        return strcmp($a['subjectCode'], $b['subjectCode']);
                    }
                    return strcmp($a['block'], $b['block']);
                }
                return $orderA <=> $orderB;
            }
            return strcmp($b['academicYear'], $a['academicYear']);
        });
    }

    $announcements = [];
    $announcementsQuery = "SELECT a.id, a.title, a.message, a.audience, a.created_at, a.created_by,
                                   IFNULL(ap.name, 'System') AS created_by_name,
                                   u.email AS created_by_email
                            FROM announcements a
                            LEFT JOIN admin_profiles ap ON ap.user_id = a.created_by
                            LEFT JOIN users u ON u.id = a.created_by
                            ORDER BY a.created_at DESC
                            LIMIT 50";
    if ($result = $conn->query($announcementsQuery)) {
        while ($row = $result->fetch_assoc()) {
            $announcements[] = [
                'id' => isset($row['id']) ? (int) $row['id'] : 0,
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
        }
        $result->free();
    } else {
        throw new Exception('Failed to fetch announcements: ' . $conn->error);
    }

    $pendingApplications = [];
    $approvedApplications = [];
    $rejectedApplications = [];
    $studentIdsForDocuments = [];
    $applicationsQuery = "SELECT ea.id, ea.student_user_id, ea.status, ea.block_name, ea.`submitted_.at` AS submitted_at,
                                 ea.rejection_reason, ea.form_data, sp.student_id_number, sp.name AS student_name,
                                 sp.course, sp.year_level, sp.status AS student_status, sp.enrollment_track
                          FROM enrollment_applications ea
                          INNER JOIN student_profiles sp ON sp.user_id = ea.student_user_id";
    if ($result = $conn->query($applicationsQuery)) {
        while ($row = $result->fetch_assoc()) {
            $decodedForm = json_decode($row['form_data'], true);
            if (!is_array($decodedForm)) {
                $decodedForm = [];
            }

            $credentialDefaults = default_credentials();
            $credentials = $credentialDefaults;
            foreach ($credentialDefaults as $credentialKey => $defaultValue) {
                if (array_key_exists($credentialKey, $decodedForm)) {
                    $credentials[$credentialKey] = (bool) $decodedForm[$credentialKey];
                    unset($decodedForm[$credentialKey]);
                }
            }

            $formSnapshot = null;
            if (isset($decodedForm['_application']) && is_array($decodedForm['_application'])) {
                $formSnapshot = $decodedForm['_application'];
                unset($decodedForm['_application']);
            } elseif (!empty($decodedForm)) {
                $formSnapshot = $decodedForm;
            }

            $studentUserId = isset($row['student_user_id']) ? (int) $row['student_user_id'] : 0;
            if ($studentUserId > 0) {
                $studentIdsForDocuments[$studentUserId] = true;
            }

            $profileStatus = normalize_status_label($row['student_status'] ?? '');
            if ($profileStatus === '') {
                $profileStatus = 'Old';
            }
            $enrollmentTrack = normalize_enrollment_track($row['enrollment_track'] ?? '');
            $application = [
                'id' => (int) $row['id'],
                'studentId' => $row['student_id_number'],
                'studentUserId' => $studentUserId,
                'name' => $row['student_name'],
                'course' => $row['course'],
                'year' => (int) $row['year_level'],
                'status' => $profileStatus,
                'enrollmentTrack' => $enrollmentTrack,
                'statusDisplay' => compose_profile_status_display($profileStatus, $enrollmentTrack),
                'block' => $row['block_name'],
                'credentials' => $credentials,
                'rejectionReason' => $row['rejection_reason'] ?? null,
                'submittedAt' => $row['submitted_at'],
                'formSnapshot' => $formSnapshot,
                'documents' => [],
            ];
            switch ($row['status']) {
                case 'approved':
                    $approvedApplications[] = $application;
                    break;
                case 'rejected':
                    $rejectedApplications[] = $application;
                    break;
                default:
                    $pendingApplications[] = $application;
                    break;
            }
        }
        $result->free();
    } else {
        throw new Exception('Failed to fetch enrollment applications: ' . $conn->error);
    }

    $documentsByStudent = [];
    if (!empty($studentIdsForDocuments)) {
        $studentIdKeys = array_map('intval', array_keys($studentIdsForDocuments));
        $placeholders = implode(',', array_fill(0, count($studentIdKeys), '?'));
        $documentsQuery = "SELECT student_user_id, id, name, status, file_name, file_path, file_size, file_mime, uploaded_at, updated_at
                           FROM student_documents
                           WHERE student_user_id IN ($placeholders)
                           ORDER BY updated_at DESC";
        $stmt = $conn->prepare($documentsQuery);
        if ($stmt) {
            $types = str_repeat('i', count($studentIdKeys));
            $stmt->bind_param($types, ...$studentIdKeys);
            $stmt->execute();
            $documentsResult = $stmt->get_result();
            if ($documentsResult) {
                while ($docRow = $documentsResult->fetch_assoc()) {
                    $studentUserId = isset($docRow['student_user_id']) ? (int) $docRow['student_user_id'] : 0;
                    if ($studentUserId <= 0) {
                        continue;
                    }

                    $statusValue = isset($docRow['status']) ? trim((string) $docRow['status']) : '';
                    if ($statusValue === '') {
                        $statusValue = 'Submitted';
                    }

                    $documentsByStudent[$studentUserId][] = [
                        'id' => isset($docRow['id']) ? (int) $docRow['id'] : 0,
                        'name' => isset($docRow['name']) ? (string) $docRow['name'] : '',
                        'status' => $statusValue,
                        'fileName' => isset($docRow['file_name']) ? (string) $docRow['file_name'] : '',
                        'filePath' => isset($docRow['file_path']) ? (string) $docRow['file_path'] : '',
                        'fileType' => isset($docRow['file_mime']) && $docRow['file_mime'] !== null && $docRow['file_mime'] !== ''
                            ? (string) $docRow['file_mime']
                            : null,
                        'fileSize' => isset($docRow['file_size']) ? (int) $docRow['file_size'] : null,
                        'uploadedAt' => isset($docRow['uploaded_at']) && $docRow['uploaded_at'] !== null && $docRow['uploaded_at'] !== ''
                            ? (string) $docRow['uploaded_at']
                            : null,
                        'updatedAt' => isset($docRow['updated_at']) && $docRow['updated_at'] !== null && $docRow['updated_at'] !== ''
                            ? (string) $docRow['updated_at']
                            : null,
                    ];
                }
            }
            $stmt->close();
        }
    }

    if (!empty($documentsByStudent)) {
        foreach ($pendingApplications as &$application) {
            $studentUserId = isset($application['studentUserId']) ? (int) $application['studentUserId'] : 0;
            if ($studentUserId > 0 && isset($documentsByStudent[$studentUserId])) {
                $application['documents'] = $documentsByStudent[$studentUserId];
            }
        }
        unset($application);

        foreach ($approvedApplications as &$application) {
            $studentUserId = isset($application['studentUserId']) ? (int) $application['studentUserId'] : 0;
            if ($studentUserId > 0 && isset($documentsByStudent[$studentUserId])) {
                $application['documents'] = $documentsByStudent[$studentUserId];
            }
        }
        unset($application);

        foreach ($rejectedApplications as &$application) {
            $studentUserId = isset($application['studentUserId']) ? (int) $application['studentUserId'] : 0;
            if ($studentUserId > 0 && isset($documentsByStudent[$studentUserId])) {
                $application['documents'] = $documentsByStudent[$studentUserId];
            }
        }
        unset($application);
    }

    $semesterLabelLookup = [];
    foreach ($semesterOptions as $option) {
        if (isset($option['value'])) {
            $semesterValue = (string) $option['value'];
            $semesterLabelLookup[$semesterValue] = isset($option['label']) && $option['label'] !== ''
                ? (string) $option['label']
                : $semesterValue;
        }
    }

    $termEntries = [];
    $reportsByTerm = [];
    $semesterOrder = get_semester_sort_order();

    $historyQuery = "SELECT
                          seh.student_user_id,
                          seh.academic_year,
                          seh.semester,
                          seh.status AS enrollment_status,
                          sp.student_id_number,
                          sp.name AS student_name,
                          sp.course,
                          sp.year_level,
                          sp.status AS profile_status,
                          sp.enrollment_track,
                          b.name AS block_name,
                          u.email
                      FROM student_enrollment_history seh
                      INNER JOIN (
                          SELECT student_user_id, academic_year, semester, MAX(id) AS latest_id
                          FROM student_enrollment_history
                          GROUP BY student_user_id, academic_year, semester
                      ) latest ON latest.latest_id = seh.id
                      INNER JOIN student_profiles sp ON sp.user_id = seh.student_user_id
                      INNER JOIN users u ON u.id = sp.user_id
                      LEFT JOIN blocks b ON b.id = sp.block_id";
    $historyResult = $conn->query($historyQuery);
    if ($historyResult instanceof mysqli_result) {
        while ($row = $historyResult->fetch_assoc()) {
            $rowAcademicYear = trim((string) ($row['academic_year'] ?? ''));
            $rowSemester = trim((string) ($row['semester'] ?? ''));
            if ($rowAcademicYear === '' || $rowSemester === '') {
                continue;
            }

            $termKey = build_term_key($rowAcademicYear, $rowSemester);
            if (!isset($reportsByTerm[$termKey])) {
                $reportsByTerm[$termKey] = [
                    'academicYear' => $rowAcademicYear,
                    'semester' => $rowSemester,
                    'semesterLabel' => $semesterLabelLookup[$rowSemester] ?? $rowSemester,
                    'summary' => [
                        'totalStudents' => 0,
                        'totalEnrollees' => 0,
                        'newStudents' => 0,
                        'oldStudents' => 0,
                        'transferees' => 0,
                        'onHoldStudents' => 0,
                        'notEnrolledStudents' => 0,
                        'graduatedStudents' => 0,
                    ],
                    'yearLevelCounts' => [],
                    'masterList' => [],
                ];
            }

            $termEntries[$termKey] = [
                'academicYear' => $rowAcademicYear,
                'semester' => $rowSemester,
                'semesterLabel' => $semesterLabelLookup[$rowSemester] ?? $rowSemester,
            ];

            $termEntry =& $reportsByTerm[$termKey];
            $termEntry['summary']['totalStudents']++;

            $enrollmentStatus = normalize_status_label($row['enrollment_status'] ?? '');
            switch ($enrollmentStatus) {
                case 'Enrolled':
                    $termEntry['summary']['totalEnrollees']++;
                    $profileStatus = normalize_status_label($row['profile_status'] ?? '');
                    if ($profileStatus === '') {
                        $profileStatus = 'Old';
                    }
                    $enrollmentTrack = normalize_enrollment_track($row['enrollment_track'] ?? '');
                    $profileStatusDisplay = compose_profile_status_display($profileStatus, $enrollmentTrack);

                    switch ($profileStatus) {
                        case 'New':
                            $termEntry['summary']['newStudents']++;
                            break;
                        case 'Transferee':
                            $termEntry['summary']['transferees']++;
                            break;
                        default:
                            $termEntry['summary']['oldStudents']++;
                            break;
                    }

                    $yearLevel = isset($row['year_level']) ? (int) $row['year_level'] : 0;
                    if (!isset($termEntry['yearLevelCounts'][$yearLevel])) {
                        $termEntry['yearLevelCounts'][$yearLevel] = 0;
                    }
                    $termEntry['yearLevelCounts'][$yearLevel]++;

                    $termEntry['masterList'][] = [
                        'id' => $row['student_id_number'],
                        'name' => $row['student_name'],
                        'course' => $row['course'],
                        'year' => isset($row['year_level']) ? (int) $row['year_level'] : 0,
                        'status' => $profileStatus,
                        'statusDisplay' => $profileStatusDisplay,
                        'enrollmentTrack' => $enrollmentTrack,
                        'block' => $row['block_name'] ?? null,
                        'email' => $row['email'] ?? null,
                        'enrollmentStatus' => $enrollmentStatus,
                    ];
                    break;
                case 'Hold':
                    $termEntry['summary']['onHoldStudents']++;
                    break;
                case 'Not Enrolled':
                    $termEntry['summary']['notEnrolledStudents']++;
                    break;
                case 'Graduated':
                    $termEntry['summary']['graduatedStudents']++;
                    break;
            }
        }
        $historyResult->free();
    } elseif ($conn->errno !== 1146) {
        throw new Exception('Failed to fetch enrollment history reports: ' . $conn->error);
    }

    $currentTermKey = build_term_key($academicYear, $semester);
    $fallbackEntry = [
        'academicYear' => $academicYear,
        'semester' => $semester,
        'semesterLabel' => $semesterLabelLookup[$semester] ?? $semester,
        'summary' => [
            'totalStudents' => 0,
            'totalEnrollees' => 0,
            'newStudents' => 0,
            'oldStudents' => 0,
            'transferees' => 0,
            'onHoldStudents' => 0,
            'notEnrolledStudents' => 0,
            'graduatedStudents' => 0,
        ],
        'yearLevelCounts' => [],
        'masterList' => [],
    ];

    foreach ($students as $student) {
        $termStatus = normalize_status_label($student['currentTermStatus'] ?? '');
        if ($termStatus === '') {
            $termStatus = normalize_status_label($student['status'] ?? '');
        }
        if ($termStatus === '') {
            continue;
        }

        $fallbackEntry['summary']['totalStudents']++;
        switch ($termStatus) {
            case 'Enrolled':
                $fallbackEntry['summary']['totalEnrollees']++;
                $profileStatus = normalize_status_label($student['profileStatus'] ?? '');
                if ($profileStatus === '') {
                    $profileStatus = 'Old';
                }
                $enrollmentTrack = normalize_enrollment_track($student['enrollmentTrack'] ?? '');
                $profileStatusDisplay = compose_profile_status_display($profileStatus, $enrollmentTrack);
                switch ($profileStatus) {
                    case 'New':
                        $fallbackEntry['summary']['newStudents']++;
                        break;
                    case 'Transferee':
                        $fallbackEntry['summary']['transferees']++;
                        break;
                    default:
                        $fallbackEntry['summary']['oldStudents']++;
                        break;
                }

                $yearLevel = isset($student['year']) ? (int) $student['year'] : 0;
                if (!isset($fallbackEntry['yearLevelCounts'][$yearLevel])) {
                    $fallbackEntry['yearLevelCounts'][$yearLevel] = 0;
                }
                $fallbackEntry['yearLevelCounts'][$yearLevel]++;

                $fallbackEntry['masterList'][] = [
                    'id' => $student['studentId'],
                    'name' => $student['name'],
                    'course' => $student['course'],
                    'year' => isset($student['year']) ? (int) $student['year'] : 0,
                    'status' => $profileStatus,
                    'statusDisplay' => $profileStatusDisplay,
                    'enrollmentTrack' => $enrollmentTrack,
                    'block' => $student['block'] ?? null,
                    'email' => $student['email'] ?? null,
                    'enrollmentStatus' => $termStatus,
                ];
                break;
            case 'Hold':
                $fallbackEntry['summary']['onHoldStudents']++;
                break;
            case 'Not Enrolled':
                $fallbackEntry['summary']['notEnrolledStudents']++;
                break;
            case 'Graduated':
                $fallbackEntry['summary']['graduatedStudents']++;
                break;
        }
    }

    if (
        $fallbackEntry['summary']['totalStudents'] > 0
        && (!isset($reportsByTerm[$currentTermKey]) || empty($reportsByTerm[$currentTermKey]['masterList']))
    ) {
        $reportsByTerm[$currentTermKey] = $fallbackEntry;
        $termEntries[$currentTermKey] = [
            'academicYear' => $academicYear,
            'semester' => $semester,
            'semesterLabel' => $semesterLabelLookup[$semester] ?? $semester,
        ];
    }

    foreach ($reportsByTerm as $termKey => $entry) {
        $reportsByTerm[$termKey] = finalize_report_entry($entry);
    }

    $reportsTerms = array_values($termEntries);
    if (!empty($reportsTerms)) {
        usort($reportsTerms, static function (array $a, array $b) use ($semesterOrder): int {
            if ($a['academicYear'] === $b['academicYear']) {
                $orderA = $semesterOrder[$a['semester']] ?? 99;
                $orderB = $semesterOrder[$b['semester']] ?? 99;
                return $orderA <=> $orderB;
            }
            return strcmp($b['academicYear'], $a['academicYear']);
        });
    }

    $reports = [
        'terms' => $reportsTerms,
        'byTerm' => $reportsByTerm,
    ];

    $data = [
        'academicYear' => $academicYear,
        'semester' => $semester,
        'enrollmentStartDate' => $enrollmentStartDate,
        'enrollmentEndDate' => $enrollmentEndDate,
        'phasedEnrollmentSchedule' => $phasedSchedule,
        'academicYearOptions' => $academicYearOptions,
        'semesterOptions' => $semesterOptions,
        'adminUsers' => $adminUsers,
        'availableSubjects' => $availableSubjects,
        'subjectsByYear' => $subjectsByYear,
        'blocks' => $blocks,
        'students' => $students,
        'grades' => $gradesByStudentNumber,
        'instructors' => $instructors,
        'schedules' => $scheduleMap,
        'teachingAssignments' => $teachingAssignments,
        'pendingApplications' => $pendingApplications,
        'approvedApplications' => $approvedApplications,
        'rejectedApplications' => $rejectedApplications,
        'announcements' => $announcements,
        'reports' => $reports,
    ];

    echo json_encode([
        'status' => 'success',
        'data' => $data,
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
} finally {
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
?>
