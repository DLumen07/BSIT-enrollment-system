<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../database.php';
include_once '../models/schedule.php';

$database = new Database();
$db = $database->getConnection();

$schedule = new Schedule($db);

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->block_id) && !empty($data->subject_id) && !empty($data->day_of_week) && !empty($data->start_time) && !empty($data->end_time)) {
    $schedule->block_id = $data->block_id;
    $schedule->subject_id = $data->subject_id;
    $schedule->instructor_id = $data->instructor_id;
    $schedule->day_of_week = $data->day_of_week;
    $schedule->start_time = $data->start_time;
    $schedule->end_time = $data->end_time;
    $schedule->room = $data->room;

    if ($schedule->create()) {
        http_response_code(201);
        echo json_encode($schedule);
    } else {
        http_response_code(503);
        echo json_encode(array("message" => "Unable to create schedule."));
    }
} else {
    http_response_code(400);
    echo json_encode(array("message" => "Unable to create schedule. Data is incomplete."));
}
?>