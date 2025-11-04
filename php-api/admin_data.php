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

try {
    $conn->set_charset('utf8mb4');

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
    $subjectsQuery = "SELECT s.id, s.code, s.description, s.units, s.year_level, prereq.code AS prerequisite_code
                       FROM subjects s
                       LEFT JOIN subjects prereq ON s.prerequisite_id = prereq.id
                       ORDER BY s.year_level, s.code";
    if ($result = $conn->query($subjectsQuery)) {
        while ($row = $result->fetch_assoc()) {
            $yearKey = normalize_year_key((int) $row['year_level']);
            if (!isset($subjectsByYear[$yearKey])) {
                $subjectsByYear[$yearKey] = [];
            }
            $subjectsByYear[$yearKey][] = [
                'id' => (int) $row['id'],
                'code' => $row['code'],
                'description' => $row['description'],
                'units' => (int) $row['units'],
                'prerequisite' => $row['prerequisite_code'] ?? null,
            ];
            $availableSubjects[] = [
                'id' => $row['code'],
                'label' => $row['code'] . ' - ' . $row['description'],
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
    $gradesQuery = "SELECT sg.student_user_id, s.code AS subject_code, sg.grade
                     FROM student_grades sg
                     INNER JOIN subjects s ON sg.subject_id = s.id";
    if ($result = $conn->query($gradesQuery)) {
        while ($row = $result->fetch_assoc()) {
            $studentId = (int) $row['student_user_id'];
            if (!isset($gradesMap[$studentId])) {
                $gradesMap[$studentId] = [];
            }
            $gradesMap[$studentId][] = [
                'subjectCode' => $row['subject_code'],
                'grade' => (float) $row['grade'],
            ];
        }
        $result->free();
    } else {
        throw new Exception('Failed to fetch grades: ' . $conn->error);
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
            $students[] = [
                'id' => $studentUserId,
                'studentId' => $row['student_id_number'],
                'name' => $row['name'],
                'avatar' => $row['avatar_url'] ?? '',
                'email' => $row['email'],
                'course' => $row['course'],
                'year' => (int) $row['year_level'],
                'status' => $row['enrollment_status'],
                'profileStatus' => $row['status'],
                'block' => $row['block_name'],
                'enlistedSubjects' => $studentSubjectsMap[$studentUserId] ?? [],
                'sex' => $row['sex'],
                'phoneNumber' => $row['phone_number'],
                'specialization' => $row['specialization'],
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
            $instructors[] = [
                'id' => $instructorId,
                'name' => $row['name'],
                'email' => $row['email'],
                'subjects' => $instructorSubjects[$instructorId] ?? [],
                'avatar' => $row['avatar_url'] ?? '',
            ];
        }
        $result->free();
    } else {
        throw new Exception('Failed to fetch instructor profiles: ' . $conn->error);
    }

    $scheduleMap = [];
    $scheduleQuery = "SELECT sch.id, b.name AS block_name, subj.code, subj.description,
                              sch.day_of_week, DATE_FORMAT(sch.start_time, '%H:%i') AS start_time,
                              DATE_FORMAT(sch.end_time, '%H:%i') AS end_time,
                              IFNULL(instr.name, 'TBA') AS instructor_name
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
            $scheduleMap[$blockName][] = [
                'id' => (int) $row['id'],
                'code' => $row['code'],
                'description' => $row['description'],
                'day' => $row['day_of_week'],
                'startTime' => $row['start_time'],
                'endTime' => $row['end_time'],
                'instructor' => $row['instructor_name'],
                'color' => 'bg-blue-200/50 dark:bg-blue-800/50 border-blue-400',
            ];
        }
        $result->free();
    } else {
        throw new Exception('Failed to fetch schedules: ' . $conn->error);
    }

    $pendingApplications = [];
    $approvedApplications = [];
    $rejectedApplications = [];
    $applicationsQuery = "SELECT ea.id, ea.student_user_id, ea.status, ea.block_name, ea.`submitted_.at` AS submitted_at,
                                 ea.rejection_reason, ea.form_data, sp.student_id_number, sp.name AS student_name,
                                 sp.course, sp.year_level, sp.status AS student_status
                          FROM enrollment_applications ea
                          INNER JOIN student_profiles sp ON sp.user_id = ea.student_user_id";
    if ($result = $conn->query($applicationsQuery)) {
        while ($row = $result->fetch_assoc()) {
            $decodedForm = json_decode($row['form_data'], true);
            if (!is_array($decodedForm)) {
                $decodedForm = [];
            }
            $credentials = array_merge(default_credentials(), $decodedForm);
            $application = [
                'id' => (int) $row['id'],
                'studentId' => $row['student_id_number'],
                'studentUserId' => (int) $row['student_user_id'],
                'name' => $row['student_name'],
                'course' => $row['course'],
                'year' => (int) $row['year_level'],
                'status' => $row['student_status'] ?? 'Old',
                'block' => $row['block_name'],
                'credentials' => $credentials,
                'rejectionReason' => $row['rejection_reason'] ?? null,
                'submittedAt' => $row['submitted_at'],
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

    $data = [
        'adminUsers' => $adminUsers,
        'availableSubjects' => $availableSubjects,
        'subjectsByYear' => $subjectsByYear,
        'blocks' => $blocks,
        'students' => $students,
        'grades' => $gradesByStudentNumber,
        'instructors' => $instructors,
        'schedules' => $scheduleMap,
        'pendingApplications' => $pendingApplications,
        'approvedApplications' => $approvedApplications,
        'rejectedApplications' => $rejectedApplications,
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
