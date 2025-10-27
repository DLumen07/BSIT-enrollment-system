<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../database.php';
include_once '../models/user.php';

$database = new Database();
$db = $database->getConnection();

$user = new User($db);

$data = json_decode(file_get_contents("php://input"));

$user->email = $data->email;
$email_exists = $user->emailExists();

if ($email_exists && password_verify($data->password, $user->password_hash)) {
    $user_arr = array(
        "id" => $user->id,
        "email" => $user->email,
        "role" => $user->role
    );
    http_response_code(200);
    echo json_encode($user_arr);
} else {
    http_response_code(401);
    echo json_encode(array("message" => "Invalid credentials."));
}
?>