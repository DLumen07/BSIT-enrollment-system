<?php
include_once '../core.php';

include_once '../database.php';
include_once '../models/instructor_profile.php';
include_once '../models/user.php';

$database = new Database();
$db = $database->getConnection();

$instructor = new InstructorProfile($db);
$user = new User($db);

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->user_id)) {
    $instructor->user_id = $data->user_id;
    $user->id = $data->user_id;

    if ($instructor->delete() && $user->delete()) {
        http_response_code(200);
        echo json_encode(array("message" => "Instructor was deleted."));
    } else {
        http_response_code(503);
        echo json_encode(array("message" => "Unable to delete instructor."));
    }
} else {
    http_response_code(400);
    echo json_encode(array("message" => "Unable to delete instructor. Data is incomplete."));
}
?>