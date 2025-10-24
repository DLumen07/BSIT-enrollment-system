<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

include_once '../database.php';
include_once '../models/student_profile.php';

$database = new Database();
$db = $database->getConnection();

$student_profile = new StudentProfile($db);

$stmt = $student_profile->read();
$num = $stmt->rowCount();

if ($num > 0) {
    $student_profiles_arr = array();
    $student_profiles_arr["records"] = array();

    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        extract($row);
        $student_profile_item = array(
            "user_id" => $user_id,
            "student_id_number" => $student_id_number,
            "name" => $name,
            "avatar_url" => $avatar_url,
            "course" => $course,
            "year_level" => $year_level,
            "enrollment_status" => $enrollment_status,
            "block_id" => $block_id,
            "specialization" => $specialization,
            "sex" => $sex,
            "phone_number" => $phone_number,
            "personal_details" => $personal_details
        );
        array_push($student_profiles_arr["records"], $student_profile_item);
    }

    http_response_code(200);
    echo json_encode($student_profiles_arr);
} else {
    http_response_code(404);
    echo json_encode(array("message" => "No student profiles found."));
}
?>