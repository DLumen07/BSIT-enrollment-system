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

if (!empty($data->id) && !empty($data->grade)) {
    $grade->id = $data->id;
    $grade->grade = $data->grade;

    if ($grade->update()) {
        http_response_code(200);
        echo json_encode(array("message" => "Grade was updated."));
    } else {
        http_response_code(503);
        echo json_encode(array("message" => "Unable to update grade."));
    }
} else {
    http_response_code(400);
    echo json_encode(array("message" => "Unable to update grade. Data is incomplete."));
}
?>