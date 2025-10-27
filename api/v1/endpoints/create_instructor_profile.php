<?php
include_once '../core.php';

include_once '../database.php';
include_once '../models/instructor_profile.php';

$database = new Database();
$db = $database->getConnection();

$instructor = new InstructorProfile($db);

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->user_id) && !empty($data->name) && !empty($data->department)) {
    $instructor->user_id = $data->user_id;
    $instructor->name = $data->name;
    $instructor->avatar_url = $data->avatar_url;
    $instructor->department = $data->department;

    if ($instructor->create()) {
        $instructor->readOne();
        http_response_code(201);
        echo json_encode($instructor);
    } else {
        http_response_code(503);
        echo json_encode(array("message" => "Unable to create instructor profile."));
    }
} else {
    http_response_code(400);
    echo json_encode(array("message" => "Unable to create instructor profile. Data is incomplete."));
}
?>