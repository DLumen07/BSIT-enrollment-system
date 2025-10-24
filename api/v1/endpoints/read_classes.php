<?php
include_once '../core.php';
include_once '../database.php';
include_once '../models/course_class.php';

$database = new Database();
$db = $database->getConnection();

$class = new CourseClass($db);

$stmt = $class->read();
$num = $stmt->rowCount();

if ($num > 0) {
    $classes_arr = array();
    $classes_arr["records"] = array();

    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        extract($row);
        $class_item = array(
            "id" => $id,
            "subject_id" => $subject_id,
            "instructor_id" => $instructor_id,
            "block_id" => $block_id,
            "room" => $room,
            "day_of_week" => $day_of_week,
            "start_time" => $start_time,
            "end_time" => $end_time
        );
        array_push($classes_arr["records"], $class_item);
    }

    http_response_code(200);
    echo json_encode($classes_arr);
} else {
    http_response_code(404);
    echo json_encode(array("message" => "No classes found."));
}
?>