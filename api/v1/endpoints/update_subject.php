<?php
include_once '../core.php';

include_once '../core.php';
include_once '../database.php';
include_once '../models/subject.php';

require_auth(['Super Admin', 'Admin']);

$database = new Database();
$db = $database->getConnection();

$subject = new Subject($db);

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->id) && !empty($data->code) && !empty($data->description) && !empty($data->units) && !empty($data->year_level)) {
    $subject->id = $data->id;
    $subject->code = $data->code;
    $subject->description = $data->description;
    $subject->units = $data->units;
    $subject->prerequisite_id = $data->prerequisite_id;
    $subject->year_level = $data->year_level;

    if ($subject->update()) {
        http_response_code(200);
        echo json_encode(array("message" => "Subject was updated."));
    } else {
        http_response_code(503);
        echo json_encode(array("message" => "Unable to update subject."));
    }
} else {
    http_response_code(400);
    echo json_encode(array("message" => "Unable to update subject. Data is incomplete."));
}
?>