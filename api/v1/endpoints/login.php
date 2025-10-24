<?php
require_once __DIR__ . '/../../models/user.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = json_decode(file_get_contents('php://input'), true);

    if (isset($data['email']) && isset($data['password'])) {
        $user = new User();
        $loggedInUser = $user->login($data['email'], $data['password']);

        if ($loggedInUser) {
            // In a real application, you would generate a JWT token here.
            // For simplicity, we'll return the user data.
            echo json_encode(['status' => 'success', 'user' => $loggedInUser]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Invalid credentials']);
        }
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Email and password are required']);
    }
} else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method']);
}
