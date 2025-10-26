<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: PUT");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../database.php';
include_once '../models/student_profile.php';

$database = new Database();
$db = $database->getConnection();

$student = new StudentProfile($db);

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->user_id) && !empty($data->name) && !empty($data->course) && !empty($data->year_level)) {
    $student->user_id = $data->user_id;
    $student->name = $data->name;
    $student->avatar_url = $data->avatar_url;
    $student->course = $data->course;
    $student->year_level = $data->year_level;
    $student->specialization = $data->specialization;
    $student->block = $data->block;

    if ($student->update()) {
        http_response_code(200);
        echo json_encode(array("message" => "Student profile was updated."));
    } else {
        http_response_code(503);
        echo json_encode(array("message" => "Unable to update student profile."));
    }
} else {
    http_response_code(400);
    echo json_encode(array("message" => "Unable to update student profile. Data is incomplete."));
}
?>