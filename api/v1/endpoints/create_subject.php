<?php
include_once '../core.php';

$database = new Database();
$db = $database->getConnection();

$subject = new Subject($db);

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->code) && !empty($data->description) && !empty($data->units) && !empty($data->year_level)) {
    $subject->code = $data->code;
    $subject->description = $data->description;
    $subject->units = $data->units;
    $subject->prerequisite_id = $data->prerequisite_id;
    $subject->year_level = $data->year_level;

    if ($subject->create()) {
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