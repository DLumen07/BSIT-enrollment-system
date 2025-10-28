<?php
include_once '../core.php';

include_once '../core.php';
include_once '../database.php';
include_once '../models/block.php';

require_auth(['Super Admin', 'Admin']);

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