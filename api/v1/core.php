<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Start the session if it's not already started
if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

// Function to check if a user is authenticated and has the required role
function require_auth($allowed_roles = []) {
    // Check if user is logged in
    if (!isset($_SESSION['user_id']) || !isset($_SESSION['role'])) {
        http_response_code(401); // Unauthorized
        echo json_encode(array("message" => "Authentication required."));
        exit();
    }

    $user_role = $_SESSION['role'];
    $user_admin_role = $_SESSION['admin_role'] ?? null;

    // The 'admin' role from the `users` table is a prerequisite for any specific admin role
    if ($user_role !== 'admin') {
        http_response_code(403); // Forbidden
        echo json_encode(array("message" => "You do not have permission to access this resource."));
        exit();
    }

    // If specific admin roles are required, check against them
    if (!empty($allowed_roles) && !in_array($user_admin_role, $allowed_roles)) {
        http_response_code(403); // Forbidden
        echo json_encode(array("message" => "You do not have the necessary permissions for this action."));
        exit();
    }
}
?>
