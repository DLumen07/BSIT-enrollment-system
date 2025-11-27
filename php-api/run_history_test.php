<?php
declare(strict_types=1);
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

function respond(int $statusCode, array $payload, ?mysqli $connection = null): void
{
    if ($connection instanceof mysqli) {
        $connection->close();
    }

    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

if (!isset($conn) || !($conn instanceof mysqli)) {
    respond(500, [
        'status' => 'error',
        'message' => 'Database connection is unavailable.',
    ]);
}

try {
    $conn->set_charset('utf8mb4');

    $instructorEmail = strtolower(trim((string) ($_GET['instructor_email'] ?? '')));
    $instructorId = isset($_GET['instructor_id']) ? (int) $_GET['instructor_id'] : null;
    if ($instructorId !== null && $instructorId <= 0) {
        $instructorId = null;
    }
    $academicYearFilter = trim((string) ($_GET['academic_year'] ?? ''));
    $semesterFilter = trim((string) ($_GET['semester'] ?? ''));
    $limit = isset($_GET['limit']) ? (int) $_GET['limit'] : 25;
    if ($limit <= 0) {
        $limit = 25;
    }
    $limit = min($limit, 100);

    if ($instructorEmail === '' && $instructorId === null) {
        respond(400, [
            'status' => 'error',
            'message' => 'Provide instructor_email or instructor_id to run the history test.',
        ], $conn);
    }

    $semesterOptions = ['1st-sem', '2nd-sem', 'summer'];
    if ($semesterFilter !== '' && !in_array($semesterFilter, $semesterOptions, true)) {
        respond(400, [
            'status' => 'error',
            'message' => 'Semester must be one of: 1st-sem, 2nd-sem, summer.',
        ], $conn);
    }

    $conditions = [];
    $params = [];
    $types = '';

    if ($instructorEmail !== '') {
        $conditions[] = 'LOWER(th.instructor_email) = ?';
        $params[] = $instructorEmail;
        $types .= 's';
    }
    if ($instructorId !== null) {
        $conditions[] = 'th.instructor_user_id = ?';
        $params[] = $instructorId;
        $types .= 'i';
    }
    if ($academicYearFilter !== '') {
        $conditions[] = 'th.academic_year = ?';
        $params[] = $academicYearFilter;
        $types .= 's';
    }
    if ($semesterFilter !== '') {
        $conditions[] = 'th.semester = ?';
        $params[] = $semesterFilter;
        $types .= 's';
    }

    $types .= 'i';
    $params[] = $limit;

    $whereClause = '';
    if (!empty($conditions)) {
        $whereClause = 'WHERE ' . implode(' AND ', $conditions);
    }

    $historySql = <<<SQL
SELECT
    th.id,
    th.schedule_id,
    th.block_id,
    th.block_name,
    th.subject_id,
    th.subject_code,
    th.subject_description,
    th.academic_year,
    th.semester,
    th.instructor_user_id,
    th.instructor_name,
    th.instructor_email,
    th.captured_at
FROM teaching_assignment_history th
{$whereClause}
ORDER BY
    th.academic_year DESC,
    FIELD(th.semester, '1st-sem','2nd-sem','summer'),
    th.block_name,
    th.subject_code,
    th.captured_at DESC
LIMIT ?
SQL;

    $historyStmt = $conn->prepare($historySql);
    if (!$historyStmt) {
        throw new Exception('Unable to prepare history query: ' . $conn->error);
    }

    if ($types !== '') {
        $bindParams = [];
        $bindParams[] = $types;
        foreach ($params as $index => $value) {
            $bindParams[] = &$params[$index];
        }
        call_user_func_array([$historyStmt, 'bind_param'], $bindParams);
    }

    if (!$historyStmt->execute()) {
        $error = $historyStmt->error;
        $historyStmt->close();
        throw new Exception('Failed to execute history query: ' . $error);
    }

    $historyResult = $historyStmt->get_result();
    $assignments = [];
    if ($historyResult instanceof mysqli_result) {
        while ($row = $historyResult->fetch_assoc()) {
            $assignments[] = $row;
        }
        $historyResult->free();
    }
    $historyStmt->close();

    if (empty($assignments)) {
        respond(200, [
            'status' => 'success',
            'filters' => [
                'instructor_email' => $instructorEmail,
                'instructor_id' => $instructorId,
                'academic_year' => $academicYearFilter,
                'semester' => $semesterFilter,
            ],
            'assignments' => [],
            'message' => 'No teaching assignment history matches the provided filters.',
        ], $conn);
    }

    $subjectCodeMap = [];
    if ($subjectsResult = $conn->query('SELECT id, code FROM subjects')) {
        while ($subjectRow = $subjectsResult->fetch_assoc()) {
            $codeKey = strtoupper(trim((string) ($subjectRow['code'] ?? '')));
            if ($codeKey === '') {
                continue;
            }
            $subjectCodeMap[$codeKey] = (int) $subjectRow['id'];
        }
        $subjectsResult->free();
    }

    $gradeCountStmt = $conn->prepare('SELECT COUNT(DISTINCT student_user_id) AS total FROM student_grades WHERE subject_id = ? AND academic_year = ? AND semester = ?');
    $gradeSampleStmt = $conn->prepare('SELECT DISTINCT sp.student_id_number, sp.name FROM student_grades sg INNER JOIN student_profiles sp ON sp.user_id = sg.student_user_id WHERE sg.subject_id = ? AND sg.academic_year = ? AND sg.semester = ? ORDER BY sp.name ASC LIMIT 10');
    $enlistedCountStmt = $conn->prepare('SELECT COUNT(DISTINCT ss.student_user_id) AS total FROM student_subjects ss INNER JOIN student_profiles sp ON sp.user_id = ss.student_user_id WHERE ss.subject_id = ? AND sp.block_id = ?');
    $enlistedSampleStmt = $conn->prepare('SELECT DISTINCT sp.student_id_number, sp.name FROM student_subjects ss INNER JOIN student_profiles sp ON sp.user_id = ss.student_user_id WHERE ss.subject_id = ? AND sp.block_id = ? ORDER BY sp.name ASC LIMIT 10');

    $results = [];
    foreach ($assignments as $assignment) {
        $subjectCode = strtoupper(trim((string) ($assignment['subject_code'] ?? '')));
        $subjectId = isset($assignment['subject_id']) ? (int) $assignment['subject_id'] : 0;
        if ($subjectId <= 0 && $subjectCode !== '' && isset($subjectCodeMap[$subjectCode])) {
            $subjectId = $subjectCodeMap[$subjectCode];
        }

        $blockId = isset($assignment['block_id']) ? (int) $assignment['block_id'] : null;
        if ($blockId !== null && $blockId <= 0) {
            $blockId = null;
        }

        $academicYear = (string) ($assignment['academic_year'] ?? '');
        $semester = (string) ($assignment['semester'] ?? '');

        $gradeCount = 0;
        $gradeSamples = [];
        if ($subjectId > 0 && $academicYear !== '' && $semester !== '' && $gradeCountStmt && $gradeSampleStmt) {
            $gradeCountStmt->bind_param('iss', $subjectId, $academicYear, $semester);
            if ($gradeCountStmt->execute()) {
                $countResult = $gradeCountStmt->get_result();
                if ($countResult instanceof mysqli_result) {
                    $countRow = $countResult->fetch_assoc();
                    if ($countRow) {
                        $gradeCount = (int) ($countRow['total'] ?? 0);
                    }
                    $countResult->free();
                }
            }

            $gradeSampleStmt->bind_param('iss', $subjectId, $academicYear, $semester);
            if ($gradeSampleStmt->execute()) {
                $sampleResult = $gradeSampleStmt->get_result();
                if ($sampleResult instanceof mysqli_result) {
                    while ($sampleRow = $sampleResult->fetch_assoc()) {
                        $gradeSamples[] = [
                            'studentId' => $sampleRow['student_id_number'],
                            'name' => $sampleRow['name'],
                        ];
                    }
                    $sampleResult->free();
                }
            }
        }

        $enlistedCount = 0;
        $enlistedSamples = [];
        if ($subjectId > 0 && $blockId !== null && $enlistedCountStmt && $enlistedSampleStmt) {
            $enlistedCountStmt->bind_param('ii', $subjectId, $blockId);
            if ($enlistedCountStmt->execute()) {
                $countResult = $enlistedCountStmt->get_result();
                if ($countResult instanceof mysqli_result) {
                    $countRow = $countResult->fetch_assoc();
                    if ($countRow) {
                        $enlistedCount = (int) ($countRow['total'] ?? 0);
                    }
                    $countResult->free();
                }
            }

            $enlistedSampleStmt->bind_param('ii', $subjectId, $blockId);
            if ($enlistedSampleStmt->execute()) {
                $sampleResult = $enlistedSampleStmt->get_result();
                if ($sampleResult instanceof mysqli_result) {
                    while ($sampleRow = $sampleResult->fetch_assoc()) {
                        $enlistedSamples[] = [
                            'studentId' => $sampleRow['student_id_number'],
                            'name' => $sampleRow['name'],
                        ];
                    }
                    $sampleResult->free();
                }
            }
        }

        $results[] = [
            'assignmentId' => (int) $assignment['id'],
            'scheduleId' => isset($assignment['schedule_id']) ? (int) $assignment['schedule_id'] : null,
            'blockId' => $blockId,
            'blockName' => $assignment['block_name'],
            'subjectId' => $subjectId > 0 ? $subjectId : null,
            'subjectCode' => $assignment['subject_code'],
            'subjectDescription' => $assignment['subject_description'],
            'academicYear' => $academicYear,
            'semester' => $semester,
            'capturedAt' => $assignment['captured_at'],
            'gradeCount' => $gradeCount,
            'gradeSamples' => $gradeSamples,
            'enlistedCount' => $enlistedCount,
            'enlistedSamples' => $enlistedSamples,
        ];
    }

    if ($gradeCountStmt) {
        $gradeCountStmt->close();
    }
    if ($gradeSampleStmt) {
        $gradeSampleStmt->close();
    }
    if ($enlistedCountStmt) {
        $enlistedCountStmt->close();
    }
    if ($enlistedSampleStmt) {
        $enlistedSampleStmt->close();
    }

    respond(200, [
        'status' => 'success',
        'filters' => [
            'instructor_email' => $instructorEmail,
            'instructor_id' => $instructorId,
            'academic_year' => $academicYearFilter,
            'semester' => $semesterFilter,
            'limit' => $limit,
        ],
        'assignments' => $results,
    ], $conn);
} catch (Throwable $error) {
    respond(500, [
        'status' => 'error',
        'message' => $error->getMessage(),
    ], $conn);
}
