<?php
require_once 'db_config.php';

header('Content-Type: text/html; charset=UTF-8');

$emailParam = trim((string) ($_GET['email'] ?? ''));
$studentIdParam = trim((string) ($_GET['student_id'] ?? ''));

function respondWithError(string $message): void {
    echo '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Registration Form</title>';
    echo '<style>body{font-family:Arial,Helvetica,sans-serif;background:#f8f9fa;margin:0;padding:48px;}';
    echo '.error{max-width:720px;margin:120px auto;padding:32px;border-radius:12px;background:#fff;border:1px solid #e5e7eb;color:#b91c1c;font-size:16px;line-height:1.5;text-align:center;}';
    echo '.error strong{display:block;margin-bottom:8px;font-size:18px;}';
    echo '</style></head><body><div class="error"><strong>Unable to render form</strong>' . htmlspecialchars($message, ENT_QUOTES, 'UTF-8') . '</div></body></html>';
}

function mapYearLevelLabel(int $level): string {
    switch ($level) {
        case 1:
            return '1st Year';
        case 2:
            return '2nd Year';
        case 3:
            return '3rd Year';
        case 4:
            return '4th Year';
        default:
            return $level > 0 ? $level . 'th Year' : '';
    }
}

function mapSemesterLabel(string $value): string {
    $trimmed = strtolower(trim($value));
    if ($trimmed === '1st-sem' || $trimmed === 'first' || $trimmed === '1st') {
        return '1st Semester';
    }
    if ($trimmed === '2nd-sem' || $trimmed === 'second' || $trimmed === '2nd') {
        return '2nd Semester';
    }
    if ($trimmed === 'summer') {
        return 'Summer Term';
    }
    return '';
}

function mapSemesterShort(string $value): string {
    $trimmed = strtolower(trim($value));
    if ($trimmed === '2nd-sem' || $trimmed === 'second' || $trimmed === '2nd') {
        return '2';
    }
    if ($trimmed === 'summer') {
        return 'SU';
    }
    return '1';
}

function abbreviateWords(string $value): string {
    $trimmed = trim($value);
    if ($trimmed === '') {
        return '';
    }

    $noSpaces = preg_replace('/\s+/', '', $trimmed);
    if (strpos($trimmed, ' ') === false && strlen($noSpaces) <= 6) {
        return strtoupper($noSpaces);
    }

    $stopWords = ['of', 'in', 'and', 'the', 'for', 'with'];
    $parts = preg_split('/\s+/', $trimmed);
    $initials = '';
    foreach ($parts as $part) {
        $normalized = strtolower($part);
        if ($normalized === '' || in_array($normalized, $stopWords, true)) {
            continue;
        }
        $initials .= strtoupper(substr($normalized, 0, 1));
    }
    return $initials;
}

function renderUnderline(?string $value): string {
    $trimmed = trim((string) $value);
    if ($trimmed === '') {
        return '<span class="field-underline">&nbsp;</span>';
    }
    return '<span class="field-underline">' . htmlspecialchars($trimmed, ENT_QUOTES, 'UTF-8') . '</span>';
}

function formatAmount(float $value): string {
    return number_format($value, 2, '.', ',');
}

function renderPlain(?string $value, string $fallback = 'N/A'): string {
    $trimmed = trim((string) $value);
    if ($trimmed === '') {
        return $fallback;
    }
    return htmlspecialchars($trimmed, ENT_QUOTES, 'UTF-8');
}

function renderMultiline(array $values): string {
    $filtered = [];
    foreach ($values as $value) {
        $trimmed = trim((string) $value);
        if ($trimmed === '') {
            continue;
        }
        $filtered[] = htmlspecialchars($trimmed, ENT_QUOTES, 'UTF-8');
    }
    if (empty($filtered)) {
        return 'TBA';
    }
    return implode('<br />', $filtered);
}

