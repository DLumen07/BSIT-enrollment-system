<?php
include_once '../core.php';

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

session_unset();
session_destroy();

http_response_code(200);
echo json_encode(array("message" => "Logout successful."));
?>