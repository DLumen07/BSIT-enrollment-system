<?php
include_once '../core.php';
$db = $database->getConnection();

$block = new Block($db);

$stmt = $block->read();
$num = $stmt->rowCount();

if ($num > 0) {
    $blocks_arr = array();
    $blocks_arr["records"] = array();

    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        extract($row);
        $block_item = array(
            "id" => $id,
            "block_name" => $block_name,
            "course" => $course,
            "year_level" => $year_level,
            "specialization" => $specialization
        );
        array_push($blocks_arr["records"], $block_item);
    }

    http_response_code(200);
    echo json_encode($blocks_arr);
} else {
    http_response_code(404);
    echo json_encode(array("message" => "No blocks found."));
}
?>