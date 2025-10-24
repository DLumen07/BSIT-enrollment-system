<?php
include_once '../core.php';
include_once '../database.php';
include_once '../models/course_class.php';

$database = new Database();
$db = $database->getConnection();

$class = new CourseClass($db);

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->subject_id)) {
    $class->subject_id = $data->subject_id;
    $class->instructor_id = $data->instructor_id;
    $class->block_id = $data->block_id;
    $class->room = $data->room;
    $class->day_of_week = $data->day_of_week;
    $class->start_time = $data->start_time;
    $class->end_time = $data->end_time;

    if ($class->create()) {
        http_response_code(201);
        echo json_encode(array("message" => "Class was created."));
    } else {
        http_response_code(503);
        echo json_encode(array("message" => "Unable to create class."));
    }
} else {
    http_response_code(400);
    echo json_encode(array("message" => "Unable to create class. Data is incomplete."));
}
?>