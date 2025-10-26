<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../database.php';
include_once '../models/enrollment_application.php';

$database = new Database();
$db = $database->getConnection();

$application = new EnrollmentApplication($db);

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->student_user_id) && !empty($data->block_name) && !empty($data->form_data)) {
    $application->student_user_id = $data->student_user_id;
    $application->block_name = $data->block_name;
    $application->form_data = $data->form_data;
    $application->status = 'pending';

    if ($application->create()) {
        http_response_code(201);
        echo json_encode(array("message" => "Application was submitted."));
    } else {
        http_response_code(503);
        echo json_encode(array("message" => "Unable to submit application."));
    }
} else {
    http_response_code(400);
    echo json_encode(array("message" => "Unable to submit application. Data is incomplete."));
}
?>