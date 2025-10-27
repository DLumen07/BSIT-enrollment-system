<?php
include_once '../core.php';

include_once '../core.php';
include_once '../database.php';
include_once '../models/schedule.php';

require_auth(['Super Admin', 'Admin']);

$database = new Database();
$db = $database->getConnection();

$schedule = new Schedule($db);

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->id) && !empty($data->block_id) && !empty($data->subject_id) && !empty($data->day_of_week) && !empty($data->start_time) && !empty($data->end_time)) {
    $schedule->id = $data->id;
    $schedule->block_id = $data->block_id;
    $schedule->subject_id = $data->subject_id;
    $schedule->instructor_id = $data->instructor_id;
    $schedule->day_of_week = $data->day_of_week;
    $schedule->start_time = $data->start_time;
    $schedule->end_time = $data->end_time;
    $schedule->room = $data->room;

    if ($schedule->update()) {
        http_response_code(200);
        echo json_encode(array("message" => "Schedule was updated."));
    } else {
        http_response_code(503);
        echo json_encode(array("message" => "Unable to update schedule."));
    }
} else {
    http_response_code(400);
    echo json_encode(array("message" => "Unable to update schedule. Data is incomplete."));
}
?>