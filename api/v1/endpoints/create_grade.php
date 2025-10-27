<?php
include_once '../core.php';

include_once '../core.php';
include_once '../database.php';
include_once '../models/grade.php';

require_auth(['Super Admin', 'Admin']);

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
        echo json_encode($grade);
    } else {
        http_response_code(503);
        echo json_encode(array("message" => "Unable to create grade."));
    }
} else {
    http_response_code(400);
    echo json_encode(array("message" => "Unable to create grade. Data is incomplete."));
}
?>