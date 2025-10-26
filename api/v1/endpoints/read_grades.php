<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

include_once '../database.php';
include_once '../models/grade.php';

$database = new Database();
$db = $database->getConnection();

$grade = new Grade($db);

$grade->student_user_id = isset($_GET['student_user_id']) ? $_GET['student_user_id'] : die();

$stmt = $grade->read();
$num = $stmt->rowCount();

if ($num > 0) {
    $grades_arr = array();
    $grades_arr["records"] = array();

    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        extract($row);
        $grade_item = array(
            "id" => $id,
            "student_user_id" => $student_user_id,
            "subject_id" => $subject_id,
            "grade" => $grade,
            "academic_year" => $academic_year,
            "semester" => $semester
        );
        array_push($grades_arr["records"], $grade_item);
    }
    http_response_code(200);
    echo json_encode($grades_arr);
} else {
    http_response_code(404);
    echo json_encode(array("message" => "No grades found."));
}
?>