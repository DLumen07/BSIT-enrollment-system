<?php
include_once '../core.php';

include_once '../database.php';
include_once '../models/student_profile.php';

$database = new Database();
$db = $database->getConnection();

$student_profile = new StudentProfile($db);

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->user_id)) {
    $student_profile->user_id = $data->user_id;
    $student_profile->student_id_number = $data->student_id_number;
    $student_profile->name = $data->name;
    $student_profile->avatar_url = $data->avatar_url;
    $student_profile->course = $data->course;
    $student_profile->year_level = $data->year_level;
    $student_profile->enrollment_status = $data->enrollment_status;
    $student_profile->block_id = $data->block_id;
    $student_profile->specialization = $data->specialization;
    $student_profile->sex = $data->sex;
    $student_profile->phone_number = $data->phone_number;
    $student_profile->middle_name = $data->middle_name;
    $student_profile->birthdate = $data->birthdate;
    $student_profile->current_address = $data->current_address;
    $student_profile->permanent_address = $data->permanent_address;
    $student_profile->nationality = $data->nationality;
    $student_profile->religion = $data->religion;
    $student_profile->dialect = $data->dialect;
    $student_profile->civil_status = $data->civil_status;
    $student_profile->status = $data->status;
    $student_profile->fathers_name = $data->fathers_name;
    $student_profile->fathers_occupation = $data->fathers_occupation;
    $student_profile->mothers_name = $data->mothers_name;
    $student_profile->mothers_occupation = $data->mothers_occupation;
    $student_profile->guardians_name = $data->guardians_name;
    $student_profile->guardians_occupation = $data->guardians_occupation;
    $student_profile->guardians_address = $data->guardians_address;
    $student_profile->living_with_family = $data->living_with_family;
    $student_profile->boarding = $data->boarding;
    $student_profile->differently_abled = $data->differently_abled;
    $student_profile->disability = $data->disability;
    $student_profile->minority_group = $data->minority_group;
    $student_profile->minority = $data->minority;
    $student_profile->elementary_school = $data->elementary_school;
    $student_profile->elem_year_graduated = $data->elem_year_graduated;
    $student_profile->secondary_school = $data->secondary_school;
    $student_profile->secondary_year_graduated = $data->secondary_year_graduated;
    $student_profile->collegiate_school = $data->collegiate_school;
    $student_profile->collegiate_year_graduated = $data->collegiate_year_graduated;
    $student_profile->emergency_contact_name = $data->emergency_contact_name;
    $student_profile->emergency_contact_address = $data->emergency_contact_address;
    $student_profile->emergency_contact_number = $data->emergency_contact_number;

    if ($student_profile->create()) {
        http_response_code(201);
        echo json_encode(array("message" => "Student profile was created."));
    } else {
        http_response_code(503);
        echo json_encode(array("message" => "Unable to create student profile."));
    }
} else {
    http_response_code(400);
    echo json_encode(array("message" => "Unable to create student profile. Data is incomplete."));
}
?>