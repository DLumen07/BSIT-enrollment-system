<?php
include_once '../core.php';

include_once '../core.php';
include_once '../database.php';
include_once '../models/user.php';

require_auth(['Super Admin', 'Admin']);

$database = new Database();
$db = $database->getConnection();

$user = new User($db);

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->email) && !empty($data->password) && !empty($data->role)) {
    if ($data->role === 'admin' && $_SESSION['admin_role'] !== 'Super Admin') {
        http_response_code(403);
        echo json_encode(array("message" => "Only Super Admins can create other admin users."));
        exit();
    }

    $user->email = $data->email;
    $user->password = $data->password;
    $user->role = $data->role;

    if ($user->create()) {
        http_response_code(201);
        echo json_encode($user);
    } else {
        http_response_code(503);
        echo json_encode(array("message" => "Unable to create user."));
    }
} else {
    http_response_code(400);
    echo json_encode(array("message" => "Unable to create user. Data is incomplete."));
}
?>