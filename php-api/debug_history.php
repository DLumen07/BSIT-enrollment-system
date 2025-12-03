<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once 'db_config.php';

// $conn is already defined in db_config.php

// Get teaching_assignment_history
$history = [];
$result = $conn->query("SELECT id, instructor_user_id, instructor_email, academic_year, semester, subject_code, block_name FROM teaching_assignment_history ORDER BY id DESC LIMIT 30");
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $history[] = $row;
    }
}

// Get instructor josh@gmail.com
$instructor = null;
$stmt = $conn->prepare("SELECT u.id, u.email, ip.name FROM users u LEFT JOIN instructor_profiles ip ON ip.user_id = u.id WHERE u.email = ?");
$email = 'josh@gmail.com';
$stmt->bind_param('s', $email);
$stmt->execute();
$instructorResult = $stmt->get_result();
if ($row = $instructorResult->fetch_assoc()) {
    $instructor = $row;
}

echo json_encode([
    'instructor' => $instructor,
    'history_count' => count($history),
    'history' => $history
], JSON_PRETTY_PRINT);

$conn->close();
