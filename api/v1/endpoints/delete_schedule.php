<?php
include_once '../core.php';

include_once '../core.php';
include_once '../database.php';
include_once '../models/schedule.php';

require_auth(['Super Admin', 'Admin']);

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