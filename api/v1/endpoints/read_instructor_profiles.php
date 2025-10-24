<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

include_once '../database.php';
include_once '../models/instructor_profile.php';

$database = new Database();
$db = $database->getConnection();

$instructor_profile = new InstructorProfile($db);

$stmt = $instructor_profile->read();
$num = $stmt->rowCount();

if ($num > 0) {
    $instructor_profiles_arr = array();
    $instructor_profiles_arr["records"] = array();

    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        extract($row);
        $instructor_profile_item = array(
            "user_id" => $user_id,
            "name" => $name,
            "avatar_url" => $avatar_url,
            "department" => $department
        );
        array_push($instructor_profiles_arr["records"], $instructor_profile_item);
    }

    http_response_code(200);
    echo json_encode($instructor_profiles_arr);
} else {
    http_response_code(404);
    echo json_encode(array("message" => "No instructor profiles found."));
}
?>