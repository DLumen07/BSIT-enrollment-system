<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../database.php';
include_once '../models/block.php';

$database = new Database();
$db = $database->getConnection();

$block = new Block($db);

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->block_name) && !empty($data->course) && !empty($data->year_level)) {
    $block->block_name = $data->block_name;
    $block->course = $data->course;
    $block->year_level = $data->year_level;
    $block->specialization = $data->specialization;

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