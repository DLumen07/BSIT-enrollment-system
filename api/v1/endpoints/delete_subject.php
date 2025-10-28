<?php
include_once '../core.php';

include_once '../core.php';
include_once '../database.php';
include_once '../models/subject.php';

require_auth(['Super Admin', 'Admin']);

$database = new Database();
$db = $database->getConnection();

$subject = new Subject($db);

$data = json_decode(file_get_contents("php://input"));

if (!empty($data->id)) {
    $subject->id = $data->id;

    if ($subject->delete()) {
        http_response_code(200);
        echo json_encode(array("message" => "Subject was deleted."));
    } else {
        http_response_code(503);
        echo json_encode(array("message" => "Unable to delete subject."));
    }
} else {
    http_response_code(400);
    echo json_encode(array("message" => "Unable to delete subject. Data is incomplete."));
}
?>