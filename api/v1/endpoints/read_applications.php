<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

include_once '../database.php';
include_once '../models/enrollment_application.php';

$database = new Database();
$db = $database->getConnection();

$application = new EnrollmentApplication($db);

$stmt = $application->read();
$num = $stmt->rowCount();

if ($num > 0) {
    $applications_arr = array();
    $applications_arr["records"] = array();

    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        extract($row);
        $application_item = array(
            "id" => $id,
            "student_user_id" => $student_user_id,
            "status" => $status,
            "block_name" => $block_name,
            "submitted_at" => $submitted_at,
            "rejection_reason" => $rejection_reason,
            "form_data" => json_decode($form_data)
        );
        array_push($applications_arr["records"], $application_item);
    }
    http_response_code(200);
    echo json_encode($applications_arr);
} else {
    http_response_code(404);
    echo json_encode(array("message" => "No applications found."));
}
?>