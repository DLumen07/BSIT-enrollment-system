<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: PUT");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../database.php';
include_once '../models/enrollment_application.php';

$database = new Database();
$db = $database->getConnection();

$application = new EnrollmentApplication($db);

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->id) && !empty($data->status)) {
    $application->id = $data->id;
    $application->status = $data->status;
    $application->rejection_reason = isset($data->rejection_reason) ? $data->rejection_reason : '';

    if ($application->updateStatus()) {
        http_response_code(200);
        echo json_encode(array("message" => "Application status was updated."));
    } else {
        http_response_code(503);
        echo json_encode(array("message" => "Unable to update application status."));
    }
} else {
    http_response_code(400);
    echo json_encode(array("message" => "Unable to update application status. Data is incomplete."));
}
?>