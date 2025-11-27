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

header('Access-Control-Allow-Methods: POST, OPTIONS');
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

function acquire_rollover_lock(mysqli $connection, string $lockName): void
{
    $stmt = $connection->prepare('SELECT GET_LOCK(?, 0) AS lock_obtained');
    if (!$stmt) {
        throw new Exception('Unable to prepare rollover lock statement: ' . $connection->error);
    }

    $stmt->bind_param('s', $lockName);
    if (!$stmt->execute()) {
        $stmt->close();
        throw new Exception('Failed to acquire rollover lock: ' . $stmt->error);
    }

    $result = $stmt->get_result();
    $row = $result ? $result->fetch_assoc() : null;
    $stmt->close();

    $lockObtained = isset($row['lock_obtained']) ? (int) $row['lock_obtained'] : 0;
    if ($lockObtained !== 1) {
        throw new Exception('Another academic rollover is currently running. Please try again once it completes.');
    }
}

function release_rollover_lock(mysqli $connection, string $lockName): void
{
    $stmt = $connection->prepare('SELECT RELEASE_LOCK(?)');
    if (!$stmt) {
        return;
    }
    $stmt->bind_param('s', $lockName);
    $stmt->execute();
    $stmt->close();
}

function to_bool(mixed $value): bool
{
    if (is_bool($value)) {
        return $value;
    }

    if (is_int($value)) {
        return $value === 1;
    }

    if (is_string($value)) {
        $normalized = strtolower(trim($value));
        return in_array($normalized, ['1', 'true', 'yes', 'on'], true);
    }

    return false;
}

function ensure_teaching_assignment_history_table(mysqli $connection): void
{
    $sql = <<<SQL
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

    if (!$connection->query($sql)) {
        throw new Exception('Failed to ensure teaching assignment history table exists: ' . $connection->error);
    }
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
    $payload = $_POST;
}

$dryRun = to_bool($payload['dryRun'] ?? false);
$nextAcademicYear = isset($payload['nextAcademicYear']) ? trim((string) $payload['nextAcademicYear']) : '';
$nextSemester = isset($payload['nextSemester']) ? trim((string) $payload['nextSemester']) : '';
$closingAcademicYearOverride = isset($payload['closingAcademicYear']) ? trim((string) $payload['closingAcademicYear']) : '';
$closingSemesterOverride = isset($payload['closingSemester']) ? trim((string) $payload['closingSemester']) : '';
$triggeredByUserId = isset($payload['triggeredByUserId']) ? (int) $payload['triggeredByUserId'] : null;
$notes = isset($payload['notes']) ? trim((string) $payload['notes']) : '';
$enrollmentStartDateInput = isset($payload['enrollmentStartDate']) ? trim((string) $payload['enrollmentStartDate']) : '';
$enrollmentEndDateInput = isset($payload['enrollmentEndDate']) ? trim((string) $payload['enrollmentEndDate']) : '';
$phasedSchedule = $payload['phasedSchedule'] ?? null;

if ($triggeredByUserId !== null && $triggeredByUserId <= 0) {
    $triggeredByUserId = null;
}

if ($nextAcademicYear === '' || $nextSemester === '') {
    respond(400, [
        'status' => 'error',
        'message' => 'Next academic year and semester are required.',
    ], isset($conn) ? $conn : null);
}

$startDateValue = null;
if ($enrollmentStartDateInput !== '') {
    $startDate = DateTime::createFromFormat('Y-m-d', $enrollmentStartDateInput);
    if (!$startDate || $startDate->format('Y-m-d') !== $enrollmentStartDateInput) {
        respond(422, [
            'status' => 'error',
            'message' => 'Enrollment start date must follow the YYYY-MM-DD format.',
        ], isset($conn) ? $conn : null);
    }
    $startDateValue = $startDate->format('Y-m-d');
}

$endDateValue = null;
if ($enrollmentEndDateInput !== '') {
    $endDate = DateTime::createFromFormat('Y-m-d', $enrollmentEndDateInput);
    if (!$endDate || $endDate->format('Y-m-d') !== $enrollmentEndDateInput) {
        respond(422, [
            'status' => 'error',
            'message' => 'Enrollment end date must follow the YYYY-MM-DD format.',
        ], isset($conn) ? $conn : null);
    }
    $endDateValue = $endDate->format('Y-m-d');
}

