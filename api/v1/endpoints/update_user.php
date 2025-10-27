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

if (!empty($data->id) && !empty($data->email) && !empty($data->role)) {
    if ($data->role === 'admin' && $_SESSION['admin_role'] !== 'Super Admin') {
        http_response_code(403);
        echo json_encode(array("message" => "Only Super Admins can modify other admin users."));
        exit();
    }

    $user->id = $data->id;
    $user->email = $data->email;
    $user->role = $data->role;
    if (!empty($data->password)) {
        $user->password = $data->password;
    }

    if ($user->update()) {
        http_response_code(200);
        echo json_encode(array("message" => "User was updated."));
    } else {
        http_response_code(503);
        echo json_encode(array("message" => "Unable to update user."));
    }
} else {
    http_response_code(400);
    echo json_encode(array("message" => "Unable to update user. Data is incomplete."));
}
?>