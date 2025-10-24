<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../database.php';
include_once '../models/instructor_profile.php';

$database = new Database();
$db = $database->getConnection();

$instructor_profile = new InstructorProfile($db);

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->user_id)) {
    $instructor_profile->user_id = $data->user_id;
    $instructor_profile->name = $data->name;
    $instructor_profile->avatar_url = $data->avatar_url;
    $instructor_profile->department = $data->department;

    if ($instructor_profile->create()) {
        http_response_code(201);
        echo json_encode(array("message" => "Instructor profile was created."));
    } else {
        http_response_code(503);
        echo json_encode(array("message" => "Unable to create instructor profile."));
    }
} else {
    http_response_code(400);
    echo json_encode(array("message" => "Unable to create instructor profile. Data is incomplete."));
}
?>