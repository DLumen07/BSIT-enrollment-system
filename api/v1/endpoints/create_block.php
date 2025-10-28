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

if (!empty($data->name) && !empty($data->course) && !empty($data->year_level)) {
    $block->name = $data->name;
    $block->course = $data->course;
    $block->year_level = $data->year_level;
    $block->specialization = $data->specialization;
    $block->capacity = $data->capacity;

    if ($block->create()) {
        http_response_code(201);
        echo json_encode($block);
    } else {
        http_response_code(503);
        echo json_encode(array("message" => "Unable to create block."));
    }
} else {
    http_response_code(400);
    echo json_encode(array("message" => "Unable to create block. Data is incomplete."));
}
?>