<?php
include_once '../core.php';

include_once '../core.php';
include_once '../database.php';
include_once '../models/student_subject.php';

require_auth(['Super Admin', 'Admin']);

$database = new Database();
$db = $database->getConnection();

$enrollment = new StudentSubject($db);

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->student_user_id) && !empty($data->subject_id)) {
    $enrollment->student_user_id = $data->student_user_id;
    $enrollment->subject_id = $data->subject_id;

    if ($enrollment->create()) {
        http_response_code(201);
        echo json_encode(array("message" => "Student was enrolled."));
    } else {
        http_response_code(503);
        echo json_encode(array("message" => "Unable to enroll student."));
    }
} else {
    http_response_code(400);
    echo json_encode(array("message" => "Unable to enroll student. Data is incomplete."));
}
?>