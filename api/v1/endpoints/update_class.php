<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: PUT");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../database.php';
include_once '../models/course_class.php';

$database = new Database();
$db = $database->getConnection();

$class = new CourseClass($db);

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->id) && !empty($data->subject_id) && !empty($data->instructor_id) && !empty($data->block_id) && !empty($data->room) && !empty($data->day_of_week) && !empty($data->start_time) && !empty($data->end_time)) {
    $class->id = $data->id;
    $class->subject_id = $data->subject_id;
    $class->instructor_id = $data->instructor_id;
    $class->block_id = $data->block_id;
    $class->room = $data->room;
    $class->day_of_week = $data->day_of_week;
    $class->start_time = $data->start_time;
    $class->end_time = $data->end_time;

    if ($class->update()) {
        http_response_code(200);
        echo json_encode(array("message" => "Class was updated."));
    } else {
        http_response_code(503);
        echo json_encode(array("message" => "Unable to update class."));
    }
} else {
    http_response_code(400);
    echo json_encode(array("message" => "Unable to update class. Data is incomplete."));
}
?>