function renderStatusOptions(string $currentStatus): string {
    $options = ['New', 'Old', 'Transferee', 'Cross Enrollee', 'Foreigner'];
    $normalized = strtolower(trim($currentStatus));
    $segments = [];
    foreach ($options as $option) {
        $segments[] = $option . (strtolower($option) === $normalized ? ' [x]' : ' [ ]');
    }
    return implode(' ', $segments);
}

function formatSchoolLine(?string $school, ?string $year): string {
    $schoolTrimmed = trim((string) $school);
    $yearTrimmed = trim((string) $year);
    if ($schoolTrimmed === '' && $yearTrimmed === '') {
        return 'N/A';
    }
    if ($schoolTrimmed !== '' && $yearTrimmed !== '') {
        return htmlspecialchars($schoolTrimmed, ENT_QUOTES, 'UTF-8') . ' (' . htmlspecialchars($yearTrimmed, ENT_QUOTES, 'UTF-8') . ')';
    }
    if ($schoolTrimmed !== '') {
        return htmlspecialchars($schoolTrimmed, ENT_QUOTES, 'UTF-8');
    }
    return htmlspecialchars($yearTrimmed, ENT_QUOTES, 'UTF-8');
}

if ($emailParam === '' && $studentIdParam === '') {
    respondWithError('Missing student identifier. Please include an "email" or "student_id" query parameter.');
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
    exit;
}

