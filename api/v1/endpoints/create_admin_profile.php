<?php
include_once '../core.php';
include_once '../database.php';
include_once '../models/admin_profile.php';

$database = new Database();
$db = $database->getConnection();

$admin_profile = new AdminProfile($db);

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->user_id)) {
    $admin_profile->user_id = $data->user_id;
    $admin_profile->name = $data->name;
    $admin_profile->avatar_url = $data->avatar_url;
    $admin_profile->admin_role = $data->admin_role;

    if ($admin_profile->create()) {
        http_response_code(201);
        echo json_encode(array("message" => "Admin profile was created."));
    } else {
        http_response_code(503);
        echo json_encode(array("message" => "Unable to create admin profile."));
    }
} else {
    http_response_code(400);
    echo json_encode(array("message" => "Unable to create admin profile. Data is incomplete."));
}
?>