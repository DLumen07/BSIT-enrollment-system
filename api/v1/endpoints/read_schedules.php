<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

include_once '../database.php';
include_once '../models/schedule.php';

$database = new Database();
$db = $database->getConnection();

$schedule = new Schedule($db);

$stmt = $schedule->read();
$num = $stmt->rowCount();

if ($num > 0) {
    $schedules_arr = array();
    $schedules_arr["records"] = array();

    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        extract($row);
        $schedule_item = array(
            "id" => $id,
            "block_id" => $block_id,
            "block_name" => $block_name,
            "subject_id" => $subject_id,
            "subject_code" => $subject_code,
            "instructor_id" => $instructor_id,
            "instructor_name" => $instructor_name,
            "day_of_week" => $day_of_week,
            "start_time" => $start_time,
            "end_time" => $end_time,
            "room" => $room
        );
        array_push($schedules_arr["records"], $schedule_item);
    }
    http_response_code(200);
    echo json_encode($schedules_arr);
} else {
    http_response_code(404);
    echo json_encode(array("message" => "No schedules found."));
}
?>