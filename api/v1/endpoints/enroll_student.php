<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-control-allow-headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../database.php';
include_once '../models/enrollment.php';

$database = new Database();
$db = $database->getConnection();

$enrollment = new Enrollment($db);

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->student_user_id) && !empty($data->subject_id)) {
    $enrollment->student_user_id = $data->student_user_id;
    $enrollment->subject_id = $data->subject_id;

    if ($enrollment->create()) {
        http_response_code(201);
        echo json_encode(array("message" => "Student was enrolled."));
    } else {
        http_response_code(503);
        echo json_encode(array("message" => "Unable to enroll student."));
    }
} else {
    http_response_code(400);
    echo json_encode(array("message" => "Unable to enroll student. Data is incomplete."));
}
?>