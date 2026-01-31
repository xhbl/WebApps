<?php
header('Content-Type: application/json; charset=utf-8');

try {
    include_once 'login.php';
    $act = $_GET["act"] ?? null;

    if ($act == 'check') {
        echo json_encode(vnb_checklogin($_GET["_sessid"] ?? null));
    } elseif ($act == 'logon') {
        $uname = $_POST["uname"] ?? '';
        $response = $_POST["response"] ?? '';
        
        // Check if database exists
        $db = DB::vnb();
        $dbExists = ($db !== null);
        
        // If admin attempting login and DB doesn't exist, validate init password
        if ($uname === 'admin' && !$dbExists) {
            // Verify init password (initvnb) using nonce-based validation
            if (session_status() === PHP_SESSION_NONE) session_start();
            $nonce = $_SESSION['login_nonce'] ?? '';
            $nonceUser = $_SESSION['nonce_username'] ?? '';
            
            // Validate nonce
            if (!$nonce || $nonceUser !== $uname) {
                echo json_encode(['success' => 'false', 'message' => 'Invalid nonce. Please retry login.']);
                exit;
            }
            
            // Calculate expected response: SHA256(SHA256(C_ADMIN_PASSINIT) + nonce)
            $initPasswordHash = hash('sha256', C_ADMIN_PASSINIT);
            $expectedResponse = hash('sha256', $initPasswordHash . $nonce);
            
            // Verify password
            if ($response !== $expectedResponse) {
                echo json_encode(['success' => 'false', 'message' => 'Invalid initialization password.']);
                exit;
            }
            
            // Password correct, initialize database
            include_once 'impdb.php';
            $initRes = createVnbInitData();
            if (!$initRes->v) {
                echo json_encode(['success' => 'false', 'message' => 'Database initialization failed.']);
                exit;
            }
        }
        // If database doesn't exist and not admin, require initialization
        else if (!$dbExists) {
            echo json_encode(['success' => 'false', 'message' => 'Initialization credentials required.']);
            exit;
        }
        
        echo json_encode(vnb_dologin($uname, $response, isset($_POST["keepme"])));
    } elseif ($act == 'logout') {
        vnb_dologout();
        echo json_encode(['success' => true]);
    }
} catch (Exception $e) {
    echo json_encode(['error' => $e->getMessage()]);
}