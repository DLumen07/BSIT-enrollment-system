<?php
require_once 'db_config.php';

header('Content-Type: text/html; charset=UTF-8');

function respond_with_error(string $message): void {
    echo '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Enrollment Report</title>';
    echo '<style>body{font-family:Arial,Helvetica,sans-serif;background:#f8f9fa;margin:0;padding:48px;}';
    echo '.error{max-width:720px;margin:120px auto;padding:32px;border-radius:12px;background:#fff;border:1px solid #e5e7eb;color:#b91c1c;font-size:16px;line-height:1.5;text-align:center;}';
    echo '.error strong{display:block;margin-bottom:8px;font-size:18px;}';
    echo '</style></head><body><div class="error"><strong>Unable to generate report</strong>' . htmlspecialchars($message, ENT_QUOTES, 'UTF-8') . '</div></body></html>';
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
    return strtolower($trimmed) === 'irregular' ? 'Irregular' : 'Regular';
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

function map_semester_label(string $value): string {
    $normalized = strtolower(trim($value));
    switch ($normalized) {
        case "1st-sem":
        case "first":
        case "1st":
            return '1st Semester';
        case "2nd-sem":
        case "second":
        case "2nd":
            return '2nd Semester';
        case "summer":
            return 'Summer Term';
        default:
            return ucfirst($value);
    }
}

function format_currency(float $value): string {
    return '₱' . number_format($value, 2, '.', ',');
}

function find_logo_assets(): array {
    $sets = [
        'ascot' => ['ascot-logo.png', 'ascot-logo.jpg', 'ascot-logo.jpeg'],
        'bsit' => ['bsit-logo.png', 'bsit-logo.jpg', 'bsit-logo.jpeg', 'BSIT LOGO.png', 'BSIT LOGO.jpg'],
    ];
    $found = [];
    foreach ($sets as $key => $candidates) {
        foreach ($candidates as $filename) {
            $fullPath = __DIR__ . '/assets/' . $filename;
            if (file_exists($fullPath)) {
                $found[$key] = 'assets/' . $filename;
                break;
            }
        }
    }
    return $found;
}

$academicYearParam = trim((string) ($_GET['academic_year'] ?? ''));
$semesterParam = trim((string) ($_GET['semester'] ?? ''));

$unifastFeeItems = [
    ['description' => 'Tuition Fee', 'amount' => 2100.00],
    ['description' => 'Information Technology Fee', 'amount' => 400.00],
    ['description' => 'Laboratory Fee - Computer', 'amount' => 400.00],
    ['description' => 'Athletics Fee', 'amount' => 50.00],
    ['description' => 'Cultural Fee', 'amount' => 50.00],
    ['description' => 'Guidance Fee', 'amount' => 10.00],
    ['description' => 'Higher Education Modernization Fee', 'amount' => 100.00],
    ['description' => 'Insurance Fee', 'amount' => 20.00],
    ['description' => 'Library Fee', 'amount' => 50.00],
    ['description' => 'Medical and Dental Fee', 'amount' => 50.00],
    ['description' => 'Registration Fee', 'amount' => 100.00],
    ['description' => 'School Paper Fee', 'amount' => 40.00],
    ['description' => 'SCUAA Fee', 'amount' => 50.00],
    ['description' => 'Student Council Fee', 'amount' => 60.00],
];

try {
    if (!isset($conn) || !$conn instanceof mysqli) {
        throw new RuntimeException('Database connection is unavailable.');
    }

    $conn->set_charset('utf8mb4');

    $settingsRow = null;
    $settingsResult = $conn->query('SELECT academic_year, semester FROM system_settings ORDER BY id DESC LIMIT 1');
    if ($settingsResult instanceof mysqli_result) {
        $settingsRow = $settingsResult->fetch_assoc();
        $settingsResult->free();
    }

    $currentAcademicYear = isset($settingsRow['academic_year']) && $settingsRow['academic_year'] !== ''
        ? (string) $settingsRow['academic_year']
        : sprintf('%d-%d', (int) date('Y'), (int) date('Y') + 1);
    $currentSemester = isset($settingsRow['semester']) && $settingsRow['semester'] !== ''
        ? (string) $settingsRow['semester']
        : '1st-sem';

    $academicYear = $academicYearParam !== '' ? $academicYearParam : $currentAcademicYear;
    $semester = $semesterParam !== '' ? $semesterParam : $currentSemester;

    if ($academicYear === '') {
        respond_with_error('Academic year is required.');
        $conn->close();
        exit;
    }

    if ($semester === '') {
        respond_with_error('Semester is required.');
        $conn->close();
        exit;
    }

    $semesterLabel = map_semester_label($semester);
    $generatedOn = date('M d, Y h:i A');
    $logos = find_logo_assets();
    $ascotLogo = $logos['ascot'] ?? null;
    $bsitLogo = $logos['bsit'] ?? null;
    $headerTermText = sprintf('ACADEMIC YEAR %s · %s', strtoupper($academicYear), strtoupper($semesterLabel));

    $summary = [
        'totalStudents' => 0,
        'totalEnrollees' => 0,
        'newStudents' => 0,
        'oldStudents' => 0,
        'transferees' => 0,
        'onHoldStudents' => 0,
        'notEnrolledStudents' => 0,
        'graduatedStudents' => 0,
    ];

    $yearLevelCounts = [];
    $masterListMap = [];

    $ingestRecord = static function (array $record) use (&$summary, &$yearLevelCounts, &$masterListMap): void {
        $enrollmentStatus = normalize_status_label($record['enrollment_status'] ?? '');
        if ($enrollmentStatus === '') {
            return;
        }

        $summary['totalStudents']++;

        switch ($enrollmentStatus) {
            case 'Enrolled':
                $summary['totalEnrollees']++;
                $profileStatus = normalize_status_label($record['profile_status'] ?? '');
                if ($profileStatus === '') {
                    $profileStatus = 'Old';
                }
                switch ($profileStatus) {
                    case 'New':
                        $summary['newStudents']++;
                        break;
                    case 'Transferee':
                        $summary['transferees']++;
                        break;
                    default:
                        $summary['oldStudents']++;
                        break;
                }

                $yearLevel = isset($record['year_level']) ? (int) $record['year_level'] : 0;
                $yearLevelCounts[$yearLevel] = ($yearLevelCounts[$yearLevel] ?? 0) + 1;

                $studentId = trim((string) ($record['student_id_number'] ?? ''));
                $mapKey = $studentId !== '' ? $studentId : spl_object_hash((object) $record);
                $studentName = trim((string) ($record['student_name'] ?? ''));
                if ($studentName === '') {
                    $studentName = 'Unnamed Student';
                }
                $course = trim((string) ($record['course'] ?? ''));
                $enrollmentTrack = $record['enrollment_track'] ?? '';
                $masterListMap[$mapKey] = [
                    'id' => $studentId !== '' ? $studentId : 'N/A',
                    'name' => $studentName,
                    'course' => $course,
                    'year' => $yearLevel,
                    'block' => trim((string) ($record['block_name'] ?? '')),
                    'email' => trim((string) ($record['email'] ?? '')),
                    'profileStatus' => $profileStatus,
                    'profileStatusDisplay' => compose_profile_status_display($profileStatus, $enrollmentTrack),
                    'enrollmentStatus' => $enrollmentStatus,
                ];
                break;
            case 'Hold':
                $summary['onHoldStudents']++;
                break;
            case 'Not Enrolled':
                $summary['notEnrolledStudents']++;
                break;
            case 'Graduated':
                $summary['graduatedStudents']++;
                break;
            default:
                break;
        }
    };

    $historySql = <<<SQL
SELECT
    seh.student_user_id,
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
    SELECT student_user_id, MAX(id) AS latest_id
    FROM student_enrollment_history
    WHERE academic_year = ? AND semester = ?
    GROUP BY student_user_id
) latest ON latest.latest_id = seh.id
INNER JOIN student_profiles sp ON sp.user_id = seh.student_user_id
INNER JOIN users u ON u.id = sp.user_id
LEFT JOIN blocks b ON b.id = sp.block_id
WHERE seh.academic_year = ? AND seh.semester = ?
ORDER BY sp.name ASC
SQL;

    $historyStmt = $conn->prepare($historySql);
    if (!$historyStmt) {
        throw new RuntimeException('Failed to prepare enrollment history query: ' . $conn->error);
    }
    $historyStmt->bind_param('ssss', $academicYear, $semester, $academicYear, $semester);
    $historyStmt->execute();
    $historyResult = $historyStmt->get_result();
    if ($historyResult instanceof mysqli_result) {
        while ($row = $historyResult->fetch_assoc()) {
            $ingestRecord($row);
        }
        $historyResult->free();
    }
    $historyStmt->close();

    $currentTermStatusMap = [];
    $statusSql = <<<SQL
SELECT seh.student_user_id, seh.status
FROM student_enrollment_history seh
INNER JOIN (
    SELECT student_user_id, MAX(id) AS latest_id
    FROM student_enrollment_history
    WHERE academic_year = ? AND semester = ?
    GROUP BY student_user_id
) latest ON latest.latest_id = seh.id
SQL;
    $statusStmt = $conn->prepare($statusSql);
    if ($statusStmt) {
        $statusStmt->bind_param('ss', $academicYear, $semester);
        if ($statusStmt->execute()) {
            $statusResult = $statusStmt->get_result();
            if ($statusResult instanceof mysqli_result) {
                while ($statusRow = $statusResult->fetch_assoc()) {
                    $studentUserId = isset($statusRow['student_user_id']) ? (int) $statusRow['student_user_id'] : 0;
                    if ($studentUserId > 0) {
                        $currentTermStatusMap[$studentUserId] = $statusRow['status'] ?? '';
                    }
                }
                $statusResult->free();
            }
        }
        $statusStmt->close();
    }

    $studentsRoster = [];
    $studentsSql = 'SELECT sp.user_id, sp.student_id_number, sp.name AS student_name, sp.course, sp.year_level, sp.status AS profile_status, sp.enrollment_track, sp.enrollment_status, sp.promotion_hold_reason, b.name AS block_name, u.email FROM student_profiles sp INNER JOIN users u ON u.id = sp.user_id LEFT JOIN blocks b ON b.id = sp.block_id ORDER BY sp.name ASC';
    $studentsResult = $conn->query($studentsSql);
    if ($studentsResult instanceof mysqli_result) {
        while ($row = $studentsResult->fetch_assoc()) {
            $studentsRoster[] = $row;
        }
        $studentsResult->free();
    }

    $normalizedStudents = [];
    foreach ($studentsRoster as $studentRow) {
        $profileStatus = normalize_status_label($studentRow['profile_status'] ?? '');
        if ($profileStatus === '') {
            $profileStatus = 'Old';
        }
        $enrollmentStatus = normalize_status_label($studentRow['enrollment_status'] ?? '');
        if ($enrollmentStatus === '') {
            $enrollmentStatus = 'Not Enrolled';
        }

        $normalizedStudents[] = [
            'userId' => isset($studentRow['user_id']) ? (int) $studentRow['user_id'] : 0,
            'studentId' => $studentRow['student_id_number'] ?? '',
            'name' => $studentRow['student_name'] ?? '',
            'course' => $studentRow['course'] ?? '',
            'year' => isset($studentRow['year_level']) ? (int) $studentRow['year_level'] : 0,
            'status' => $enrollmentStatus,
            'profileStatus' => $profileStatus,
            'enrollmentTrack' => normalize_enrollment_track($studentRow['enrollment_track'] ?? ''),
            'block' => $studentRow['block_name'] ?? null,
            'email' => $studentRow['email'] ?? null,
            'promotionHoldReason' => $studentRow['promotion_hold_reason'] ?? null,
            'currentTermStatus' => $currentTermStatusMap[$studentRow['user_id']] ?? null,
        ];
    }

    $totalStudentsCount = count($normalizedStudents);
    $enrolledStudents = array_values(array_filter($normalizedStudents, static function (array $student): bool {
        return $student['status'] === 'Enrolled';
    }));

    $newStudentsCount = count(array_filter($enrolledStudents, static function (array $student): bool {
        return $student['profileStatus'] === 'New';
    }));
    $oldStudentsCount = count(array_filter($enrolledStudents, static function (array $student): bool {
        return $student['profileStatus'] === 'Old';
    }));
    $transfereeCount = count(array_filter($enrolledStudents, static function (array $student): bool {
        return $student['profileStatus'] === 'Transferee';
    }));

    $onHoldCount = count(array_filter($normalizedStudents, static function (array $student): bool {
        $termStatus = strtolower(trim((string) ($student['currentTermStatus'] ?? '')));
        if ($termStatus !== '' && strpos($termStatus, 'hold') !== false) {
            return true;
        }
        return !empty($student['promotionHoldReason']);
    }));

    $notEnrolledCount = count(array_filter($normalizedStudents, static function (array $student): bool {
        return $student['status'] === 'Not Enrolled';
    }));

    $graduatedCount = count(array_filter($normalizedStudents, static function (array $student): bool {
        return $student['status'] === 'Graduated';
    }));

    $summary = [
        'totalStudents' => $totalStudentsCount,
        'totalEnrollees' => count($enrolledStudents),
        'newStudents' => $newStudentsCount,
        'oldStudents' => $oldStudentsCount,
        'transferees' => $transfereeCount,
        'onHoldStudents' => $onHoldCount,
        'notEnrolledStudents' => $notEnrolledCount,
        'graduatedStudents' => $graduatedCount,
    ];

    $perStudentAssessment = 0.00;
    foreach ($unifastFeeItems as $feeItem) {
        $perStudentAssessment += (float) ($feeItem['amount'] ?? 0);
    }
    $totalProjectedCoverage = $perStudentAssessment * ($summary['totalEnrollees'] ?? 0);
    $unifastFeeSummaryText = implode(', ', array_map(static function ($item): string {
        return (string) ($item['description'] ?? '');
    }, $unifastFeeItems));

    $yearLevelCounts = [];
    foreach ($enrolledStudents as $student) {
        $level = $student['year'];
        $yearLevelCounts[$level] = ($yearLevelCounts[$level] ?? 0) + 1;
    }

    $yearLevelDistribution = [];
    $totalYearLevelStudents = 0;
    $maxYearLevelCount = 0;
    if (!empty($yearLevelCounts)) {
        ksort($yearLevelCounts, SORT_NUMERIC);
        foreach ($yearLevelCounts as $level => $count) {
            $yearLevelDistribution[] = [
                'label' => format_year_level_label((int) $level),
                'students' => (int) $count,
            ];
            $totalYearLevelStudents += (int) $count;
            if ((int) $count > $maxYearLevelCount) {
                $maxYearLevelCount = (int) $count;
            }
        }
    }
    $yearChartSegments = $yearLevelDistribution;
    $chartLabels = array_map(static function (array $segment): string {
        return $segment['label'];
    }, $yearChartSegments);
    $chartValues = array_map(static function (array $segment): int {
        return (int) $segment['students'];
    }, $yearChartSegments);
    $jsonOptions = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT;
    $chartLabelsJson = json_encode($chartLabels, $jsonOptions);
    if ($chartLabelsJson === false) {
        $chartLabelsJson = '[]';
    }
    $chartValuesJson = json_encode($chartValues, $jsonOptions);
    if ($chartValuesJson === false) {
        $chartValuesJson = '[]';
    }
    $chartYAxisStep = $maxYearLevelCount > 0 ? max(1, (int) ceil($maxYearLevelCount / 4)) : 1;

    $masterList = array_map(static function (array $student): array {
        return [
            'id' => $student['studentId'] !== '' ? $student['studentId'] : 'N/A',
            'name' => $student['name'],
            'course' => $student['course'],
            'year' => $student['year'],
            'profileStatus' => compose_profile_status_display($student['profileStatus'], $student['enrollmentTrack']),
            'block' => $student['block'],
            'email' => $student['email'],
            'enrollmentStatus' => 'Enrolled',
        ];
    }, $enrolledStudents);

    if (!empty($masterList)) {
        usort($masterList, static function (array $a, array $b): int {
            return strcasecmp($a['name'], $b['name']);
        });
    }

    $masterListByBlock = [];
    foreach ($masterList as $entry) {
        $blockName = trim((string) ($entry['block'] ?? ''));
        $blockLabel = $blockName !== '' ? $blockName : 'Unassigned Block';
        $masterListByBlock[$blockLabel][] = $entry;
    }
    if (!empty($masterListByBlock)) {
        ksort($masterListByBlock, SORT_NATURAL | SORT_FLAG_CASE);
    }

    ob_start();
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <title>Official Enrollment Report — <?= htmlspecialchars($academicYear, ENT_QUOTES, 'UTF-8') ?></title>
        <style>
            @page { margin: 24mm 20mm; }
            * { box-sizing: border-box; }
            body {
                font-family: 'Times New Roman', 'Segoe UI', Arial, sans-serif;
                background: #ffffff;
                color: #000000;
                margin: 0;
                padding: 0;
                font-size: 13px;
                line-height: 1.45;
            }
            .report-sheet {
                max-width: 780px;
                margin: 0 auto;
                padding: 0 8px 24px;
            }
            .report-header {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 12px;
                border-bottom: 2px solid #000000;
                padding: 14px 20px;
                margin: 24px auto;
                width: 100%;
                max-width: 780px;
                text-align: center;
                position: relative;
            }
            .header-copy {
                flex: 1;
                text-align: center;
                letter-spacing: 0.9px;
                font-size: 12px;
            }
            .logo-wrapper,
            .header-spacer {
                width: 96px;
                height: 96px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            .logo-wrapper.logo-bsit {
                width: 83px;
                height: 83px;
            }
            .logo-wrapper img {
                height: 92px;
                width: auto;
                max-width: 100%;
                object-fit: contain;
                display: block;
            }
            .logo-wrapper.logo-bsit img {
                height: 80px;
            }
            .header-copy .org-line {
                margin-bottom: 2px;
            }
            .header-title {
                font-size: 18px;
                margin: 6px 0 4px;
                font-weight: 700;
                letter-spacing: 1px;
            }
            .header-term {
                font-size: 14px;
                margin: 0;
                font-weight: 600;
            }
            .meta-table,
            .summary-table,
            .data-table {
                width: 100%;
                border-collapse: collapse;
            }
            .year-chart {
                margin: 12px auto 0;
                padding: 12px 18px 16px;
                border-radius: 12px;
                background: #ffffff;
                width: 100%;
                max-width: 360px;
            }
            .year-chart-content {
                width: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 10px;
            }
            .chart-canvas-wrapper {
                position: relative;
                width: 100%;
                max-width: 320px;
                min-height: 170px;
                margin: 0 auto;
            }
            .chart-canvas-wrapper canvas {
                width: 100%;
                height: 170px;
                max-height: 190px;
                display: block;
            }
            .chart-subtitle {
                font-size: 11px;
                color: #000000;
                margin-top: 8px;
                text-align: center;
                width: 100%;
            }
            .meta-table th,
            .meta-table td {
                text-align: left;
                padding: 6px 8px;
                font-size: 13px;
                color: #000000;
            }
            .meta-table th {
                width: 18%;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.6px;
            }
            .section-title {
                font-size: 15px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.6px;
                margin: 28px 0 10px;
            }
            .summary-table td,
            .summary-table th {
                border: 1px solid #000000;
                padding: 6px 8px;
                text-align: center;
            }
            .summary-table th {
                text-transform: uppercase;
                font-size: 10px;
                letter-spacing: 0.4px;
                background: #ffffff;
            }
            .summary-table td {
                font-size: 16px;
                font-weight: 600;
            }
            .unifast-summary {
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                margin: 12px 0 14px;
                justify-content: center;
            }
            .unifast-summary-card {
                flex: 0 1 180px;
                max-width: 200px;
                border: none;
                border-radius: 0;
                padding: 6px 10px;
                background: transparent;
                text-align: center;
            }
            .unifast-summary-card .label {
                font-size: 10px;
                letter-spacing: 0.4px;
                text-transform: uppercase;
                color: #111827;
                margin-bottom: 4px;
            }
            .unifast-summary-card .value {
                font-size: 16px;
                font-weight: 700;
                color: #111827;
            }
            .unifast-narrative {
                border: none;
                border-radius: 0;
                padding: 0;
                margin-top: 6px;
                background: transparent;
                font-size: 13px;
                color: #000000;
                line-height: 1.6;
                font-weight: 500;
            }
            .unifast-note {
                font-size: 10px;
                color: #374151;
                margin-top: 6px;
            }
            .data-table th,
            .data-table td {
                border: 1px solid #000000;
                padding: 8px;
            }
            .block-section {
                margin-top: 20px;
                padding-bottom: 6px;
            }
            .block-heading {
                display: flex;
                justify-content: space-between;
                align-items: baseline;
                font-size: 14px;
                font-weight: 600;
                margin-bottom: 10px;
                border-bottom: 1px solid #000000;
                padding-bottom: 4px;
            }
            .block-heading small {
                font-size: 11px;
                font-weight: normal;
                color: #000000;
            }
            .data-table th {
                text-transform: uppercase;
                font-size: 11px;
                letter-spacing: 0.5px;
                background: #ffffff;
            }
            .empty-state {
                border: 1px dashed #000000;
                padding: 14px;
                text-align: center;
                color: #000000;
                font-style: italic;
            }
            .signature-footer {
                margin-top: 48px;
                display: flex;
                justify-content: flex-end;
            }
            .signature-line {
                text-align: center;
                min-width: 240px;
            }
            .signature-line .line {
                border-bottom: 1px solid #000000;
                margin-bottom: 6px;
                height: 28px;
            }
            .note {
                font-size: 11px;
                color: #000000;
                text-align: right;
                margin-top: 6px;
            }
            @media print {
                body { padding: 0; }
                .report-sheet { padding: 0; }
                .report-header { margin-top: 12px; }
                .block-section { page-break-inside: avoid; }
                .block-section-break { page-break-before: always; }
                .signature-footer {
                    page-break-inside: avoid;
                    padding-bottom: 18mm;
                }
            }
        </style>
    </head>
    <body>
        <div class="report-sheet">
            <header class="report-header">
                <?php if ($ascotLogo !== null): ?>
                    <div class="logo-wrapper">
                        <img src="<?= htmlspecialchars($ascotLogo, ENT_QUOTES, 'UTF-8') ?>" alt="ASCOT Logo" />
                    </div>
                <?php else: ?>
                    <div class="header-spacer"></div>
                <?php endif; ?>
                <div class="header-copy">
                    <div class="org-line">REPUBLIC OF THE PHILIPPINES</div>
                    <div class="org-line">AURORA STATE COLLEGE OF TECHNOLOGY</div>
                    <div class="org-line">OFFICE OF THE REGISTRAR</div>
                    <div class="header-title">ENROLLMENT REPORT</div>
                    <div class="header-term"><?= htmlspecialchars($headerTermText, ENT_QUOTES, 'UTF-8') ?></div>
                </div>
                <?php if ($bsitLogo !== null): ?>
                    <div class="logo-wrapper logo-bsit">
                        <img src="<?= htmlspecialchars($bsitLogo, ENT_QUOTES, 'UTF-8') ?>" alt="BSIT Logo" />
                    </div>
                <?php else: ?>
                    <div class="header-spacer"></div>
                <?php endif; ?>
            </header>

            <table class="meta-table">
                <tr>
                    <th>Academic Year</th>
                    <td><?= htmlspecialchars($academicYear, ENT_QUOTES, 'UTF-8') ?></td>
                    <th>Generated On</th>
                    <td><?= htmlspecialchars($generatedOn, ENT_QUOTES, 'UTF-8') ?></td>
                </tr>
                <tr>
                    <th>Semester</th>
                    <td><?= htmlspecialchars($semesterLabel, ENT_QUOTES, 'UTF-8') ?></td>
                    <th>Prepared By</th>
                    <td>Registrar's Office</td>
                </tr>
            </table>

            <p style="font-size: 13px; color: #000000; margin: 20px 0 26px; line-height: 1.6; font-weight: 500;">
                This official memorandum summarizes the verified enrollment status of Bachelor of Science in Information Technology students for
                <?= htmlspecialchars($semesterLabel, ENT_QUOTES, 'UTF-8') ?>, Academic Year <?= htmlspecialchars($academicYear, ENT_QUOTES, 'UTF-8') ?>.
                It consolidates Registrar-approved submissions to give college leadership a clear view of enrollment activity across blocks, year levels,
                and academic tracks.
            </p>

            <div class="section-title">Enrollment Summary</div>
            <?php
            $summaryOrder = [
                'totalEnrollees' => 'Total Enrollees',
                'newStudents' => 'New Students',
                'oldStudents' => 'Old Students',
                'transferees' => 'Transferees',
                'onHoldStudents' => 'On Hold',
                'graduatedStudents' => 'Graduated',
            ];
            $summaryChunks = array_chunk($summaryOrder, 3, true);
            ?>
            <table class="summary-table">
                <tbody>
                    <?php foreach ($summaryChunks as $chunk): ?>
                        <tr>
                            <?php foreach ($chunk as $key => $label): ?>
                                <th><?= htmlspecialchars($label, ENT_QUOTES, 'UTF-8') ?></th>
                                <td><?= number_format($summary[$key] ?? 0) ?></td>
                            <?php endforeach; ?>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>

            <div class="section-title">Year-Level Distribution</div>
            <?php if (empty($yearChartSegments)): ?>
                <div class="empty-state">No enrolled students recorded for the selected term.</div>
            <?php else: ?>
                <div class="year-chart">
                    <div class="year-chart-content">
                        <div class="chart-canvas-wrapper">
                            <canvas id="yearLevelChart" aria-label="Student population by year level"></canvas>
                        </div>
                        <div class="chart-subtitle">Showing student counts for <?= htmlspecialchars($academicYear, ENT_QUOTES, 'UTF-8') ?> (<?= htmlspecialchars($semesterLabel, ENT_QUOTES, 'UTF-8') ?>).</div>
                    </div>
                </div>
            <?php endif; ?>

            <div class="section-title">RA 10931 UniFAST Assessment</div>
            <?php if (($summary['totalEnrollees'] ?? 0) === 0): ?>
                <div class="empty-state">Projected UniFAST coverage data becomes available once at least one student is enrolled.</div>
            <?php else: ?>
                <div class="unifast-narrative">
                    Under RA 10931, UniFAST covers the mandatory BSIT fees—<?= htmlspecialchars($unifastFeeSummaryText, ENT_QUOTES, 'UTF-8') ?>—for this term.
                    The consolidated assessment remains <?= htmlspecialchars(format_currency($perStudentAssessment), ENT_QUOTES, 'UTF-8') ?> per qualified student,
                    resulting in approximately <?= htmlspecialchars(format_currency($totalProjectedCoverage), ENT_QUOTES, 'UTF-8') ?> in projected reimbursement for the
                    <?= number_format($summary['totalEnrollees']) ?> verified enrollees listed in this memorandum.
                </div>
                <div class="unifast-summary">
                    <div class="unifast-summary-card">
                        <div class="label">Per Student Assessment</div>
                        <div class="value"><?= htmlspecialchars(format_currency($perStudentAssessment), ENT_QUOTES, 'UTF-8') ?></div>
                    </div>
                    <div class="unifast-summary-card">
                        <div class="label">Verified Enrollees</div>
                        <div class="value"><?= number_format($summary['totalEnrollees']) ?></div>
                    </div>
                    <div class="unifast-summary-card">
                        <div class="label">Projected Coverage</div>
                        <div class="value"><?= htmlspecialchars(format_currency($totalProjectedCoverage), ENT_QUOTES, 'UTF-8') ?></div>
                    </div>
                </div>
                <div class="unifast-note">This narrative satisfies the UniFAST compliance note transmitted to CHED for billing and liquidation.</div>
            <?php endif; ?>

            <div class="section-title">Master List of Enrolled Students</div>
            <?php if (empty($masterListByBlock)): ?>
                <div class="empty-state">No enrollment records found for the selected term.</div>
            <?php else: ?>
                <?php $blockIndex = 0; ?>
                <?php foreach ($masterListByBlock as $blockLabel => $entries): ?>
                    <?php
                        $blockIndex++;
                        $sectionClasses = 'block-section';
                        if ($blockIndex > 1) {
                            $sectionClasses .= ' block-section-break';
                        }
                    ?>
                    <div class="<?= $sectionClasses ?>">
                        <div class="block-heading">
                            <span><?= htmlspecialchars($blockLabel, ENT_QUOTES, 'UTF-8') ?></span>
                        </div>
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th style="width: 16%;">Student ID</th>
                                    <th style="width: 30%;">Student Name</th>
                                    <th style="width: 26%;">Program / Year</th>
                                    <th style="width: 16%;">Profile Status</th>
                                    <th style="width: 12%;">Enrollment</th>
                                </tr>
                            </thead>
                            <tbody>
                                <?php foreach ($entries as $entry): ?>
                                    <tr>
                                        <td><?= htmlspecialchars($entry['id'], ENT_QUOTES, 'UTF-8') ?></td>
                                        <td>
                                            <div><?= htmlspecialchars($entry['name'], ENT_QUOTES, 'UTF-8') ?></div>
                                        </td>
                                        <td>
                                            <?php
                                                $courseLabel = trim((string) ($entry['course'] ?? ''));
                                                if ($courseLabel === '') {
                                                    $courseLabel = 'N/A';
                                                }
                                                $yearLabel = (int) $entry['year'] > 0
                                                    ? format_year_level_label((int) $entry['year'])
                                                    : 'Unassigned';
                                            ?>
                                            <?= htmlspecialchars($courseLabel . ' / ' . $yearLabel, ENT_QUOTES, 'UTF-8') ?>
                                        </td>
                                        <td><?= htmlspecialchars($entry['profileStatus'], ENT_QUOTES, 'UTF-8') ?></td>
                                        <td><?= htmlspecialchars($entry['enrollmentStatus'], ENT_QUOTES, 'UTF-8') ?></td>
                                    </tr>
                                <?php endforeach; ?>
                            </tbody>
                        </table>
                    </div>
                <?php endforeach; ?>
                <div class="note">Total enrolled students listed: <?= number_format(count($masterList)) ?></div>
            <?php endif; ?>

            <footer class="signature-footer">
                <div class="signature-line">
                    <div class="line"></div>
                    <div>Registrar / Authorized Signatory</div>
                </div>
            </footer>
        </div>
        <?php if (!empty($yearChartSegments)): ?>
            <script>
                (function () {
                    var labels = <?= $chartLabelsJson ?>;
                    var values = <?= $chartValuesJson ?>;
                    var yAxisStep = <?= $chartYAxisStep ?>;
                    var maxValue = <?= max($maxYearLevelCount, 1) ?>;
                    var colorPalette = ['#f97316', '#2563eb', '#0ea5e9', '#ea580c', '#facc15'];

                    function renderYearLevelChart() {
                        var canvas = document.getElementById('yearLevelChart');
                        if (!canvas || !canvas.getContext || !Array.isArray(labels) || labels.length === 0) {
                            return;
                        }

                        var ctx = canvas.getContext('2d');
                        var deviceRatio = window.devicePixelRatio || 1;
                        var cssWidth = canvas.clientWidth || 300;
                        var cssHeight = 200;
                        canvas.width = cssWidth * deviceRatio;
                        canvas.height = cssHeight * deviceRatio;
                        canvas.style.width = cssWidth + 'px';
                        canvas.style.height = cssHeight + 'px';
                        ctx.scale(deviceRatio, deviceRatio);
                        ctx.clearRect(0, 0, cssWidth, cssHeight);

                        var padding = { top: 12, right: 18, bottom: 36, left: 42 };
                        var chartWidth = cssWidth - padding.left - padding.right;
                        var chartHeight = cssHeight - padding.top - padding.bottom;
                        if (chartWidth <= 0 || chartHeight <= 0) {
                            return;
                        }

                        ctx.lineWidth = 1;
                        ctx.strokeStyle = '#0f172a';
                        ctx.fillStyle = '#0f172a';
                        ctx.font = '10px "Segoe UI", Arial, sans-serif';

                        var gridCount = Math.floor(maxValue / yAxisStep) + 1;
                        var gridValues = [];
                        for (var i = 0; i <= gridCount; i++) {
                            var value = i * yAxisStep;
                            if (value > maxValue) {
                                value = maxValue;
                            }
                            if (gridValues.length === 0 || value !== gridValues[gridValues.length - 1]) {
                                gridValues.push(value);
                            }
                        }
                        if (gridValues[gridValues.length - 1] !== maxValue) {
                            gridValues.push(maxValue);
                        }

                        gridValues.forEach(function (value) {
                            var y = padding.top + chartHeight - (value / maxValue) * chartHeight;
                            ctx.beginPath();
                            ctx.moveTo(padding.left, y);
                            ctx.lineTo(padding.left + chartWidth, y);
                            ctx.strokeStyle = value === 0 ? '#0f172a' : 'rgba(15, 23, 42, 0.18)';
                            ctx.setLineDash(value === 0 ? [] : [3, 3]);
                            ctx.stroke();
                            ctx.setLineDash([]);
                            ctx.fillStyle = '#0f172a';
                            ctx.fillText(value.toString(), padding.left - 8 - ctx.measureText(value.toString()).width, y + 4);
                        });

                        var barAreaWidth = chartWidth / labels.length;
                        var barWidth = Math.min(36, Math.max(18, barAreaWidth * 0.45));

                        labels.forEach(function (label, index) {
                            var value = values[index] || 0;
                            var barHeight = maxValue > 0 ? (value / maxValue) * chartHeight : 0;
                            var centerX = padding.left + (index * barAreaWidth) + barAreaWidth / 2;
                            var barX = centerX - barWidth / 2;
                            var barY = padding.top + chartHeight - barHeight;

                            var barColor = colorPalette[index % colorPalette.length];
                            ctx.fillStyle = barColor;
                            ctx.beginPath();
                            var radius = Math.min(8, barWidth / 2);
                            if (typeof ctx.roundRect === 'function') {
                                ctx.roundRect(barX, barY, barWidth, barHeight, radius);
                            } else {
                                ctx.moveTo(barX, barY + barHeight);
                                ctx.lineTo(barX, barY + radius);
                                ctx.quadraticCurveTo(barX, barY, barX + radius, barY);
                                ctx.lineTo(barX + barWidth - radius, barY);
                                ctx.quadraticCurveTo(barX + barWidth, barY, barX + barWidth, barY + radius);
                                ctx.lineTo(barX + barWidth, barY + barHeight);
                                ctx.closePath();
                            }
                            ctx.fill();

                            ctx.fillStyle = '#0f172a';
                            ctx.font = '11px "Segoe UI", Arial, sans-serif';
                            var valueText = value.toLocaleString();
                            ctx.fillText(valueText, centerX - ctx.measureText(valueText).width / 2, barY - 6);

                            ctx.fillStyle = '#0f172a';
                            ctx.font = '10px "Segoe UI", Arial, sans-serif';
                            wrapLabel(ctx, label, centerX, padding.top + chartHeight + 6, barAreaWidth - 4);
                        });
                    }

                    function wrapLabel(ctx, text, centerX, baselineY, maxWidth) {
                        var words = text.split(' ');
                        var line = '';
                        var lineHeight = 12;
                        var drawY = baselineY;
                        for (var i = 0; i < words.length; i++) {
                            var testLine = line ? line + ' ' + words[i] : words[i];
                            if (ctx.measureText(testLine).width > maxWidth && line) {
                                ctx.fillText(line, centerX - ctx.measureText(line).width / 2, drawY);
                                line = words[i];
                                drawY += lineHeight;
                            } else {
                                line = testLine;
                            }
                        }
                        if (line) {
                            ctx.fillText(line, centerX - ctx.measureText(line).width / 2, drawY);
                        }
                    }

                    if (document.readyState === 'complete') {
                        renderYearLevelChart();
                    } else {
                        window.addEventListener('load', renderYearLevelChart, { once: true });
                    }
                })();
            </script>
        <?php endif; ?>
        <script>
            window.addEventListener('load', function () {
                var printDelay = <?= !empty($yearChartSegments) ? 500 : 250 ?>;
                setTimeout(function () {
                    window.print();
                }, printDelay);
            });
        </script>
    </body>
    </html>
    <?php
    echo ob_get_clean();
} catch (Throwable $e) {
    respond_with_error('An unexpected error occurred while preparing the report. ' . $e->getMessage());
} finally {
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
?>
