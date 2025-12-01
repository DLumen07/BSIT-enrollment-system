<?php
require_once 'db_config.php';

header('Content-Type: text/html; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Cache-Control: post-check=0, pre-check=0', false);
header('Pragma: no-cache');
header('Expires: 0');

$emailParam = trim((string) ($_GET['email'] ?? ''));
$studentIdParam = trim((string) ($_GET['student_id'] ?? ''));

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

if ($emailParam === '' && $studentIdParam === '') {
    respondWithError('Missing student identifier. Provide an "email" or "student_id" query parameter.');
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

    $studentSql = 'SELECT sp.*, u.email AS account_email, b.name AS block_name, b.id AS block_id
                   FROM student_profiles sp
                   INNER JOIN users u ON u.id = sp.user_id
                   LEFT JOIN blocks b ON b.id = sp.block_id
                   WHERE ' . ($emailParam !== '' ? 'u.email = ?' : 'sp.student_id_number = ?') . '
                   LIMIT 1';

    $studentStmt = $conn->prepare($studentSql);
    if (!$studentStmt) {
        throw new RuntimeException('Failed to prepare student query: ' . $conn->error);
    }

    $identifierValue = $emailParam !== '' ? $emailParam : $studentIdParam;
    $studentStmt->bind_param('s', $identifierValue);
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

    $student = $studentResult->fetch_assoc();
    $studentStmt->close();

    $blockId = isset($student['block_id']) ? (int) $student['block_id'] : 0;
    if ($blockId <= 0) {
        respondWithError('Student is not assigned to a block yet, so no schedule is available to print.');
        if ($conn instanceof mysqli) {
            $conn->close();
        }
        exit;
    }

    $settingsRow = null;
    if ($settingsResult = $conn->query('SELECT academic_year, semester FROM system_settings ORDER BY id DESC LIMIT 1')) {
        $settingsRow = $settingsResult->fetch_assoc();
        $settingsResult->free();
    }

    $academicYear = isset($settingsRow['academic_year']) && trim((string) $settingsRow['academic_year']) !== ''
        ? trim((string) $settingsRow['academic_year'])
        : sprintf('%d-%d', (int) date('Y'), (int) date('Y') + 1);
    $semesterCode = isset($settingsRow['semester']) ? (string) $settingsRow['semester'] : '';

    $semesterTrimmed = strtolower(trim($semesterCode));
    if ($semesterTrimmed === '2nd-sem' || $semesterTrimmed === 'second' || $semesterTrimmed === '2nd') {
        $semesterLabel = '2nd Semester';
    } elseif ($semesterTrimmed === 'summer') {
        $semesterLabel = 'Summer Term';
    } else {
        $semesterLabel = '1st Semester';
    }

    $scheduleSql = "SELECT subj.code, subj.description, sch.day_of_week,
                           DATE_FORMAT(sch.start_time, '%h:%i %p') AS start_time,
                           DATE_FORMAT(sch.end_time, '%h:%i %p') AS end_time,
                           TIME_TO_SEC(sch.start_time) AS start_seconds,
                           IFNULL(ip.name, 'TBA') AS instructor_name,
                           IFNULL(sch.room, 'TBA') AS room
                    FROM schedules sch
                    INNER JOIN subjects subj ON subj.id = sch.subject_id
                    LEFT JOIN instructor_profiles ip ON ip.user_id = sch.instructor_id
                    WHERE sch.block_id = ?
                    ORDER BY FIELD(sch.day_of_week,'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'), sch.start_time";

    $scheduleStmt = $conn->prepare($scheduleSql);
    if (!$scheduleStmt) {
        throw new RuntimeException('Failed to prepare schedule query: ' . $conn->error);
    }

    $scheduleStmt->bind_param('i', $blockId);
    $scheduleStmt->execute();
    $scheduleResult = $scheduleStmt->get_result();

    $days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    $scheduleByDay = array_fill_keys($days, []);

    while ($scheduleResult && ($row = $scheduleResult->fetch_assoc())) {
        $day = $row['day_of_week'] ?? 'TBA';
        if (!isset($scheduleByDay[$day])) {
            $scheduleByDay[$day] = [];
        }
        $scheduleByDay[$day][] = $row;
    }

    $scheduleStmt->close();

    $hasEntries = false;
    foreach ($scheduleByDay as $entries) {
        if (!empty($entries)) {
            $hasEntries = true;
            break;
        }
    }

    if (!$hasEntries) {
        respondWithError('No schedule entries were found for this student\'s block.');
        if ($conn instanceof mysqli) {
            $conn->close();
        }
        exit;
    }

    $flatSchedule = [];
    foreach ($days as $dayLabel) {
        if (empty($scheduleByDay[$dayLabel])) {
            continue;
        }
        foreach ($scheduleByDay[$dayLabel] as $entry) {
            $flatSchedule[] = array_merge($entry, ['day' => $dayLabel]);
        }
    }

    $studentName = trim((string) ($student['name'] ?? ''));
    $studentNumber = trim((string) ($student['student_id_number'] ?? ''));
    $course = trim((string) ($student['course'] ?? ''));
    $yearLevel = isset($student['year_level']) ? (int) $student['year_level'] : null;
    $blockName = trim((string) ($student['block_name'] ?? ''));

    if ($yearLevel === 1) {
        $yearLabel = '1st Year';
    } elseif ($yearLevel === 2) {
        $yearLabel = '2nd Year';
    } elseif ($yearLevel === 3) {
        $yearLabel = '3rd Year';
    } elseif ($yearLevel === 4) {
        $yearLabel = '4th Year';
    } elseif ($yearLevel && $yearLevel > 0) {
        $yearLabel = $yearLevel . 'th Year';
    } else {
        $yearLabel = 'Year not set';
    }

    $logoImageUrl = null;
    $logoCandidates = ['assets/site-logo.png', 'assets/site-logo.svg', 'assets/ascot-logo.png'];
    foreach ($logoCandidates as $candidate) {
        if (file_exists(__DIR__ . '/' . $candidate)) {
            $logoImageUrl = $candidate;
            break;
        }
    }

    ob_start();
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8" />
        <title>Printable Class Schedule</title>
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
                max-width: 960px;
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
            .sheet__header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 24px;
                margin-bottom: 32px;
            }
            .sheet__identity {
                display: flex;
                align-items: center;
                gap: 18px;
            }
            .sheet__identity img {
                width: 84px;
                height: 84px;
                object-fit: contain;
            }
            .sheet__title-block {
                display: flex;
                flex-direction: column;
                gap: 2px;
            }
            .sheet__institution {
                font-size: 13px;
                text-transform: uppercase;
                letter-spacing: 2.4px;
                color: var(--muted);
            }
            .sheet__title-block h1 {
                font-size: 30px;
                margin: 0;
                letter-spacing: 0.6px;
            }
            .sheet__term {
                font-size: 14px;
                color: var(--muted);
            }
            .sheet__badge {
                border: 1px solid var(--border);
                padding: 8px 16px;
                border-radius: 999px;
                font-size: 13px;
                text-transform: uppercase;
                letter-spacing: 1px;
                color: var(--muted);
                background: #f8fafc;
            }
            .meta-section {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                gap: 18px;
                margin-bottom: 28px;
                position: relative;
                z-index: 1;
            }
            .meta-card {
                border: 1px solid var(--border);
                border-radius: 16px;
                padding: 16px 18px;
                background: #f8fafc;
            }
            .meta-card span {
                display: block;
                text-transform: uppercase;
                font-size: 11px;
                letter-spacing: 1px;
                color: var(--muted);
                margin-bottom: 6px;
            }
            .meta-card strong {
                font-size: 16px;
            }
            .timetable-wrapper {
                margin-top: 18px;
            }
            .timetable {
                width: 100%;
                border-collapse: separate;
                border-spacing: 0;
                table-layout: fixed;
                border: 1px solid var(--border);
                border-radius: 18px;
                font-size: 13px;
                overflow: hidden;
            }
            .timetable thead th {
                text-transform: uppercase;
                font-size: 11px;
                letter-spacing: 1px;
                color: var(--muted);
                padding: 10px 8px;
                background: #f8fafc;
                border-bottom: 1px solid var(--border);
            }
            .timetable tbody td {
                padding: 10px 8px;
                border-bottom: 1px solid #f1f5f9;
                border-right: 1px solid #f1f5f9;
            }
            .timetable tbody tr:last-child td {
                border-bottom: none;
            }
            .timetable tbody td:last-child {
                border-right: none;
            }
            .timetable .day-cell {
                font-weight: 700;
                color: var(--pill-text);
            }
            .timetable .subject-code {
                font-weight: 600;
                display: block;
                margin-bottom: 2px;
            }
            .timetable .subject-desc {
                color: var(--muted);
                font-size: 12px;
            }
            .timetable .room-cell {
                font-weight: 600;
                text-align: center;
            }
            .footer {
                margin-top: 36px;
                display: flex;
                justify-content: space-between;
                gap: 12px;
                flex-wrap: wrap;
                font-size: 12px;
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
                font-size: 13px;
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
                    padding: 36px 44px;
                }
                .sheet::after {
                    display: none;
                }
                .meta-section {
                    gap: 12px;
                }
                .meta-card {
                    background: transparent;
                }
                .sheet__badge {
                    border-color: #cbd5f5;
                }
                .timetable thead th,
                .timetable tbody td {
                    padding: 8px 6px;
                }
                .timetable {
                    font-size: 12px;
                }
            }
        </style>
    </head>
    <body>
        <div class="sheet" id="printable-schedule">
            <div class="sheet__header">
                <div class="sheet__identity">
                    <?php if ($logoImageUrl !== null): ?>
                        <img src="<?= htmlspecialchars($logoImageUrl, ENT_QUOTES, 'UTF-8') ?>" alt="ASCOT Logo" />
                    <?php endif; ?>
                    <div class="sheet__title-block">
                        <span class="sheet__institution">Aurora State College of Technology</span>
                        <h1>Official Class Schedule</h1>
                        <span class="sheet__term"><?= htmlspecialchars($academicYear . ' • ' . $semesterLabel, ENT_QUOTES, 'UTF-8') ?></span>
                    </div>
                </div>
                <div class="sheet__badge">Official Copy</div>
            </div>

            <div class="meta-section">
                <div class="meta-card">
                    <span>Student Name</span>
                    <strong><?= htmlspecialchars($studentName !== '' ? $studentName : 'N/A', ENT_QUOTES, 'UTF-8') ?></strong>
                </div>
                <div class="meta-card">
                    <span>Student ID</span>
                    <strong><?= htmlspecialchars($studentNumber !== '' ? $studentNumber : 'N/A', ENT_QUOTES, 'UTF-8') ?></strong>
                </div>
                <div class="meta-card">
                    <span>Course / Year</span>
                    <strong><?= htmlspecialchars(($course !== '' ? $course : 'Course not set') . ' • ' . $yearLabel, ENT_QUOTES, 'UTF-8') ?></strong>
                </div>
                <div class="meta-card">
                    <span>Block Assignment</span>
                    <strong><?= htmlspecialchars($blockName !== '' ? $blockName : 'Unassigned', ENT_QUOTES, 'UTF-8') ?></strong>
                </div>
            </div>

            <div class="timetable-wrapper">
                <table class="timetable">
                    <thead>
                        <tr>
                            <th style="width: 16%;">Day</th>
                            <th style="width: 18%;">Time</th>
                            <th>Subject</th>
                            <th style="width: 20%;">Instructor</th>
                            <th style="width: 12%;">Room</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($flatSchedule as $entry): ?>
                            <tr>
                                <td class="day-cell">
                                    <?= htmlspecialchars($entry['day'] ?? 'TBA', ENT_QUOTES, 'UTF-8') ?>
                                </td>
                                <td>
                                    <?= htmlspecialchars(trim((string) $entry['start_time']) . ' - ' . trim((string) $entry['end_time']), ENT_QUOTES, 'UTF-8') ?>
                                </td>
                                <td>
                                    <span class="subject-code"><?= htmlspecialchars($entry['code'] ?? '', ENT_QUOTES, 'UTF-8') ?></span>
                                    <span class="subject-desc"><?= htmlspecialchars($entry['description'] ?? '', ENT_QUOTES, 'UTF-8') ?></span>
                                </td>
                                <td>
                                    <?= htmlspecialchars($entry['instructor_name'] ?? 'Instructor TBA', ENT_QUOTES, 'UTF-8') ?>
                                </td>
                                <td class="room-cell">
                                    <?= htmlspecialchars($entry['room'] ?? 'TBA', ENT_QUOTES, 'UTF-8') ?>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>

            <div class="signature-boxes">
                <div class="signature-box">Class Adviser / Instructor</div>
                <div class="signature-box">Student Signature</div>
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
