<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: DELETE");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../database.php';
include_once '../models/student_profile.php';
include_once '../models/user.php';

$database = new Database();
$db = $database->getConnection();

$student = new StudentProfile($db);
$user = new User($db);

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->user_id)) {
    $student->user_id = $data->user_id;
    $user->id = $data->user_id;

    if ($student->delete() && $user->delete()) {
        http_response_code(200);
        echo json_encode(array("message" => "Student was deleted."));
    } else {
        http_response_code(503);
        echo json_encode(array("message" => "Unable to delete student."));
    }
} else {
    http_response_code(400);
    echo json_encode(array("message" => "Unable to delete student. Data is incomplete."));
}
?>