<?php
include_once '../core.php';

$database = new Database();
$db = $database->getConnection();

$administrator = new Administrator($db);

$stmt = $administrator->read();
$num = $stmt->rowCount();

if ($num > 0) {
    $administrators_arr = array();
    $administrators_arr["records"] = array();

    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        extract($row);
        $administrator_item = array(
            "id" => $id,
            "name" => $name,
            "email" => $email,
            "role" => $role // Include role in the response
        );
        array_push($administrators_arr["records"], $administrator_item);
    }

    http_response_code(200);
    echo json_encode($administrators_arr);
} else {
    http_response_code(404);
    echo json_encode(array("message" => "No administrators found."));
}
?>