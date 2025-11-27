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
    $allowedOriginHeader = $allowedOrigins[0] ?? null;
}

if ($allowedOriginHeader !== null) {
    header("Access-Control-Allow-Origin: {$allowedOriginHeader}");
    header('Access-Control-Allow-Credentials: true');
}

header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

$termWeights = [
    'prelim' => 0.30,
    'midterm' => 0.30,
    'final' => 0.40,
];

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
    exit;
}

function respond(int $statusCode, array $payload, ?mysqli $connection = null): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    if ($connection instanceof mysqli) {
        $connection->close();
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, [
        'status' => 'error',
        'message' => 'Only POST requests are allowed.',
    ], isset($conn) ? $conn : null);
}

$rawBody = file_get_contents('php://input');
$payload = json_decode($rawBody, true);
if (!is_array($payload)) {
    respond(400, [
        'status' => 'error',
        'message' => 'Invalid JSON payload.',
    ], isset($conn) ? $conn : null);
}

$studentIdNumber = trim((string)($payload['studentIdNumber'] ?? ''));
$subjectCode = strtoupper(trim((string)($payload['subjectCode'] ?? '')));
$gradeInput = $payload['grade'] ?? null;
$isIncompleteSubmission = false;
$gradeValue = null;

if (is_string($gradeInput)) {
    $normalizedGradeInput = strtoupper(trim($gradeInput));
    if (in_array($normalizedGradeInput, ['INC', 'INCOMPLETE'], true)) {
        $isIncompleteSubmission = true;
    }
}

if (!$isIncompleteSubmission && $gradeInput !== null) {
    if (is_numeric($gradeInput)) {
        $gradeValue = (float)$gradeInput;
    }
}
$academicYear = trim((string)($payload['academicYear'] ?? ''));
$semester = trim((string)($payload['semester'] ?? ''));
$termInput = strtolower(trim((string)($payload['term'] ?? '')));
$remarkInput = trim((string)($payload['remark'] ?? ''));
$instructorIdInput = $payload['instructorUserId'] ?? null;
$instructorEmailInput = trim((string)($payload['instructorEmail'] ?? ''));

if ($studentIdNumber === '' || $subjectCode === '') {
    respond(400, [
        'status' => 'error',
        'message' => 'Student ID number and subject code are required.',
    ], isset($conn) ? $conn : null);
}

if (!$isIncompleteSubmission) {
    if (!is_numeric($gradeInput) || $gradeValue === null || $gradeValue < 1.0 || $gradeValue > 5.0) {
        respond(422, [
            'status' => 'error',
            'message' => 'Grade must be a numeric value between 1.0 and 5.0.',
        ], isset($conn) ? $conn : null);
    }
}

if ($termInput === '') {
    respond(400, [
        'status' => 'error',
        'message' => 'Term is required (prelim, midterm, or final).',
    ], isset($conn) ? $conn : null);
}

if (!isset($termWeights[$termInput])) {
    respond(422, [
        'status' => 'error',
        'message' => 'Invalid term specified. Allowed values: prelim, midterm, final.',
    ], isset($conn) ? $conn : null);
}

$termKey = $termInput;
$termWeight = (float) $termWeights[$termKey];

if ($academicYear === '') {
    $currentYear = (int)date('Y');
    $academicYear = sprintf('%d-%d', $currentYear, $currentYear + 1);
}

if ($semester === '') {
    $semester = '1st-sem';
}

$manualRemark = $remarkInput !== '' ? $remarkInput : null;
if ($manualRemark === null && $isIncompleteSubmission) {
    $manualRemark = 'INC';
}