try {
    if (!isset($conn) || !$conn instanceof mysqli) {
        throw new RuntimeException('Database connection is unavailable.');
    }

    $conn->set_charset('utf8mb4');

    $studentSql = 'SELECT sp.*, u.email AS account_email, b.name AS block_name
                   FROM student_profiles sp
                   INNER JOIN users u ON u.id = sp.user_id
                   LEFT JOIN blocks b ON b.id = sp.block_id
                   WHERE ' . ($emailParam !== '' ? 'u.email = ?' : 'sp.student_id_number = ?') . '
                   LIMIT 1';

    $studentStmt = $conn->prepare($studentSql);
    if (!$studentStmt) {
        throw new RuntimeException('Failed to prepare student lookup query: ' . $conn->error);
    }

    $lookupValue = $emailParam !== '' ? $emailParam : $studentIdParam;
    $studentStmt->bind_param('s', $lookupValue);
    $studentStmt->execute();
    $studentResult = $studentStmt->get_result();

    if (!$studentResult || $studentResult->num_rows === 0) {
        $studentStmt->close();
        respondWithError('Student record not found.');
        if ($conn instanceof mysqli) {
            $conn->close();
        }
        exit;
    }

    $studentRow = $studentResult->fetch_assoc();
    $studentStmt->close();

    $studentUserId = (int) ($studentRow['user_id'] ?? 0);
    $blockId = isset($studentRow['block_id']) ? (int) $studentRow['block_id'] : null;

    $settingsRow = null;
    if ($settingsResult = $conn->query('SELECT academic_year, semester FROM system_settings ORDER BY id DESC LIMIT 1')) {
        $settingsRow = $settingsResult->fetch_assoc();
        $settingsResult->free();
    }

    $academicYear = isset($settingsRow['academic_year']) && trim((string) $settingsRow['academic_year']) !== ''
        ? trim((string) $settingsRow['academic_year'])
        : sprintf('%d-%d', (int) date('Y'), (int) date('Y') + 1);
    $semesterValue = isset($settingsRow['semester']) ? (string) $settingsRow['semester'] : '';
    $semesterLabel = mapSemesterLabel($semesterValue);

    $subjects = [];
    $subjectsSql = 'SELECT subj.code, subj.description, subj.units, subj.semester
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
                'code' => trim((string) ($row['code'] ?? '')),
                'description' => trim((string) ($row['description'] ?? '')),
                'units' => isset($row['units']) ? (int) $row['units'] : 0,
                'semester' => trim((string) ($row['semester'] ?? '')),
            ];
        }
        $subjectsStmt->close();
    }

    if ($semesterLabel === '' && !empty($subjects)) {
        $semesterLabel = mapSemesterLabel($subjects[0]['semester'] ?? '');
    }
    if ($semesterLabel === '') {
        $semesterLabel = '1st Semester';
    }

    $subjectScheduleMap = [];
    $subjectInstructorMap = [];
    if ($blockId !== null && $blockId > 0) {
        $scheduleSql = "SELECT subj.code, sch.day_of_week, 
                                DATE_FORMAT(sch.start_time, '%h:%i %p') AS start_time,
                                DATE_FORMAT(sch.end_time, '%h:%i %p') AS end_time,
                                IFNULL(ip.name, 'TBA') AS instructor_name,
                                IFNULL(sch.room, 'TBA') AS room
                         FROM schedules sch
                         INNER JOIN subjects subj ON subj.id = sch.subject_id
                         LEFT JOIN instructor_profiles ip ON ip.user_id = sch.instructor_id
                         WHERE sch.block_id = ?
                         ORDER BY subj.code, sch.day_of_week, sch.start_time";
        $scheduleStmt = $conn->prepare($scheduleSql);
        if ($scheduleStmt) {
            $scheduleStmt->bind_param('i', $blockId);
            $scheduleStmt->execute();
            $scheduleResult = $scheduleStmt->get_result();
            while ($scheduleResult && ($row = $scheduleResult->fetch_assoc())) {
                $code = trim((string) ($row['code'] ?? ''));
                if ($code === '') {
                    continue;
                }
                $day = strtoupper(substr(trim((string) ($row['day_of_week'] ?? '')), 0, 3));
                $start = trim((string) ($row['start_time'] ?? ''));
                $end = trim((string) ($row['end_time'] ?? ''));
                $room = trim((string) ($row['room'] ?? ''));
                $timeRange = ($start !== '' && $end !== '') ? $start . '-' . $end : '';
                $roomValue = ($room !== '' && strtoupper($room) !== 'TBA') ? $room : '';
                if (!isset($subjectScheduleMap[$code])) {
                    $subjectScheduleMap[$code] = [];
                }
                $entryKey = implode('|', [$day, $timeRange, $roomValue]);
                if (!isset($subjectScheduleMap[$code][$entryKey])) {
                    $subjectScheduleMap[$code][$entryKey] = [
                        'day' => $day,
                        'time' => $timeRange,
                        'room' => $roomValue,
                    ];
                }
                if (!isset($subjectInstructorMap[$code]) || strtolower($subjectInstructorMap[$code]) === 'tba') {
                    $subjectInstructorMap[$code] = trim((string) ($row['instructor_name'] ?? 'TBA'));
                }
            }
            $scheduleStmt->close();
        }
    }

    foreach ($subjects as $index => $subject) {
        $code = $subject['code'];
        if (isset($subjectScheduleMap[$code]) && !empty($subjectScheduleMap[$code])) {
            $entries = array_values($subjectScheduleMap[$code]);
            $days = [];
            $times = [];
            $rooms = [];
            foreach ($entries as $entry) {
                if (!empty($entry['day']) && !in_array($entry['day'], $days, true)) {
                    $days[] = $entry['day'];
                }
                if (!empty($entry['time']) && !in_array($entry['time'], $times, true)) {
                    $times[] = $entry['time'];
                }
                if (!empty($entry['room']) && !in_array($entry['room'], $rooms, true)) {
                    $rooms[] = $entry['room'];
                }
            }
            if (empty($days)) {
                $days[] = 'TBA';
            }
            if (empty($times)) {
                $times[] = 'TBA';
            }
            if (empty($rooms)) {
                $rooms[] = 'TBA';
            }
            $subjects[$index]['days'] = $days;
            $subjects[$index]['times'] = $times;
            $subjects[$index]['rooms'] = $rooms;
        } else {
            $subjects[$index]['days'] = ['TBA'];
            $subjects[$index]['times'] = ['TBA'];
            $subjects[$index]['rooms'] = ['TBA'];
        }
        $subjects[$index]['instructor'] = isset($subjectInstructorMap[$code]) && trim((string) $subjectInstructorMap[$code]) !== ''
            ? $subjectInstructorMap[$code]
            : 'TBA';
    }

    $totalUnits = 0;
    foreach ($subjects as $subject) {
        $totalUnits += isset($subject['units']) ? (int) $subject['units'] : 0;
    }

    $nameField = trim((string) ($studentRow['name'] ?? ''));
    $middleName = trim((string) ($studentRow['middle_name'] ?? ''));
    $fullName = $nameField;
    if ($middleName !== '') {
        $lowerName = ' ' . strtolower($nameField) . ' ';
        if ($nameField === '' || strpos($lowerName, ' ' . strtolower($middleName) . ' ') === false) {
            $fullName = trim($nameField . ' ' . $middleName);
        }
    }
    if ($fullName === '') {
        $fullName = 'N/A';
    }

    $studentNumber = trim((string) ($studentRow['student_id_number'] ?? ''));
    $course = trim((string) ($studentRow['course'] ?? ''));
    $specialization = trim((string) ($studentRow['specialization'] ?? ''));
    $yearLevelNumber = isset($studentRow['year_level']) ? (int) $studentRow['year_level'] : null;
    $yearLevelLabel = $yearLevelNumber !== null ? mapYearLevelLabel($yearLevelNumber) : '';
    $blockName = trim((string) ($studentRow['block_name'] ?? ''));
    $profileStatus = trim((string) ($studentRow['status'] ?? ''));
    $enrollmentTrack = trim((string) ($studentRow['enrollment_track'] ?? ''));
    $enrollmentStatus = trim((string) ($studentRow['enrollment_status'] ?? ''));
    $phoneNumber = trim((string) ($studentRow['phone_number'] ?? ''));
    $sex = trim((string) ($studentRow['sex'] ?? ''));
    $civilStatus = trim((string) ($studentRow['civil_status'] ?? ''));
    $nationality = trim((string) ($studentRow['nationality'] ?? ''));
    $religion = trim((string) ($studentRow['religion'] ?? ''));
    $dialect = trim((string) ($studentRow['dialect'] ?? ''));
    $currentAddress = trim((string) ($studentRow['current_address'] ?? ''));
    $permanentAddress = trim((string) ($studentRow['permanent_address'] ?? ''));
    $accountEmail = trim((string) ($studentRow['account_email'] ?? ''));

    $birthdateRaw = $studentRow['birthdate'] ?? null;
    $birthdateFormatted = '';
    $ageDisplay = '';
    if ($birthdateRaw) {
        try {
            $birthdate = new DateTime($birthdateRaw);
            $birthdateFormatted = $birthdate->format('F d, Y');
            $ageDisplay = (string) $birthdate->diff(new DateTime())->y;
        } catch (Exception $ignored) {
            $birthdateFormatted = trim((string) $birthdateRaw);
            $ageDisplay = '';
        }
    }

    $fathersName = trim((string) ($studentRow['fathers_name'] ?? ''));
    $fathersOccupation = trim((string) ($studentRow['fathers_occupation'] ?? ''));
    $mothersName = trim((string) ($studentRow['mothers_name'] ?? ''));
    $mothersOccupation = trim((string) ($studentRow['mothers_occupation'] ?? ''));
    $guardiansName = trim((string) ($studentRow['guardians_name'] ?? ''));
    $guardiansOccupation = trim((string) ($studentRow['guardians_occupation'] ?? ''));
    $guardiansAddress = trim((string) ($studentRow['guardians_address'] ?? ''));

    $emergencyContactName = trim((string) ($studentRow['emergency_contact_name'] ?? ''));
    $emergencyContactAddress = trim((string) ($studentRow['emergency_contact_address'] ?? ''));
    $emergencyContactNumber = trim((string) ($studentRow['emergency_contact_number'] ?? ''));

    $elementarySchool = trim((string) ($studentRow['elementary_school'] ?? ''));
    $elemYearGraduated = trim((string) ($studentRow['elem_year_graduated'] ?? ''));
    $secondarySchool = trim((string) ($studentRow['secondary_school'] ?? ''));
    $secondaryYearGraduated = trim((string) ($studentRow['secondary_year_graduated'] ?? ''));
    $collegiateSchool = trim((string) ($studentRow['collegiate_school'] ?? ''));
    $collegiateYearGraduated = trim((string) ($studentRow['collegiate_year_graduated'] ?? ''));

    $generatedDate = new DateTime();
    $generatedOn = $generatedDate->format('M d Y h:i:s A');
    $registrationDate = $generatedDate->format('F d, Y');
    $generatedByDisplay = $fullName !== 'N/A' ? $fullName : '';
    if ($generatedByDisplay === '' && $accountEmail !== '') {
        $generatedByDisplay = $accountEmail;
    }
    $semesterShort = mapSemesterShort($semesterValue);
    $schoolYearDisplay = trim($academicYear !== '' ? $academicYear . '/' . $semesterShort : '');
    $courseMajor = $course !== '' ? $course : 'N/A';
    if ($specialization !== '') {
        $specializationProper = ucwords(strtolower($specialization));
        $courseDisciplineMap = [
            'bsit' => 'Information Technology',
            'bsis' => 'Information Systems',
            'bscs' => 'Computer Science',
            'bses' => 'Environmental Science',
        ];
        $courseKey = strtolower($course);
        $disciplineProper = $course !== '' && stripos($course, 'Bachelor') !== false
            ? rtrim($course, '. ')
            : ($courseDisciplineMap[$courseKey] ?? ($course !== '' ? ucwords(strtolower($course)) : 'Information Technology'));

        if (stripos($course, 'Bachelor') !== false) {
            $courseMajor = $disciplineProper . ' with Specialization in ' . $specializationProper . '.';
        } else {
            $courseMajor = sprintf('Bachelor of Science in %s with Specialization in %s.', $disciplineProper, $specializationProper);
        }
    }
    $courseAcronym = abbreviateWords($course);
    $specializationAcronym = abbreviateWords($specialization);
    $yearSectionSegments = [];

    if ($courseAcronym !== '') {
        $prefix = $courseAcronym;
        if ($specializationAcronym !== '') {
            $prefix .= '-' . $specializationAcronym;
        }
        $yearSectionSegments[] = $prefix;
    } elseif ($specializationAcronym !== '') {
        $yearSectionSegments[] = $specializationAcronym;
    }

    $yearBlock = '';
    if ($yearLevelNumber !== null && $yearLevelNumber > 0) {
        $yearBlock = (string) $yearLevelNumber;
    }
    $blockCode = strtoupper(preg_replace('/\s+/', '', $blockName));
    if ($blockCode !== '') {
        $yearBlock .= ($yearBlock !== '' ? '-' : '') . $blockCode;
    }
    if ($yearBlock !== '') {
        $yearSectionSegments[] = $yearBlock;
    }

    if (empty($yearSectionSegments) && $yearLevelLabel !== '') {
        $yearSectionSegments[] = $yearLevelLabel;
    }
    $yearSectionDisplay = implode(' ', $yearSectionSegments);
    if ($currentAddress !== '' && $permanentAddress !== '' && strcasecmp($currentAddress, $permanentAddress) !== 0) {
        $fullAddress = $currentAddress . ' / ' . $permanentAddress;
    } else {
        $fullAddress = $currentAddress !== '' ? $currentAddress : $permanentAddress;
    }

    $feeItems = [
        ['description' => 'Tuition Fee', 'amount' => 2100.00, 'paid' => 0.00, 'balance' => 0.00, 'unifast' => 0.00],
        ['description' => 'Information Technology Fee', 'amount' => 400.00, 'paid' => 0.00, 'balance' => 0.00, 'unifast' => 0.00],
        ['description' => 'Laboratory Fee - Computer', 'amount' => 400.00, 'paid' => 0.00, 'balance' => 0.00, 'unifast' => 0.00],
        ['description' => 'Athletics Fee', 'amount' => 50.00, 'paid' => 0.00, 'balance' => 0.00, 'unifast' => 0.00],
        ['description' => 'Cultural Fee', 'amount' => 50.00, 'paid' => 0.00, 'balance' => 0.00, 'unifast' => 0.00],
        ['description' => 'Guidance Fee', 'amount' => 10.00, 'paid' => 0.00, 'balance' => 0.00, 'unifast' => 0.00],
        ['description' => 'Higher Education Modernization Fee', 'amount' => 100.00, 'paid' => 0.00, 'balance' => 0.00, 'unifast' => 0.00],
        ['description' => 'Insurance Fee', 'amount' => 20.00, 'paid' => 0.00, 'balance' => 0.00, 'unifast' => 0.00],
        ['description' => 'Library Fee', 'amount' => 50.00, 'paid' => 0.00, 'balance' => 0.00, 'unifast' => 0.00],
        ['description' => 'Medical and Dental Fee', 'amount' => 50.00, 'paid' => 0.00, 'balance' => 0.00, 'unifast' => 0.00],
        ['description' => 'Registration Fee', 'amount' => 100.00, 'paid' => 0.00, 'balance' => 0.00, 'unifast' => 0.00],
        ['description' => 'School Paper Fee', 'amount' => 40.00, 'paid' => 0.00, 'balance' => 0.00, 'unifast' => 0.00],
        ['description' => 'SCUAA Fee', 'amount' => 50.00, 'paid' => 0.00, 'balance' => 0.00, 'unifast' => 0.00],
        ['description' => 'Student Council Fee', 'amount' => 60.00, 'paid' => 0.00, 'balance' => 0.00, 'unifast' => 0.00],
    ];

    $feeTotals = ['amount' => 0.00, 'paid' => 0.00, 'balance' => 0.00];
    foreach ($feeItems as $feeItem) {
        $feeTotals['amount'] += $feeItem['amount'];
        $feeTotals['paid'] += $feeItem['paid'];
        $feeTotals['balance'] += $feeItem['balance'];
    }

    $logoImageUrl = null;
    $logoCandidates = ['ascot-logo.png', 'ascot-logo.jpg', 'ascot-logo.jpeg'];
    foreach ($logoCandidates as $logoFile) {
        $candidateLogoPath = __DIR__ . '/assets/' . $logoFile;
        if (file_exists($candidateLogoPath)) {
            $logoImageUrl = 'assets/' . $logoFile;
            break;
        }
    }

    ob_start();
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">

        <style>
            * { box-sizing: border-box; }
            body { font-family: "Arial MT", Arial, Helvetica, sans-serif; background: #f4f5f7; margin: 0; padding: 32px; color: #111827; }
            .container { max-width: 900px; margin: 0 auto; background: #ffffff; padding: 32px 36px; border-radius: 16px; box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08); }
            .header { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; font-family: "Times New Roman", Times, serif; }
            .header-logo { width: 90px; height: 90px; object-fit: contain; }
            .header-text { display: flex; flex-direction: column; justify-content: center; gap: 2px; }
            .fallback-header { text-transform: uppercase; font-size: 15px; letter-spacing: 1px; }
            .fallback-sub { font-size: 11px; letter-spacing: 1px; text-transform: uppercase; }
            .field-underline { border-bottom: 0.4px solid #111; padding: 1px 4px 0; min-height: 14px; display: inline-block; line-height: 1; }
            .student-info-section { display: flex; flex-direction: column; gap: 6px; margin-bottom: 18px; font-size: 11.5px; }
            .section-divider { border-bottom: 0.6px solid #111; margin: 18px 0 12px; }
            .info-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; line-height: 1; }
            .info-field { display: grid; grid-template-columns: 120px 1fr; column-gap: 6px; align-items: end; }
            .info-field .label { text-transform: uppercase; letter-spacing: 1px; font-size: 11px; white-space: nowrap; }
            .info-field .value { width: 100%; }
            .info-field .value .field-underline { width: 100%; }
            .info-field.col-span-2 { grid-column: span 2; }
            .info-field.col-span-3 { grid-column: span 3; }
            table.subjects { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 12px; }
            table.subjects thead th { padding: 4px 6px; text-align: left; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; font-family: "Times New Roman", Times, serif; }
            table.subjects tbody td { padding: 4px 6px; font-size: 11px; vertical-align: top; }
            table.fees { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 8px; }
            table.fees thead th { text-transform: uppercase; letter-spacing: 0.6px; font-size: 10px; padding: 4px 6px; text-align: right; font-family: "Times New Roman", Times, serif; }
            table.fees thead th:first-child { text-align: left; }
            table.fees tbody td { padding: 4px 6px; }
            table.fees tbody td + td { text-align: right; }
            table.fees tbody tr:last-child td { font-weight: 600; }
            .assessment-row { display: flex; align-items: center; gap: 8px; margin-top: 20px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.6px; }
            .assessment-row .label { white-space: nowrap; }
            .assessment-row .line { flex: 1; border-bottom: 0.4px solid #111; height: 1px; }
            .generated-footer { text-align: right; font-size: 10px; color: #4b5563; margin-top: 16px; }
            @media print {
                body { background: #ffffff; padding: 0; }
                .container { box-shadow: none; border-radius: 0; margin: 0; width: 100%; padding: 24px 28px; }
                .no-print { display: none !important; }
                .field-underline { min-height: 16px; display: inline-block; }
                table.subjects tbody td { border-bottom-color: #777; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <?php if ($logoImageUrl !== null): ?>
                    <img src="<?= htmlspecialchars($logoImageUrl, ENT_QUOTES, 'UTF-8') ?>" alt="ASCOT Logo" class="header-logo" />
                <?php endif; ?>
                <div class="header-text">
                    <div class="fallback-header">Aurora State College of Technology</div>
                    <div class="fallback-sub">Baler, Aurora</div>
                    <div class="fallback-header">Certificate of Registration</div>
                </div>
            </div>
            <div class="student-info-section">
                <div class="info-row">
                    <div class="info-field">
                        <span class="label">Student ID</span>
                        <span class="value"><?= renderUnderline($studentNumber) ?></span>
                    </div>
                    <div class="info-field col-span-2">
                        <span class="label">Student Name</span>
                        <span class="value"><?= renderUnderline($fullName) ?></span>
                    </div>
                </div>
                <div class="info-row">
                    <div class="info-field">
                        <span class="label">Gender</span>
                        <span class="value"><?= renderUnderline($sex) ?></span>
                    </div>
                    <div class="info-field col-span-2">
                        <span class="label">Course / Major</span>
                        <span class="value"><?= renderUnderline($courseMajor) ?></span>
                    </div>
                </div>
                <div class="info-row">
                    <div class="info-field">
                        <span class="label">School Year</span>
                        <span class="value"><?= renderUnderline($schoolYearDisplay) ?></span>
                    </div>
                    <div class="info-field">
                        <span class="label">Year / Section</span>
                        <span class="value"><?= renderUnderline($yearSectionDisplay) ?></span>
                    </div>
                    <div class="info-field">
                        <span class="label">Date of Registration</span>
                        <span class="value"><?= renderUnderline($registrationDate) ?></span>
                    </div>
                </div>
                <div class="info-row">
                    <div class="info-field col-span-2">
                        <span class="label">Contact Number</span>
                        <span class="value"><?= renderUnderline($phoneNumber) ?></span>
                    </div>
                    <div class="info-field">
                        <span class="label">Total Units</span>
                        <span class="value"><?= renderUnderline((string) $totalUnits) ?></span>
                    </div>
                </div>
                <div class="info-row">
                    <div class="info-field col-span-3">
                        <span class="label">Address</span>
                        <span class="value"><?= renderUnderline($fullAddress) ?></span>
                    </div>
                </div>
            </div>

            <div class="section-divider"></div>

            <table class="subjects">
                <colgroup>
                    <col style="width: 12%;" />
                    <col style="width: 12%;" />
                    <col style="width: 30%;" />
                    <col style="width: 8%;" />
                    <col style="width: 12%;" />
                    <col style="width: 14%;" />
                    <col style="width: 12%;" />
                </colgroup>
                <thead>
                    <tr>
                        <th>Code</th>
                        <th>Section</th>
                        <th>Course Description</th>
                        <th>Units</th>
                        <th>Days</th>
                        <th>Time</th>
                        <th>Room</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (!empty($subjects)): ?>
                        <?php foreach ($subjects as $subject): ?>
                            <?php
                                $sectionDisplay = $blockName !== '' ? $blockName : 'TBA';
                                $daysText = renderMultiline($subject['days'] ?? []);
                                $timesText = renderMultiline($subject['times'] ?? []);
                                $roomsText = renderMultiline($subject['rooms'] ?? []);
                            ?>
                            <tr>
                                <td><?= renderPlain($subject['code']) ?></td>
                                <td><?= renderPlain($sectionDisplay) ?></td>
                                <td><?= renderPlain($subject['description']) ?></td>
                                <td><?= renderPlain((string) ($subject['units'] ?? '0')) ?></td>
                                <td><?= $daysText ?></td>
                                <td><?= $timesText ?></td>
                                <td><?= $roomsText ?></td>
                            </tr>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <tr>
                            <td colspan="7" style="text-align: center; padding: 12px;">No registered subjects found.</td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>

            <div class="section-divider"></div>
            <table class="fees">
                <thead>
                    <tr>
                        <th>Fees Information</th>
                        <th>Amount</th>
                        <th>Paid</th>
                        <th>Balance</th>
                        <th>Unifast RA 10931</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if (!empty($feeItems)): ?>
                        <?php foreach ($feeItems as $feeItem): ?>
                            <tr>
                                <td><?= renderPlain($feeItem['description']) ?></td>
                                <td><?= htmlspecialchars(formatAmount($feeItem['amount']), ENT_QUOTES, 'UTF-8') ?></td>
                                <td><?= htmlspecialchars(formatAmount($feeItem['paid']), ENT_QUOTES, 'UTF-8') ?></td>
                                <td><?= htmlspecialchars(formatAmount($feeItem['balance']), ENT_QUOTES, 'UTF-8') ?></td>
                                <td></td>
                            </tr>
                        <?php endforeach; ?>
                    <?php endif; ?>
                    <tr>
                        <td style="text-align: right; font-weight: 600; text-transform: uppercase;">Total</td>
                        <td><?= htmlspecialchars(formatAmount($feeTotals['amount']), ENT_QUOTES, 'UTF-8') ?></td>
                        <td><?= htmlspecialchars(formatAmount($feeTotals['paid']), ENT_QUOTES, 'UTF-8') ?></td>
                        <td><?= htmlspecialchars(formatAmount($feeTotals['balance']), ENT_QUOTES, 'UTF-8') ?></td>
                        <td></td>
                    </tr>
                </tbody>
            </table>

            <div class="assessment-row">
                <span class="label">Assessment Checked By:</span>
                <span class="line"></span>
            </div>

            <div class="generated-footer">
                Generated by: <?= htmlspecialchars($generatedByDisplay, ENT_QUOTES, 'UTF-8') ?><?= $generatedByDisplay !== '' ? ' | ' : ' ' ?><?= htmlspecialchars($generatedOn, ENT_QUOTES, 'UTF-8') ?>
            </div>

        </div>
        <script>
            window.addEventListener('load', function () {
                setTimeout(function () {
                    window.print();
                }, 350);
            });
        </script>
    </body>
    </html>
    <?php
    $htmlOutput = ob_get_clean();
    echo $htmlOutput;
} catch (Throwable $e) {
    respondWithError('An unexpected error occurred while preparing the registration form. ' . $e->getMessage());
} finally {
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
?>
