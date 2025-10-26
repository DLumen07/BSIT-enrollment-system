<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: PUT");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../database.php';
include_once '../models/grade.php';

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