if ($startDateValue !== null && $endDateValue !== null && $startDateValue > $endDateValue) {
    respond(422, [
        'status' => 'error',
        'message' => 'Enrollment start date cannot be later than the end date.',
    ], isset($conn) ? $conn : null);
}

$phasedScheduleJson = null;
if ($phasedSchedule !== null) {
    if (is_string($phasedSchedule)) {
        $phasedScheduleJson = $phasedSchedule;
    } else {
        $encodedSchedule = json_encode($phasedSchedule, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        if ($encodedSchedule === false) {
            respond(422, [
                'status' => 'error',
                'message' => 'Unable to encode phased schedule as JSON.',
            ], isset($conn) ? $conn : null);
        }
        $phasedScheduleJson = $encodedSchedule;
    }
}

$lockName = 'bsit_academic_rollover_lock';
$lockAcquired = false;

try {
    if (!isset($conn) || !($conn instanceof mysqli)) {
        throw new Exception('Database connection is not available.');
    }

    $conn->set_charset('utf8mb4');

    $settingsRow = null;
    $settingsQuery = 'SELECT academic_year, semester, enrollment_start_date, enrollment_end_date, phased_schedule_json FROM system_settings ORDER BY id ASC LIMIT 1';
    if ($result = $conn->query($settingsQuery)) {
        $settingsRow = $result->fetch_assoc() ?: null;
        $result->free();
    }

    $closingAcademicYear = $closingAcademicYearOverride !== ''
        ? $closingAcademicYearOverride
        : ($settingsRow['academic_year'] ?? '');
    $closingSemester = $closingSemesterOverride !== ''
        ? $closingSemesterOverride
        : ($settingsRow['semester'] ?? '');

    if ($closingAcademicYear === '' || $closingSemester === '') {
        throw new Exception('Current system settings are missing. Set the active academic year and semester before running the rollover.');
    }

    if (strcasecmp($closingAcademicYear, $nextAcademicYear) === 0 && strcasecmp($closingSemester, $nextSemester) === 0) {
        throw new Exception('The next academic term matches the current term. Please choose a different academic year or semester before running the rollover.');
    }

    if ($startDateValue === null && isset($settingsRow['enrollment_start_date'])) {
        $startDateValue = $settingsRow['enrollment_start_date'];
    }
    if ($endDateValue === null && isset($settingsRow['enrollment_end_date'])) {
        $endDateValue = $settingsRow['enrollment_end_date'];
    }
    if ($phasedScheduleJson === null && isset($settingsRow['phased_schedule_json'])) {
        $phasedScheduleJson = $settingsRow['phased_schedule_json'];
    }

    $students = [];
    $studentsQuery = "SELECT user_id, student_id_number, name, course, year_level, status FROM student_profiles WHERE enrollment_status = 'Enrolled'";
    if ($studentsResult = $conn->query($studentsQuery)) {
        while ($row = $studentsResult->fetch_assoc()) {
            $students[] = [
                'user_id' => (int) $row['user_id'],
                'student_id_number' => $row['student_id_number'],
                'name' => $row['name'],
                'course' => $row['course'],
                'year_level' => (int) $row['year_level'],
                'status' => $row['status'] ?? null,
            ];
        }
        $studentsResult->free();
    }

    $gradeStmt = $conn->prepare('SELECT sg.id AS grade_id, subj.code AS subject_code, sg.remark, sg.grade
                                      FROM student_grades sg
                                      INNER JOIN subjects subj ON subj.id = sg.subject_id
                                      WHERE sg.student_user_id = ? AND sg.academic_year = ? AND sg.semester = ?');
    if (!$gradeStmt) {
        throw new Exception('Failed to prepare grade lookup statement: ' . $conn->error);
    }

    $outcomes = [];
    $promotedCount = 0;
    $heldCount = 0;
    $graduatedCount = 0;

    $advancesAcademicYear = strcasecmp($closingAcademicYear, $nextAcademicYear) !== 0;
    $gradeIdsNeedingInc = [];
    $teachingAssignmentSnapshots = 0;

    foreach ($students as $student) {
        $studentUserId = $student['user_id'];
        $gradeStmt->bind_param('iss', $studentUserId, $closingAcademicYear, $closingSemester);
        $gradeStmt->execute();
        $gradeResult = $gradeStmt->get_result();

        $gradeSummaries = [];
        $holdReasons = [];
        $hasGrades = false;
        $shouldHold = false;

        if ($gradeResult instanceof mysqli_result && $gradeResult->num_rows > 0) {
            while ($gradeRow = $gradeResult->fetch_assoc()) {
                $hasGrades = true;
                $gradeId = isset($gradeRow['grade_id']) ? (int) $gradeRow['grade_id'] : null;
                $subjectCode = $gradeRow['subject_code'] ?? null;
                $remarkValue = $gradeRow['remark'] ?? 'In Progress';
                $finalGrade = isset($gradeRow['grade']) ? (float) $gradeRow['grade'] : null;
                $gradeSummaries[] = [
                    'subjectCode' => $subjectCode,
                    'remark' => $remarkValue,
                    'grade' => $finalGrade,
                ];

                if ($subjectCode === null || $subjectCode === '') {
                    $shouldHold = true;
                    $holdReasons[] = 'Unmapped subject grade entry.';
                    continue;
                }

                $normalizedRemark = strtoupper(trim((string) $remarkValue));
                $isPassingRemark = $normalizedRemark === 'PASSED';
                $isIncompleteRemark = in_array($normalizedRemark, ['IN PROGRESS', 'FAILED', 'INCOMPLETE', 'DROPPED'], true) || $normalizedRemark === '';

                if ($finalGrade === null) {
                    if ($gradeId !== null) {
                        $gradeIdsNeedingInc[$gradeId] = true;
                    }
                    if ($normalizedRemark === '' || $normalizedRemark === 'IN PROGRESS') {
                        $remarkValue = 'INC';
                        $normalizedRemark = 'INC';
                    }
                }

                if ($finalGrade === null || !$isPassingRemark) {
                    $shouldHold = true;
                    if ($isIncompleteRemark) {
                        switch ($normalizedRemark) {
                            case 'FAILED':
                                $holdReasons[] = "Failed {$subjectCode}.";
                                break;
                            case 'IN PROGRESS':
                                $holdReasons[] = "In progress: {$subjectCode}.";
                                break;
                            case 'INCOMPLETE':
                                $holdReasons[] = "Incomplete: {$subjectCode}.";
                                break;
                            case 'INC':
                                $holdReasons[] = "Incomplete: {$subjectCode}.";
                                break;
                            case 'DROPPED':
                                $holdReasons[] = "Dropped: {$subjectCode}.";
                                break;
                            default:
                                $holdReasons[] = "Pending grade for {$subjectCode}.";
                                break;
                        }
                    } else {
                        $holdReasons[] = "No final grade for {$subjectCode}.";
                    }
                }
            }
        }

        if (!$hasGrades) {
            $shouldHold = true;
            $holdReasons[] = 'No recorded grades for the closing term.';
        }

        $currentYear = $student['year_level'];
        $currentStatus = isset($student['status']) && $student['status'] !== '' ? $student['status'] : 'New';
        $action = 'held';
        $newYearLevel = $currentYear;
        $enrollmentStatus = 'Not Enrolled';
        $promotionHoldReason = null;
        $advancedYearLevel = false;

        if ($shouldHold) {
            $heldCount++;
            $promotionHoldReason = implode(' ', $holdReasons);
        } else {
            if ($advancesAcademicYear && $currentYear >= 4) {
                $action = 'graduated';
                $newYearLevel = 4;
                $enrollmentStatus = 'Graduated';
                $graduatedCount++;
            } elseif ($advancesAcademicYear) {
                $action = 'promoted';
                $newYearLevel = min($currentYear + 1, 4);
                $advancedYearLevel = $newYearLevel > $currentYear;
                if ($advancedYearLevel) {
                    $promotedCount++;
                }
            } else {
                $action = 'promoted';
                $newYearLevel = $currentYear;
            }
        }

        if ($action !== 'held' && $action !== 'graduated') {
            $enrollmentStatus = 'Not Enrolled';
        }

        $studentStatus = $currentStatus;
        if (in_array($action, ['promoted', 'held', 'graduated'], true) && $studentStatus === 'New') {
            $studentStatus = 'Old';
        }
        if ($action === 'graduated') {
            $studentStatus = 'Old';
        }

        $outcomes[] = [
            'studentUserId' => $studentUserId,
            'studentIdNumber' => $student['student_id_number'],
            'name' => $student['name'],
            'course' => $student['course'],
            'previousYearLevel' => $currentYear,
            'newYearLevel' => $newYearLevel,
            'action' => $action,
            'enrollmentStatus' => $enrollmentStatus,
            'promotionHoldReason' => $promotionHoldReason,
            'holdReasons' => $holdReasons,
            'grades' => $gradeSummaries,
            'studentStatus' => $studentStatus,
            'advancedYearLevel' => $advancedYearLevel,
        ];
    }

    $gradeStmt->close();

    $transactionStarted = false;
    $logId = null;

    if (!$dryRun) {
        acquire_rollover_lock($conn, $lockName);
        $lockAcquired = true;
        $conn->begin_transaction();
        $transactionStarted = true;

        ensure_teaching_assignment_history_table($conn);

        if (!empty($gradeIdsNeedingInc)) {
            $gradeIds = array_map('intval', array_keys($gradeIdsNeedingInc));
            $placeholders = implode(',', array_fill(0, count($gradeIds), '?'));
            $sql = "UPDATE student_grades SET remark = 'INC' WHERE grade IS NULL AND id IN ({$placeholders})";
            $stmt = $conn->prepare($sql);
            if (!$stmt) {
                throw new Exception('Failed to prepare incomplete grade update statement: ' . $conn->error);
            }
            $types = str_repeat('i', count($gradeIds));
            $stmt->bind_param($types, ...$gradeIds);
            if (!$stmt->execute()) {
                $error = $stmt->error;
                $stmt->close();
                throw new Exception('Failed to mark incomplete grades: ' . $error);
            }
            $stmt->close();
        }

        $profileUpdateStmt = $conn->prepare('UPDATE student_profiles SET year_level = ?, enrollment_status = ?, promotion_hold_reason = ?, status = ?, block_id = NULL WHERE user_id = ?');
        if (!$profileUpdateStmt) {
            throw new Exception('Failed to prepare student profile update statement: ' . $conn->error);
        }

        $historyInsertStmt = $conn->prepare('INSERT INTO student_enrollment_history (student_user_id, academic_year, semester, status, notes) VALUES (?, ?, ?, ?, ?)');
        if (!$historyInsertStmt) {
            throw new Exception('Failed to prepare enrollment history insert statement: ' . $conn->error);
        }

        foreach ($outcomes as $outcome) {
            $studentUserId = (int) $outcome['studentUserId'];
            $newYearLevel = (int) $outcome['newYearLevel'];
            $enrollmentStatus = $outcome['enrollmentStatus'];
            $promotionHoldReason = $outcome['promotionHoldReason'];
            $studentStatus = $outcome['studentStatus'];

            $profileUpdateStmt->bind_param('isssi', $newYearLevel, $enrollmentStatus, $promotionHoldReason, $studentStatus, $studentUserId);
            if (!$profileUpdateStmt->execute()) {
                throw new Exception('Failed to update student profile: ' . $profileUpdateStmt->error);
            }

            $historyStatus = 'Pending';
            if ($outcome['action'] === 'held') {
                $historyStatus = 'Hold';
            } elseif ($outcome['action'] === 'graduated') {
                $historyStatus = 'Graduated';
            }

            $historyNotes = $outcome['promotionHoldReason'] ?? '';
            if ($historyStatus === 'Pending') {
                if ($outcome['newYearLevel'] > $outcome['previousYearLevel']) {
                    $historyNotes = sprintf('Promoted from year %d to %d. Awaiting enrollment for %s %s.', $outcome['previousYearLevel'], $outcome['newYearLevel'], $nextAcademicYear, $nextSemester);
                } else {
                    $historyNotes = sprintf('Continuing in year %d for %s %s.', $outcome['previousYearLevel'], $nextAcademicYear, $nextSemester);
                }
            } elseif ($historyStatus === 'Graduated') {
                $historyNotes = 'Student marked as graduated after completing required subjects.';
            } elseif ($historyNotes === '') {
                $historyNotes = 'Held for manual review.';
            }

            $historyInsertStmt->bind_param('issss', $studentUserId, $nextAcademicYear, $nextSemester, $historyStatus, $historyNotes);
            if (!$historyInsertStmt->execute()) {
                throw new Exception('Failed to record enrollment history: ' . $historyInsertStmt->error);
            }
        }

        $profileUpdateStmt->close();
        $historyInsertStmt->close();

        $logNotes = trim($notes);
        $summaryFragment = sprintf('Summary: promoted=%d, held=%d, graduated=%d.', $promotedCount, $heldCount, $graduatedCount);
        if ($logNotes !== '') {
            $logNotes = substr($logNotes, 0, 1000) . ' ' . $summaryFragment;
        } else {
            $logNotes = $summaryFragment;
        }

        $logStmt = $conn->prepare('INSERT INTO academic_rollover_logs (triggered_by_user_id, closing_academic_year, closing_semester, next_academic_year, next_semester, promoted_count, held_count, graduated_count, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        if (!$logStmt) {
            throw new Exception('Failed to prepare rollover log statement: ' . $conn->error);
        }

        $logStmt->bind_param(
            'issssiiis',
            $triggeredByUserId,
            $closingAcademicYear,
            $closingSemester,
            $nextAcademicYear,
            $nextSemester,
            $promotedCount,
            $heldCount,
            $graduatedCount,
            $logNotes
        );

        if (!$logStmt->execute()) {
            throw new Exception('Failed to persist rollover log: ' . $logStmt->error);
        }

        $logId = (int) $conn->insert_id;
        $logStmt->close();

        if ($logId > 0) {
            $actionStmt = $conn->prepare('INSERT INTO academic_rollover_actions (rollover_log_id, student_user_id, previous_year_level, new_year_level, action, reason) VALUES (?, ?, ?, ?, ?, ?)');
            if (!$actionStmt) {
                throw new Exception('Failed to prepare rollover actions statement: ' . $conn->error);
            }

            foreach ($outcomes as $outcome) {
                $reason = $outcome['promotionHoldReason'];
                if ($outcome['action'] === 'promoted') {
                    if ($outcome['newYearLevel'] > $outcome['previousYearLevel']) {
                        $reason = sprintf('Promoted from year %d to %d.', $outcome['previousYearLevel'], $outcome['newYearLevel']);
                    } else {
                        $reason = sprintf('Continuing in year %d for the upcoming term.', $outcome['previousYearLevel']);
                    }
                } elseif ($outcome['action'] === 'graduated') {
                    $reason = 'Completed program requirements.';
                }

                $actionStmt->bind_param(
                    'iiiiss',
                    $logId,
                    $outcome['studentUserId'],
                    $outcome['previousYearLevel'],
                    $outcome['newYearLevel'],
                    $outcome['action'],
                    $reason
                );

                if (!$actionStmt->execute()) {
                    throw new Exception('Failed to persist rollover action: ' . $actionStmt->error);
                }
            }

            $actionStmt->close();
        }

        $snapshotSql = <<<SQL
INSERT INTO teaching_assignment_history (
    schedule_id,
    block_id,
    block_name,
    course,
    specialization,
    year_level,
    subject_id,
    subject_code,
    subject_description,
    units,
    day_of_week,
    start_time,
    end_time,
    room,
    instructor_user_id,
    instructor_name,
    instructor_email,
    academic_year,
    semester
)
SELECT
    sch.id,
    sch.block_id,
    COALESCE(b.name, CONCAT('Block ', sch.block_id)),
    b.course,
    b.specialization,
    b.year_level,
    sch.subject_id,
    subj.code,
    subj.description,
    subj.units,
    sch.day_of_week,
    sch.start_time,
    sch.end_time,
    sch.room,
    sch.instructor_id,
    COALESCE(ip.name, u.email, 'TBA'),
    u.email,
    ?,
    ?
FROM schedules sch
LEFT JOIN blocks b ON b.id = sch.block_id
LEFT JOIN subjects subj ON subj.id = sch.subject_id
LEFT JOIN instructor_profiles ip ON ip.user_id = sch.instructor_id
LEFT JOIN users u ON u.id = sch.instructor_id
SQL;

        $snapshotStmt = $conn->prepare($snapshotSql);
        if (!$snapshotStmt) {
            throw new Exception('Failed to prepare teaching assignment snapshot statement: ' . $conn->error);
        }

        $snapshotStmt->bind_param('ss', $closingAcademicYear, $closingSemester);
        if (!$snapshotStmt->execute()) {
            $error = $snapshotStmt->error;
            $snapshotStmt->close();
            throw new Exception('Failed to record teaching assignment history: ' . $error);
        }

        $teachingAssignmentSnapshots = max(0, $snapshotStmt->affected_rows);
        $snapshotStmt->close();

        if (!$conn->query('UPDATE student_profiles SET block_id = NULL WHERE block_id IS NOT NULL')) {
            throw new Exception('Failed to reset student block assignments: ' . $conn->error);
        }

        $resetTables = [
            'schedules' => 'DELETE FROM schedules',
            'student_subjects' => 'DELETE FROM student_subjects',
            'blocks' => 'DELETE FROM blocks',
        ];

        foreach ($resetTables as $tableName => $sql) {
            if (!$conn->query($sql)) {
                throw new Exception('Failed to reset ' . $tableName . ': ' . $conn->error);
            }
        }

        $settingsStmt = $conn->prepare('INSERT INTO system_settings (id, academic_year, semester, enrollment_start_date, enrollment_end_date, phased_schedule_json)
                                         VALUES (1, ?, ?, ?, ?, ?)
                                         ON DUPLICATE KEY UPDATE
                                             academic_year = VALUES(academic_year),
                                             semester = VALUES(semester),
                                             enrollment_start_date = VALUES(enrollment_start_date),
                                             enrollment_end_date = VALUES(enrollment_end_date),
                                             phased_schedule_json = VALUES(phased_schedule_json)');
        if (!$settingsStmt) {
            throw new Exception('Failed to prepare system settings update statement: ' . $conn->error);
        }

        $settingsStmt->bind_param('sssss', $nextAcademicYear, $nextSemester, $startDateValue, $endDateValue, $phasedScheduleJson);
        if (!$settingsStmt->execute()) {
            throw new Exception('Failed to update system settings: ' . $settingsStmt->error);
        }
        $settingsStmt->close();

        $conn->commit();
        $transactionStarted = false;
    }

    if ($lockAcquired) {
        release_rollover_lock($conn, $lockName);
        $lockAcquired = false;
    }

    respond(200, [
        'status' => 'success',
        'data' => [
            'dryRun' => $dryRun,
            'closingAcademicYear' => $closingAcademicYear,
            'closingSemester' => $closingSemester,
            'nextAcademicYear' => $nextAcademicYear,
            'nextSemester' => $nextSemester,
            'enrollmentStartDate' => $startDateValue,
            'enrollmentEndDate' => $endDateValue,
            'phasedSchedule' => $phasedScheduleJson !== null ? json_decode($phasedScheduleJson, true) : null,
            'logId' => $dryRun ? null : $logId,
            'summary' => [
                'totalActiveStudents' => count($students),
                'promoted' => $promotedCount,
                'held' => $heldCount,
                'graduated' => $graduatedCount,
                'teachingAssignmentsCaptured' => $teachingAssignmentSnapshots,
            ],
            'students' => $outcomes,
        ],
    ], $conn);
} catch (Throwable $e) {
    if (isset($transactionStarted) && $transactionStarted && isset($conn) && $conn instanceof mysqli) {
        $conn->rollback();
    }

    if (isset($lockAcquired) && $lockAcquired && isset($conn) && $conn instanceof mysqli) {
        release_rollover_lock($conn, $lockName);
    }

    respond(500, [
        'status' => 'error',
        'message' => $e->getMessage(),
    ], isset($conn) ? $conn : null);
}