try {
    if (!isset($conn) || !($conn instanceof mysqli)) {
        throw new Exception('Database connection is not available.');
    }

    $conn->set_charset('utf8mb4');
    $conn->begin_transaction();

    $studentStmt = $conn->prepare('SELECT user_id FROM student_profiles WHERE student_id_number = ? LIMIT 1');
    if (!$studentStmt) {
        throw new Exception('Failed to prepare student lookup query: ' . $conn->error);
    }
    $studentStmt->bind_param('s', $studentIdNumber);
    $studentStmt->execute();
    $studentStmt->bind_result($studentUserId);
    if (!$studentStmt->fetch()) {
        $studentStmt->close();
        $conn->rollback();
        respond(404, [
            'status' => 'error',
            'message' => 'Student not found.',
        ], $conn);
    }
    $studentStmt->close();

    $subjectStmt = $conn->prepare('SELECT id FROM subjects WHERE UPPER(code) = ? LIMIT 1');
    if (!$subjectStmt) {
        throw new Exception('Failed to prepare subject lookup query: ' . $conn->error);
    }
    $subjectStmt->bind_param('s', $subjectCode);
    $subjectStmt->execute();
    $subjectStmt->bind_result($subjectId);
    if (!$subjectStmt->fetch()) {
        $subjectStmt->close();
        $conn->rollback();
        respond(404, [
            'status' => 'error',
            'message' => 'Subject not found.',
        ], $conn);
    }
    $subjectStmt->close();

    $instructorUserId = null;
    if (is_numeric($instructorIdInput)) {
        $instructorUserId = (int)$instructorIdInput;
    } elseif ($instructorEmailInput !== '') {
        $instructorStmt = $conn->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
        if (!$instructorStmt) {
            throw new Exception('Failed to prepare instructor lookup query: ' . $conn->error);
        }
        $instructorStmt->bind_param('s', $instructorEmailInput);
        $instructorStmt->execute();
        $instructorStmt->bind_result($lookupInstructorId);
        if ($instructorStmt->fetch()) {
            $instructorUserId = (int)$lookupInstructorId;
        }
        $instructorStmt->close();
    }

    $gradeLookupStmt = $conn->prepare('SELECT id FROM student_grades WHERE student_user_id = ? AND subject_id = ? AND academic_year = ? AND semester = ? LIMIT 1');
    if (!$gradeLookupStmt) {
        throw new Exception('Failed to prepare grade lookup statement: ' . $conn->error);
    }
    $gradeLookupStmt->bind_param('iiss', $studentUserId, $subjectId, $academicYear, $semester);
    $gradeLookupStmt->execute();
    $gradeLookupResult = $gradeLookupStmt->get_result();
    $existingGradeRow = $gradeLookupResult ? $gradeLookupResult->fetch_assoc() : null;
    $gradeLookupStmt->close();

    if ($existingGradeRow) {
        $studentGradeId = (int)$existingGradeRow['id'];
    } else {
        $initialRemark = $manualRemark ?? 'In Progress';
        $insertGradeStmt = $conn->prepare('INSERT INTO student_grades (student_user_id, subject_id, grade, academic_year, semester, instructor_user_id, remark, graded_at) VALUES (?, ?, NULL, ?, ?, ?, ?, NULL)');
        if (!$insertGradeStmt) {
            throw new Exception('Failed to prepare grade creation statement: ' . $conn->error);
        }
        $insertGradeStmt->bind_param('iissis', $studentUserId, $subjectId, $academicYear, $semester, $instructorUserId, $initialRemark);
        if (!$insertGradeStmt->execute()) {
            $error = $insertGradeStmt->error;
            $insertGradeStmt->close();
            throw new Exception('Failed to create grade record: ' . $error);
        }
        $studentGradeId = (int)$conn->insert_id;
        $insertGradeStmt->close();

        if ($studentGradeId <= 0) {
            throw new Exception('Unable to determine the newly created grade record identifier.');
        }
    }

    $termTimestamp = date('Y-m-d H:i:s');

    if ($isIncompleteSubmission) {
        $deleteTermStmt = $conn->prepare('DELETE FROM student_grade_terms WHERE student_grade_id = ? AND term = ?');
        if (!$deleteTermStmt) {
            throw new Exception('Failed to prepare incomplete term reset statement: ' . $conn->error);
        }
        $deleteTermStmt->bind_param('is', $studentGradeId, $termKey);
        if (!$deleteTermStmt->execute()) {
            $error = $deleteTermStmt->error;
            $deleteTermStmt->close();
            throw new Exception('Failed to reset term grade for incomplete status: ' . $error);
        }
        $deleteTermStmt->close();
    } else {
        $termUpsertStmt = $conn->prepare('INSERT INTO student_grade_terms (student_grade_id, term, grade, weight, encoded_at) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE grade = VALUES(grade), weight = VALUES(weight), encoded_at = VALUES(encoded_at)');
        if (!$termUpsertStmt) {
            throw new Exception('Failed to prepare term grade statement: ' . $conn->error);
        }
        $termUpsertStmt->bind_param('isdds', $studentGradeId, $termKey, $gradeValue, $termWeight, $termTimestamp);
        if (!$termUpsertStmt->execute()) {
            $error = $termUpsertStmt->error;
            $termUpsertStmt->close();
            throw new Exception('Failed to record term grade: ' . $error);
        }
        $termUpsertStmt->close();
    }

    $termsStmt = $conn->prepare('SELECT term, grade, weight, encoded_at FROM student_grade_terms WHERE student_grade_id = ?');
    if (!$termsStmt) {
        throw new Exception('Failed to prepare term retrieval statement: ' . $conn->error);
    }
    $termsStmt->bind_param('i', $studentGradeId);
    $termsStmt->execute();
    $termsResult = $termsStmt->get_result();
    $termsByKey = [];
    if ($termsResult) {
        while ($termRow = $termsResult->fetch_assoc()) {
            $termName = $termRow['term'] ?? null;
            if ($termName === null || $termName === '') {
                continue;
            }
            $termsByKey[$termName] = [
                'term' => $termName,
                'grade' => isset($termRow['grade']) ? (float)$termRow['grade'] : null,
                'weight' => isset($termRow['weight']) ? (float)$termRow['weight'] : null,
                'encodedAt' => $termRow['encoded_at'] ?? null,
            ];
        }
    }
    $termsStmt->close();

    $totalWeight = 0.0;
    $weightedSum = 0.0;
    $hasAllTerms = true;

    foreach ($termWeights as $key => $defaultWeight) {
        if (!isset($termsByKey[$key]) || $termsByKey[$key]['grade'] === null) {
            $hasAllTerms = false;
            continue;
        }

        $termGradeValue = (float) $termsByKey[$key]['grade'];
        $termWeightValue = isset($termsByKey[$key]['weight']) && $termsByKey[$key]['weight'] !== null
            ? (float) $termsByKey[$key]['weight']
            : (float) $defaultWeight;
        $termsByKey[$key]['weight'] = $termWeightValue;
        $weightedSum += $termGradeValue * $termWeightValue;
        $totalWeight += $termWeightValue;
    }

    $finalGrade = null;
    if ($hasAllTerms && $totalWeight > 0) {
        $finalGrade = round($weightedSum / $totalWeight, 2);
    }

    $finalRemark = $manualRemark;
    if ($finalRemark === null) {
        if ($finalGrade !== null) {
            $finalRemark = $finalGrade <= 3.0 ? 'Passed' : 'Failed';
        } else {
            $finalRemark = 'In Progress';
        }

        if ($isIncompleteSubmission) {
            $finalRemark = 'INC';
        }
    }

    $gradedAtValue = $finalGrade !== null ? date('Y-m-d H:i:s') : null;

    if ($finalGrade !== null) {
        $updateGradeStmt = $conn->prepare('UPDATE student_grades SET grade = ?, remark = ?, instructor_user_id = ?, graded_at = ? WHERE id = ?');
        if (!$updateGradeStmt) {
            throw new Exception('Failed to prepare final grade update statement: ' . $conn->error);
        }
        $updateGradeStmt->bind_param('dsisi', $finalGrade, $finalRemark, $instructorUserId, $gradedAtValue, $studentGradeId);
    } else {
        $updateGradeStmt = $conn->prepare('UPDATE student_grades SET grade = NULL, remark = ?, instructor_user_id = ?, graded_at = NULL WHERE id = ?');
        if (!$updateGradeStmt) {
            throw new Exception('Failed to prepare partial grade update statement: ' . $conn->error);
        }
        $updateGradeStmt->bind_param('sii', $finalRemark, $instructorUserId, $studentGradeId);
    }

    if (!$updateGradeStmt->execute()) {
        $error = $updateGradeStmt->error;
        $updateGradeStmt->close();
        throw new Exception('Failed to update overall grade record: ' . $error);
    }
    $updateGradeStmt->close();

    $selectStmt = $conn->prepare('SELECT sg.id, sg.grade, sg.academic_year, sg.semester, sg.remark, sg.graded_at, subj.code, subj.description, subj.units
                                   FROM student_grades sg
                                   INNER JOIN subjects subj ON subj.id = sg.subject_id
                                   WHERE sg.id = ?
                                   LIMIT 1');
    if (!$selectStmt) {
        throw new Exception('Failed to prepare grade retrieval statement: ' . $conn->error);
    }
    $selectStmt->bind_param('i', $studentGradeId);
    $selectStmt->execute();
    $result = $selectStmt->get_result();
    $gradeRow = $result ? $result->fetch_assoc() : null;
    $selectStmt->close();

    $conn->commit();

    if (!$gradeRow) {
        respond(500, [
            'status' => 'error',
            'message' => 'Grade saved but could not be retrieved.',
        ], $conn);
    }

    $remarkResponse = isset($gradeRow['remark']) ? trim((string) $gradeRow['remark']) : null;
    $normalizedRemarkResponse = $remarkResponse !== null ? strtoupper($remarkResponse) : null;
    $isIncompleteRemarkResponse = $normalizedRemarkResponse === 'INC' || $normalizedRemarkResponse === 'INCOMPLETE';
    if ($isIncompleteRemarkResponse) {
        $remarkResponse = 'INC';
    }

    $gradeValueResponse = isset($gradeRow['grade']) ? (float) $gradeRow['grade'] : null;
    if ($isIncompleteRemarkResponse) {
        $gradeValueResponse = 'INC';
    }

    $termsPayload = [];
    foreach ($termWeights as $key => $defaultWeight) {
        $termData = $termsByKey[$key] ?? null;
        $termGradeValue = $termData && $termData['grade'] !== null ? (float) $termData['grade'] : null;
        if ($isIncompleteRemarkResponse && $termGradeValue === null) {
            $termGradeValue = 'INC';
        }
        $termsPayload[$key] = [
            'term' => $key,
            'grade' => $termGradeValue,
            'weight' => $termData && $termData['weight'] !== null ? (float) $termData['weight'] : (float) $defaultWeight,
            'encodedAt' => $termData['encodedAt'] ?? null,
        ];
    }

    respond(200, [
        'status' => 'success',
        'data' => [
            'id' => (int) $gradeRow['id'],
            'studentIdNumber' => $studentIdNumber,
            'subjectCode' => $gradeRow['code'],
            'subjectDescription' => $gradeRow['description'],
            'units' => isset($gradeRow['units']) ? (int) $gradeRow['units'] : 0,
            'grade' => $gradeValueResponse,
            'academicYear' => $gradeRow['academic_year'],
            'semester' => $gradeRow['semester'],
            'remark' => $remarkResponse,
            'gradedAt' => $gradeRow['graded_at'],
            'terms' => $termsPayload,
        ],
    ], $conn);
} catch (Throwable $e) {
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->rollback();
    }
    respond(500, [
        'status' => 'error',
        'message' => $e->getMessage(),
    ], isset($conn) ? $conn : null);
}
?>
