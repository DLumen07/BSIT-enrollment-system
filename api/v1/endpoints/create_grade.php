<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../database.php';
include_once '../models/grade.php';

$database = new Database();
$db = $database->getConnection();

$grade = new Grade($db);

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->student_user_id) && !empty($data->subject_id) && !empty($data->grade) && !empty($data->academic_year) && !empty($data->semester)) {
    $grade->student_user_id = $data->student_user_id;
    $grade->subject_id = $data->subject_id;
    $grade->grade = $data->grade;
    $grade->academic_year = $data->academic_year;
    $grade->semester = $data->semester;

    if ($grade->create()) {
        http_response_code(201);
        echo json_encode(array("message" => "Grade was created."));
    } else {
        http_response_code(503);
        echo json_encode(array("message" => "Unable to create grade."));
    }
} else {
    http_response_code(400);
    echo json_encode(array("message" => "Unable to create grade. Data is incomplete."));
}
?>