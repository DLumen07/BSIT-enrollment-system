<?php
include_once '../core.php';

include_once '../core.php';
include_once '../database.php';
include_once '../models/enrollment_application.php';

require_auth(['Super Admin', 'Admin']);

$database = new Database();
$db = $database->getConnection();

$application = new EnrollmentApplication($db);

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->id) && !empty($data->status)) {
    $application->id = $data->id;
    $application->status = $data->status;
    $application->rejection_reason = isset($data->rejection_reason) ? $data->rejection_reason : '';

    if ($application->updateStatus()) {
        http_response_code(200);
        echo json_encode(array("message" => "Application status was updated."));
    } else {
        http_response_code(503);
        echo json_encode(array("message" => "Unable to update application status."));
    }
} else {
    http_response_code(400);
    echo json_encode(array("message" => "Unable to update application status. Data is incomplete."));
}
?>