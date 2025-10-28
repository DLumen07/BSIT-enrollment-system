<?php
include_once '../core.php';

include_once '../database.php';
include_once '../models/student_profile.php';

$database = new Database();
$db = $database->getConnection();

$student = new StudentProfile($db);

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->user_id) && !empty($data->name) && !empty($data->course) && !empty($data->year_level)) {
    $student->user_id = $data->user_id;
    $student->name = $data->name;
    $student->avatar_url = $data->avatar_url;
    $student->course = $data->course;
    $student->year_level = $data->year_level;
    $student->specialization = $data->specialization;
    $student->block_id = $data->block_id;
    $student->sex = $data->sex;
    $student->phone_number = $data->phone_number;
    $student->middle_name = $data->middle_name;
    $student->birthdate = $data->birthdate;
    $student->current_address = $data->current_address;
    $student->permanent_address = $data->permanent_address;
    $student->nationality = $data->nationality;
    $student->religion = $data->religion;
    $student->dialect = $data->dialect;
    $student->civil_status = $data->civil_status;
    $student->status = $data->status;
    $student->fathers_name = $data->fathers_name;
    $student->fathers_occupation = $data->fathers_occupation;
    $student->mothers_name = $data->mothers_name;
    $student->mothers_occupation = $data->mothers_occupation;
    $student->guardians_name = $data->guardians_name;
    $student->guardians_occupation = $data->guardians_occupation;
    $student->guardians_address = $data->guardians_address;
    $student->living_with_family = $data->living_with_family;
    $student->boarding = $data->boarding;
    $student->differently_abled = $data->differently_abled;
    $student->disability = $data->disability;
    $student->minority_group = $data->minority_group;
    $student->minority = $data->minority;
    $student->elementary_school = $data->elementary_school;
    $student->elem_year_graduated = $data->elem_year_graduated;
    $student->secondary_school = $data->secondary_school;
    $student->secondary_year_graduated = $data->secondary_year_graduated;
    $student->collegiate_school = $data->collegiate_school;
    $student->collegiate_year_graduated = $data->collegiate_year_graduated;
    $student->emergency_contact_name = $data->emergency_contact_name;
    $student->emergency_contact_address = $data->emergency_contact_address;
    $student->emergency_contact_number = $data->emergency_contact_number;

    if ($student->update()) {
        http_response_code(200);
        echo json_encode(array("message" => "Student profile was updated."));
    } else {
        http_response_code(503);
        echo json_encode(array("message" => "Unable to update student profile."));
    }
} else {
    http_response_code(400);
    echo json_encode(array("message" => "Unable to update student profile. Data is incomplete."));
}
?>