<?php
include_once '../core.php';

include_once '../database.php';
include_once '../models/user.php';
include_once '../models/admin_profile.php';

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

$database = new Database();
$db = $database->getConnection();

$user = new User($db);

$data = json_decode(file_get_contents("php://input"));

$user->email = $data->email;
$email_exists = $user->emailExists();

if ($email_exists && password_verify($data->password, $user->password_hash)) {
    $_SESSION['user_id'] = $user->id;
    $_SESSION['role'] = $user->role;

    if ($user->role === 'admin') {
        $admin_profile = new AdminProfile($db);
        $admin_profile->user_id = $user->id;
        $admin_profile->readOne();
        $_SESSION['admin_role'] = $admin_profile->admin_role;
    }

    $user_arr = array(
        "id" => $user->id,
        "email" => $user->email,
        "role" => $user->role,
        "admin_role" => $user->role === 'admin' ? $admin_profile->admin_role : null
    );
    http_response_code(200);
    echo json_encode($user_arr);
} else {
    http_response_code(401);
    echo json_encode(array("message" => "Invalid credentials."));
}
?>