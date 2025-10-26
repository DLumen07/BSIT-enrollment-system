<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../database.php';
include_once '../models/subject.php';

$database = new Database();
$db = $database->getConnection();

$subject = new Subject($db);

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->subject_code) && !empty($data->subject_name) && !empty($data->description) && !empty($data->units) && !empty($data->course) && !empty($data->year_level)) {
    $subject->subject_code = $data->subject_code;
    $subject->subject_name = $data->subject_name;
    $subject->description = $data->description;
    $subject->units = $data->units;
    $subject->course = $data->course;
    $subject->year_level = $data->year_level;
    $subject->specialization = $data->specialization;
    $subject->prerequisite = $data->prerequisite;

    if ($subject->create()) {
        $subject->readOne();
        http_response_code(201);
        echo json_encode($subject);
    } else {
        http_response_code(503);
        echo json_encode(array("message" => "Unable to create subject."));
    }
} else {
    http_response_code(400);
    echo json_encode(array("message" => "Unable to create subject. Data is incomplete."));
}
?>