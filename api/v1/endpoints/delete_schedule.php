<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: DELETE");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../database.php';
include_once '../models/schedule.php';

$database = new Database();
$db = $database->getConnection();

$schedule = new Schedule($db);

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->id)) {
    $schedule->id = $data->id;

    if ($schedule->delete()) {
        http_response_code(200);
        echo json_encode(array("message" => "Schedule was deleted."));
    } else {
        http_response_code(503);
        echo json_encode(array("message" => "Unable to delete schedule."));
    }
} else {
    http_response_code(400);
    echo json_encode(array("message" => "Unable to delete schedule. Data is incomplete."));
}
?>