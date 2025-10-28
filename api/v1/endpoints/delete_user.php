<?php
include_once '../core.php';

include_once '../core.php';
include_once '../database.php';
include_once '../models/user.php';

require_auth(['Super Admin']);

$database = new Database();
$db = $database->getConnection();

$user = new User($db);

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->id)) {
    $user->id = $data->id;

    if ($user->delete()) {
        http_response_code(200);
        echo json_encode(array("message" => "User was deleted."));
    } else {
        http_response_code(503);
        echo json_encode(array("message" => "Unable to delete user."));
    }
} else {
    http_response_code(400);
    echo json_encode(array("message" => "Unable to delete user. Data is incomplete."));
}
?>