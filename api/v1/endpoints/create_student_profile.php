<?php
include_once '../core.php';

include_once '../database.php';
include_once '../models/student_profile.php';

$database = new Database();
$db = $database->getConnection();

$student_profile = new StudentProfile($db);

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->user_id)) {
    $student_profile->user_id = $data->user_id;
    $student_profile->student_id_number = $data->student_id_number;
    $student_profile->name = $data->name;
    $student_profile->avatar_url = $data->avatar_url;
    $student_profile->course = $data->course;
    $student_profile->year_level = $data->year_level;
    $student_profile->enrollment_status = $data->enrollment_status;
    $student_profile->block_id = $data->block_id;
    $student_profile->specialization = $data->specialization;
    $student_profile->sex = $data->sex;
    $student_profile->phone_number = $data->phone_number;
    $student_profile->personal_details = $data->personal_details;

    if ($student_profile->create()) {
        http_response_code(201);
        echo json_encode(array("message" => "Student profile was created."));
    } else {
        http_response_code(503);
        echo json_encode(array("message" => "Unable to create student profile."));
    }
} else {
    http_response_code(400);
    echo json_encode(array("message" => "Unable to create student profile. Data is incomplete."));
}
?>