<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: DELETE");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../database.php';
include_once '../models/block.php';

$database = new Database();
$db = $database->getConnection();

$block = new Block($db);

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->id)) {
    $block->id = $data->id;

    if ($block->delete()) {
        http_response_code(200);
        echo json_encode(array("message" => "Block was deleted."));
    } else {
        http_response_code(503);
        echo json_encode(array("message" => "Unable to delete block."));
    }
} else {
    http_response_code(400);
    echo json_encode(array("message" => "Unable to delete block. Data is incomplete."));
}
?>