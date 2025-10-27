<?php
include_once '../core.php';

$database = new Database();
$db = $database->getConnection();

$admin_profile = new AdminProfile($db);

$stmt = $admin_profile->read();
$num = $stmt->rowCount();

if ($num > 0) {
    $admin_profiles_arr = array();
    $admin_profiles_arr["records"] = array();

    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        extract($row);
        $admin_profile_item = array(
            "user_id" => $user_id,
            "name" => $name,
            "avatar_url" => $avatar_url,
            "admin_role" => $admin_role,
            "email" => $email
        );
        array_push($admin_profiles_arr["records"], $admin_profile_item);
    }
    http_response_code(200);
    echo json_encode($admin_profiles_arr);
} else {
    http_response_code(404);
    echo json_encode(array("message" => "No admin profiles found."));
}
?>