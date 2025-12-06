<?php
require_once 'db_config.php';

header('Content-Type: text/html; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');
header('Expires: 0');

$emailParam = trim((string) ($_GET['email'] ?? ''));
$instructorIdParam = trim((string) ($_GET['instructor_id'] ?? ''));

function respondWithError(string $message): void {
    echo '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8" />'
        . '<title>Printable Schedule</title>'
        . '<style>body{font-family:Arial,Helvetica,sans-serif;background:#f8fafc;margin:0;padding:48px;}'
        . '.error{max-width:640px;margin:120px auto;padding:32px;border-radius:16px;background:#fff;'
        . 'border:1px solid #e2e8f0;color:#b91c1c;font-size:16px;line-height:1.5;text-align:center;}'
        . '.error strong{display:block;margin-bottom:8px;font-size:18px;}</style>'
        . '</head><body><div class="error"><strong>Unable to generate schedule</strong>'
        . htmlspecialchars($message, ENT_QUOTES, 'UTF-8') . '</div></body></html>';
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

function renderUnderline(?string $value): string {
    $trimmed = trim((string) $value);
    if ($trimmed === '') {
        return '<span class="field-underline">&nbsp;</span>';
    }
    return '<span class="field-underline">' . htmlspecialchars($trimmed, ENT_QUOTES, 'UTF-8') . '</span>';
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

// Helper to generate a consistent pastel color from a string (e.g., subject code)
function stringToColor($str) {
    $hash = md5($str);
    // Take first 6 chars of hash
    $r = hexdec(substr($hash, 0, 2));
    $g = hexdec(substr($hash, 2, 2));
    $b = hexdec(substr($hash, 4, 2));
    
    // Mix with white to make it pastel
    $r = (int)(($r + 255) / 2);
    $g = (int)(($g + 255) / 2);
    $b = (int)(($b + 255) / 2);
    
    return sprintf("#%02x%02x%02x", $r, $g, $b);
}

// Helper to get a darker text color for the pastel background
function getContrastColor($hexColor) {
    $r = hexdec(substr($hexColor, 1, 2));
    $g = hexdec(substr($hexColor, 3, 2));
    $b = hexdec(substr($hexColor, 5, 2));
    $yiq = (($r * 299) + ($g * 587) + ($b * 114)) / 1000;
    return ($yiq >= 128) ? '#1e293b' : '#ffffff'; // Dark slate or white
}

if ($emailParam === '' && $instructorIdParam === '') {
    respondWithError('Missing instructor identifier. Provide an "email" or "instructor_id" query parameter.');
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

    $instructorSql = 'SELECT ip.*, u.email AS account_email
                      FROM instructor_profiles ip
                      INNER JOIN users u ON u.id = ip.user_id
                      WHERE ' . ($emailParam !== '' ? 'u.email = ?' : 'ip.user_id = ?') . '
                      LIMIT 1';

    $instructorStmt = $conn->prepare($instructorSql);
    if (!$instructorStmt) {
        throw new RuntimeException('Failed to prepare instructor query: ' . $conn->error);
    }

    $identifierValue = $emailParam !== '' ? $emailParam : $instructorIdParam;
    $instructorStmt->bind_param('s', $identifierValue);
    $instructorStmt->execute();
    $instructorResult = $instructorStmt->get_result();

    if (!$instructorResult || $instructorResult->num_rows === 0) {
        $instructorStmt->close();
        respondWithError('Instructor record not found.');
        if ($conn instanceof mysqli) {
            $conn->close();
        }
        exit;
    }

    $instructor = $instructorResult->fetch_assoc();
    $instructorStmt->close();
    $instructorId = (int)$instructor['user_id'];

    $settingsRow = null;
    if ($settingsResult = $conn->query('SELECT academic_year, semester FROM system_settings ORDER BY id DESC LIMIT 1')) {
        $settingsRow = $settingsResult->fetch_assoc();
        $settingsResult->free();
    }

    $academicYear = isset($settingsRow['academic_year']) && trim((string) $settingsRow['academic_year']) !== ''
        ? trim((string) $settingsRow['academic_year'])
        : sprintf('%d-%d', (int) date('Y'), (int) date('Y') + 1);
    $semesterCode = isset($settingsRow['semester']) ? (string) $settingsRow['semester'] : '';
    $semesterLabel = mapSemesterLabel($semesterCode);

    // --- Fetch Schedule ---
    $scheduleSql = "SELECT subj.code, subj.description, subj.units, sch.day_of_week,
                           DATE_FORMAT(sch.start_time, '%H:%i') AS start_time_24,
                           DATE_FORMAT(sch.end_time, '%H:%i') AS end_time_24,
                           DATE_FORMAT(sch.start_time, '%h:%i %p') AS start_time_fmt,
                           DATE_FORMAT(sch.end_time, '%h:%i %p') AS end_time_fmt,
                           IFNULL(b.name, 'TBA') AS block_name,
                           IFNULL(sch.room, 'TBA') AS room
                    FROM schedules sch
                    INNER JOIN subjects subj ON subj.id = sch.subject_id
                    LEFT JOIN blocks b ON b.id = sch.block_id
                    WHERE sch.instructor_id = ?
                    ORDER BY FIELD(sch.day_of_week,'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'), sch.start_time";

    $scheduleStmt = $conn->prepare($scheduleSql);
    if (!$scheduleStmt) {
        throw new RuntimeException('Failed to prepare schedule query: ' . $conn->error);
    }

    $scheduleStmt->bind_param('i', $instructorId);
    $scheduleStmt->execute();
    $scheduleResult = $scheduleStmt->get_result();

    $rawSchedule = [];
    $totalUnits = 0;
    $processedSubjects = []; 

    while ($scheduleResult && ($row = $scheduleResult->fetch_assoc())) {
        $rawSchedule[] = $row;
        $subjCode = $row['code'];
        // Simple unit calculation based on unique subjects in schedule
        if (!in_array($subjCode, $processedSubjects)) {
            $totalUnits += (int)$row['units'];
            $processedSubjects[] = $subjCode;
        }
    }
    $scheduleStmt->close();

    // --- Map Schedule to List View ---
    // We group by Subject Code AND Block Name because an instructor might teach the same subject to different blocks
    $classList = [];
    foreach ($rawSchedule as $row) {
        $key = $row['code'] . '|' . $row['block_name'];
        if (!isset($classList[$key])) {
            $classList[$key] = [
                'code' => $row['code'],
                'description' => $row['description'],
                'block_name' => $row['block_name'],
                'units' => $row['units'],
                'days' => [],
                'times' => [],
                'rooms' => []
            ];
        }
        
        $d = strtoupper(substr($row['day_of_week'], 0, 3));
        $t = $row['start_time_fmt'] . '-' . $row['end_time_fmt'];
        $r = $row['room'];
        
        if (!in_array($d, $classList[$key]['days'])) $classList[$key]['days'][] = $d;
        if (!in_array($t, $classList[$key]['times'])) $classList[$key]['times'][] = $t;
        if (!in_array($r, $classList[$key]['rooms'])) $classList[$key]['rooms'][] = $r;
    }
    
    // Sort class list by code
    usort($classList, function($a, $b) {
        return strcmp($a['code'], $b['code']);
    });

    if (empty($rawSchedule)) {
        // It's possible the instructor has no schedule yet
    }

    // --- Grid Processing Logic ---

    $days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    $startHour = 7; // 7:00 AM
    $endHour = 18;  // 6:00 PM
    $intervalMinutes = 30;

    // Generate time slots
    $timeSlots = [];
    $current = $startHour * 60;
    $end = $endHour * 60;
    while ($current < $end) {
        $h = floor($current / 60);
        $m = $current % 60;
        $timeStr = sprintf('%02d:%02d', $h, $m);
        $timeSlots[] = $timeStr;
        $current += $intervalMinutes;
    }

    // Initialize grid: [timeSlot][day] = null
    $grid = [];
    foreach ($timeSlots as $slot) {
        $grid[$slot] = array_fill_keys($days, ['type' => 'EMPTY']);
    }

    // Helper to convert "HH:MM" to minutes from midnight
    function timeToMinutes($timeStr) {
        list($h, $m) = explode(':', $timeStr);
        return (int)$h * 60 + (int)$m;
    }

    // Populate grid
    foreach ($rawSchedule as $entry) {
        $day = $entry['day_of_week'];
        if (!in_array($day, $days)) continue;

        $startMin = timeToMinutes($entry['start_time_24']);
        $endMin = timeToMinutes($entry['end_time_24']);
        
        // Find matching slots
        $firstSlot = null;
        $spanCount = 0;

        foreach ($timeSlots as $slot) {
            $slotMin = timeToMinutes($slot);
            $slotEndMin = $slotMin + $intervalMinutes;

            // Check if this slot is covered by the class
            if ($startMin < $slotEndMin && $endMin > $slotMin) {
                if ($firstSlot === null) {
                    $firstSlot = $slot;
                    $grid[$slot][$day] = [
                        'type' => 'START',
                        'data' => $entry,
                        'rowspan' => 1
                    ];
                    $spanCount = 1;
                } else {
                    $grid[$slot][$day] = ['type' => 'OCCUPIED'];
                    $spanCount++;
                }
            }
        }

        // Update rowspan for the start slot
        if ($firstSlot !== null) {
            $grid[$firstSlot][$day]['rowspan'] = $spanCount;
        }
    }

    // --- Instructor Info Preparation ---
    $instructorName = trim((string) ($instructor['name'] ?? ''));
    $department = 'BSIT Department';
    $email = trim((string) ($instructor['account_email'] ?? ''));
    
    // School Year Logic
    $semesterShort = mapSemesterShort($semesterCode);
    $schoolYearDisplay = trim($academicYear !== '' ? $academicYear . '/' . $semesterShort : '');
    $registrationDate = date('F d, Y');

    ob_start();
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <title>Printable Instructor Schedule</title>
        <style>
            :root {
                --ink: #0f172a;
                --muted: #64748b;
                --border: #e2e8f0;
                --pill-bg: #e0f2fe;
                --pill-text: #0369a1;
            }
            * { box-sizing: border-box; }
            body {
                font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
                background: #eef2ff;
                margin: 0;
                padding: 32px;
                color: var(--ink);
            }
            .sheet {
                max-width: 1100px;
                margin: 0 auto;
                background: #fff;
                border-radius: 24px;
                padding: 48px 56px;
                box-shadow: 0 32px 90px rgba(15, 23, 42, 0.14);
                position: relative;
            }
            .sheet::after {
                content: '';
                position: absolute;
                inset: 24px;
                border-radius: 18px;
                border: 1px solid rgba(15, 23, 42, 0.06);
                pointer-events: none;
            }

            /* Header Styles */
            .header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; font-family: "Times New Roman", Times, serif; }
            
            /* Info Section Styles */
            .field-underline { border-bottom: 0.4px solid #111; padding: 1px 4px 0; min-height: 14px; display: inline-block; line-height: 1; }
            .info-section { display: flex; flex-direction: column; gap: 6px; margin-bottom: 18px; font-size: 11.5px; position: relative; z-index: 1; }
            .section-divider { border-bottom: 0.6px solid #111; margin: 18px 0 12px; }
            .info-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; line-height: 1; }
            .info-field { display: grid; grid-template-columns: 120px 1fr; column-gap: 6px; align-items: end; }
            .info-field .label { text-transform: uppercase; letter-spacing: 1px; font-size: 11px; white-space: nowrap; color: var(--muted); }
            .info-field .value { width: 100%; font-weight: 600; }
            .info-field .value .field-underline { width: 100%; }
            .info-field.col-span-2 { grid-column: span 2; }
            .info-field.col-span-3 { grid-column: span 3; }
            
            /* Grid Table Styles */
            .timetable-wrapper {
                margin-top: 12px;
                overflow-x: auto;
            }
            .timetable {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
                border: 1px solid var(--border);
                font-size: 7px;
            }
            .timetable th, .timetable td {
                border: 1px solid var(--border);
                padding: 0;
                height: 18px;
                text-align: center;
                vertical-align: middle;
            }
            .timetable thead th {
                background: #f8fafc;
                color: var(--muted);
                text-transform: uppercase;
                font-size: 8px;
                letter-spacing: 1px;
                padding: 4px 2px;
            }
            .timetable .time-col {
                width: 55px;
                background: #f8fafc;
                color: var(--muted);
                font-weight: 600;
                font-size: 8px;
                white-space: nowrap;
            }
            .timetable .subject-cell {
                padding: 1px 2px;
                text-align: left;
                vertical-align: top;
                border-left: 2px solid rgba(0,0,0,0.1);
            }
            .timetable .subject-code {
                font-weight: 700;
                display: block;
                margin-bottom: 0;
                font-size: 8px;
            }
            .timetable .subject-desc {
                display: block;
                margin-bottom: 0;
                line-height: 1;
                font-size: 7px;
                opacity: 0.9;
            }
            .timetable .subject-meta {
                display: block;
                font-size: 7px;
                opacity: 0.8;
                line-height: 1;
            }

            /* Subject List Table Styles */
            table.subjects { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 12px; margin-bottom: 12px; }
            table.subjects thead th { padding: 4px 6px; text-align: left; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; font-family: "Times New Roman", Times, serif; border-bottom: 1px solid #ccc; }
            table.subjects tbody td { padding: 4px 6px; font-size: 11px; vertical-align: top; border-bottom: 1px solid #eee; }
            
            .footer {
                margin-top: 36px;
                display: flex;
                justify-content: space-between;
                gap: 12px;
                flex-wrap: wrap;
                font-size: 10px;
                color: var(--muted);
            }
            .signature-boxes {
                margin-top: 32px;
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                gap: 24px;
            }
            .signature-box {
                text-align: center;
                padding-top: 40px;
                border-top: 1px dashed var(--border);
                font-size: 12px;
                color: var(--muted);
            }
            @media print {
                body {
                    background: #fff;
                    padding: 0;
                }
                .sheet {
                    border-radius: 0;
                    box-shadow: none;
                    padding: 20px 30px;
                    max-width: 100%;
                }
                .sheet::after {
                    display: none;
                }
                .timetable th, .timetable td {
                    border-color: #999;
                }
                .timetable .subject-cell {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
            }
        </style>
    </head>
    <body>
        <div class="sheet" id="printable-schedule">
            <div class="header" style="display: block; text-align: center; margin-bottom: 24px;">
                <div style="font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">INSTRUCTOR CLASS SCHEDULE</div>
                <div style="font-size: 14px; margin-bottom: 4px;">School Year <?= htmlspecialchars($academicYear, ENT_QUOTES, 'UTF-8') ?>, <?= htmlspecialchars($semesterLabel, ENT_QUOTES, 'UTF-8') ?></div>
            </div>

            <div class="info-section">
                <div class="info-row">
                    <div class="info-field col-span-2">
                        <span class="label">Instructor Name</span>
                        <span class="value"><?= renderUnderline($instructorName) ?></span>
                    </div>
                    <div class="info-field">
                        <span class="label">Employee ID</span>
                        <span class="value"><?= renderUnderline((string)$instructorId) ?></span>
                    </div>
                </div>
                <div class="info-row">
                    <div class="info-field col-span-2">
                        <span class="label">Department</span>
                        <span class="value"><?= renderUnderline($department) ?></span>
                    </div>
                    <div class="info-field">
                        <span class="label">Total Units</span>
                        <span class="value"><?= renderUnderline((string) $totalUnits) ?></span>
                    </div>
                </div>
                <div class="info-row">
                    <div class="info-field col-span-2">
                        <span class="label">Email</span>
                        <span class="value"><?= renderUnderline($email) ?></span>
                    </div>
                    <div class="info-field">
                        <span class="label">Date Printed</span>
                        <span class="value"><?= renderUnderline($registrationDate) ?></span>
                    </div>
                </div>
            </div>

            <div class="section-divider"></div>

            <!-- Class List Table -->
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
                    <?php if (!empty($classList)): ?>
                        <?php foreach ($classList as $class): ?>
                            <?php
                                $daysText = renderMultiline($class['days'] ?? []);
                                $timesText = renderMultiline($class['times'] ?? []);
                                $roomsText = renderMultiline($class['rooms'] ?? []);
                            ?>
                            <tr>
                                <td><?= renderPlain($class['code']) ?></td>
                                <td><?= renderPlain($class['block_name']) ?></td>
                                <td><?= renderPlain($class['description']) ?></td>
                                <td><?= renderPlain((string) ($class['units'] ?? '0')) ?></td>
                                <td><?= $daysText ?></td>
                                <td><?= $timesText ?></td>
                                <td><?= $roomsText ?></td>
                            </tr>
                        <?php endforeach; ?>
                    <?php else: ?>
                        <tr>
                            <td colspan="7" style="text-align: center; padding: 12px;">No scheduled classes found.</td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>

            <div class="section-divider"></div>

            <!-- Timetable Grid -->
            <div class="timetable-wrapper">
                <table class="timetable">
                    <thead>
                        <tr>
                            <th class="time-col">Time</th>
                            <?php foreach ($days as $day): ?>
                                <th><?= $day ?></th>
                            <?php endforeach; ?>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($timeSlots as $slot): ?>
                            <tr>
                                <td class="time-col">
                                    <?= date('h:i A', strtotime($slot)) ?>
                                </td>
                                <?php foreach ($days as $day): ?>
                                    <?php 
                                    $cell = $grid[$slot][$day];
                                    if ($cell['type'] === 'OCCUPIED') {
                                        continue;
                                    }
                                    if ($cell['type'] === 'START') {
                                        $data = $cell['data'];
                                        $bgColor = stringToColor($data['code']);
                                        $textColor = getContrastColor($bgColor);
                                        ?>
                                        <td class="subject-cell" rowspan="<?= $cell['rowspan'] ?>" style="background-color: <?= $bgColor ?>; color: <?= $textColor ?>;">
                                            <span class="subject-code"><?= htmlspecialchars($data['code']) ?></span>
                                            <span class="subject-desc"><?= htmlspecialchars($data['block_name']) ?></span>
                                            <span class="subject-meta">
                                                <?= htmlspecialchars($data['start_time_fmt'] . ' - ' . $data['end_time_fmt']) ?><br>
                                                <?= htmlspecialchars($data['room']) ?>
                                            </span>
                                        </td>
                                        <?php
                                    } else {
                                        ?>
                                        <td></td>
                                        <?php
                                    }
                                    ?>
                                <?php endforeach; ?>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>

            <div class="signature-boxes">
                <div class="signature-box">Department Head</div>
                <div class="signature-box">Instructor Signature</div>
            </div>

            <div class="footer">
                <div>Generated on <?= htmlspecialchars(date('M d, Y h:i A'), ENT_QUOTES, 'UTF-8') ?></div>
                <div>Generated via ASCOT Enrollment System</div>
            </div>
        </div>
        <script>
            window.addEventListener('load', function () {
                setTimeout(function () {
                    window.print();
                }, 400);
            });
        </script>
    </body>
    </html>
    <?php
    echo ob_get_clean();
} catch (Throwable $e) {
    respondWithError('An unexpected error occurred while generating the schedule. ' . $e->getMessage());
} finally {
    if (isset($conn) && $conn instanceof mysqli) {
        $conn->close();
    }
}
?>
