<?php
header('Content-Type: application/json; charset=utf-8');

try {
    include_once 'login.php';
    $act = $_GET["act"] ?? null;

    if ($act == 'check') {
        // 前端显式检查登录状态时，强制刷新数据库以获取最新配置(cfg)
        echo json_encode(vnb_checklogin($_GET["_sessid"] ?? null, true));
    } elseif ($act == 'logon') {
        $uname = $_POST["uname"] ?? '';
        $response = $_POST["response"] ?? '';

        // Check database status: 'ok', 'not_exists', 'connect_fail'
        $dbStatus = 'ok';
        $db = DB::vnb();
        if ($db !== null) {
            $dbStatus = 'ok';
        } else if ($uname === 'admin') {
            $connError = null;
            if (DB::testConnection($connError)) {
                $dbStatus = 'not_exists';
            } else {
                error_log('Database connect failed: ' . $connError);
                $dbStatus = 'connect_fail';
            }
        } else {
            $dbStatus = 'not_exists';
        }

        // If admin attempting login and DB not exists, verify init password
        if ($uname === 'admin' && $dbStatus === 'not_exists') {
            // Verify init password (initvnb) using nonce-based validation
            if (session_status() === PHP_SESSION_NONE) session_start();
            $nonce = $_SESSION['login_nonce'] ?? '';
            $nonceUser = $_SESSION['nonce_username'] ?? '';

            // Validate nonce
            if (!$nonce || $nonceUser !== $uname) {
                echo json_encode(['success' => false, 'message' => 'Invalid nonce. Please retry login.']);
                exit;
            }

            // Calculate expected response: SHA256(SHA256(C_ADMIN_PASSINIT) + nonce)
            $initPasswordHash = hash('sha256', C_ADMIN_PASSINIT);
            $expectedResponse = hash('sha256', $initPasswordHash . $nonce);

            // Verify password
            if ($response !== $expectedResponse) {
                echo json_encode(['success' => false, 'message' => 'Invalid initialization password.']);
                exit;
            }

            // Password correct, initialize database
            include_once 'impdb.php';
            $initRes = createVnbInitData();
            if (!$initRes->v) {
                echo json_encode(['success' => false, 'message' => 'Database initialization failed.']);
                exit;
            }

            // Initialize base dictionary database (only if it doesn't exist)
            try {
                $tmpPdo = new PDO("mysql:host=" . C_VNB_DB_HOST, C_VNB_DB_USER, C_VNB_DB_PASS);
                $stmt = $tmpPdo->query("SHOW DATABASES LIKE '" . C_DB_BASE . "'");
                $dbExists = $stmt->fetch() !== false;
                
                if (!$dbExists) {
                    $baseDictRes = createBaseDictInitData();
                    if (!$baseDictRes->v) {
                        echo json_encode(['success' => false, 'message' => 'Base dictionary initialization failed: ' . ($baseDictRes->e ?? 'Unknown error')]);
                        exit;
                    }
                }
            } catch (Exception $e) {
                echo json_encode(['success' => false, 'message' => 'Failed to check base dictionary database status: ' . $e->getMessage()]);
                exit;
            }
        }
        // If database connection failed, return immediately
        else if ($dbStatus === 'connect_fail') {
            echo json_encode(['success' => false, 'message' => 'Database connection failed']);
            exit;
        }
        // If database does not exist and not admin, require initialization
        else if ($dbStatus === 'not_exists') {
            echo json_encode(['success' => false, 'message' => 'Initialization credentials required.']);
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
