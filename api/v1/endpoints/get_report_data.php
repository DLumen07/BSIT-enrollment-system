<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

include_once '../database.php';
include_once '../models/report.php';

$database = new Database();
$db = $database->getConnection();

$report = new Report($db);

$stmt = $report->getEnrollmentStats();
$num = $stmt->rowCount();

if ($num > 0) {
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    extract($row);
    $report_data = array(
        "total_students" => $total_students,
        "total_instructors" => $total_instructors,
        "total_subjects" => $total_subjects,
        "total_blocks" => $total_blocks,
        "pending_applications" => $pending_applications
    );
    http_response_code(200);
    echo json_encode($report_data);
} else {
    http_response_code(404);
    echo json_encode(array("message" => "No report data found."));
}
?>