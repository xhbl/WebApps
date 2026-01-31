<?php

/**
 * getnonce.php - Generate one-time nonce for secure login
 */
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if (session_status() === PHP_SESSION_NONE) session_start();

$response = ['success' => false];

try {
    $uname = $_GET['uname'] ?? '';
    if (empty($uname)) {
        $response['message'] = 'Username required';
        echo json_encode($response);
        exit;
    }

    $nonce = bin2hex(random_bytes(32));
    $_SESSION['login_nonce'] = $nonce;
    $_SESSION['nonce_username'] = $uname;
    $_SESSION['nonce_expire'] = time() + 60;

    $response = ['success' => true, 'nonce' => $nonce, 'expire' => 60];
} catch (Exception $e) {
    $response['message'] = 'Failed to generate nonce: ' . $e->getMessage();
}

echo json_encode($response);
