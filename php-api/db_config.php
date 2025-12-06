<?php
// CORS: allow localhost:3000 with credentials; avoid wildcard when credentials are included.
$allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if ($origin !== '' && in_array($origin, $allowedOrigins, true)) {
    header("Access-Control-Allow-Origin: {$origin}");
    header('Access-Control-Allow-Credentials: true');
} else {
    // Fallback to a single explicit origin to keep credentials mode compatible.
    header("Access-Control-Allow-Origin: {$allowedOrigins[0]}");
    header('Access-Control-Allow-Credentials: true');
}

header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header("Content-Type: application/json; charset=UTF-8");

// Use 127.0.0.1 to avoid MySQL treating 'localhost' as a blocked host or socket path.
define('DB_SERVER', '127.0.0.1');
define('DB_USERNAME', 'root');
define('DB_PASSWORD', '');
define('DB_NAME', 'bsit_enrollment');

$conn = new mysqli(DB_SERVER, DB_USERNAME, DB_PASSWORD, DB_NAME);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
?>
