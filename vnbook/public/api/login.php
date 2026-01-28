<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'db.php';

function vnb_sessname() { return 'VNBSESSID'; }

function vnb_checklogin($sid = null) {
    $retjo = new stdClass();
    $retjo->success = 'false';
    $vnbsess = !empty($_COOKIE[vnb_sessname()]) ? explode('@', $_COOKIE[vnb_sessname()]) : ['', '', ''];
    
    if (empty($sid)) {
        if (empty($vnbsess[1])) return $retjo;
        session_id($vnbsess[1]);
    } else {
        session_id($sid);
    }
    
    if (session_status() === PHP_SESSION_NONE) session_start();
    
    if (empty($_SESSION['user_name'])) {
        if (empty($vnbsess[2]) || $vnbsess[2] != md5($vnbsess[0].'@'.session_id())) return $retjo;
        $db = DB::vnb();
        $stmt = $db->prepare("SELECT id, name, dispname FROM vnb_users WHERE name = ?");
        $stmt->execute([$vnbsess[0]]);
        if ($row = $stmt->fetch()) {
            $_SESSION['user_id'] = $row['id'];
            $_SESSION['user_name'] = $row['name'];
            $_SESSION['user_dispname'] = $row['dispname'];
        } else { return $retjo; }
    }

    $retjo->success = 'true';
    $retjo->login = ['sid' => session_id(), 'uid' => $_SESSION['user_id'], 'uname' => $_SESSION['user_name'], 'dname' => $_SESSION['user_dispname']];
    return $retjo;
}

function vnb_dologin($uname, $response_hash, $keepme) {
    $retjo = new stdClass();
    $retjo->success = 'false';
    
    try {
        if (session_status() === PHP_SESSION_NONE) session_start();
        
        // Verify nonce
        if (empty($_SESSION['login_nonce']) || empty($_SESSION['nonce_expire'])) {
            $retjo->message = "Nonce required. Please retry login.";
            return $retjo;
        }
        if ($_SESSION['nonce_expire'] < time()) {
            $retjo->message = "Nonce expired. Please retry login.";
            unset($_SESSION['login_nonce'], $_SESSION['nonce_username'], $_SESSION['nonce_expire']);
            return $retjo;
        }
        if ($_SESSION['nonce_username'] !== $uname) {
            $retjo->message = "Nonce username mismatch.";
            return $retjo;
        }
        
        $nonce = $_SESSION['login_nonce'];
        $db = DB::vnb();
        $isInitialization = false;
        $storedHash = null;
        
        // Check initialization scenario
        if (!$db || $uname === C_ADMIN_NAME) {
            $storedHash = hash('sha256', C_ADMIN_PASSINIT);
            $isInitialization = true;
        } else {
            $stmt = $db->prepare("SELECT id, name, pass, dispname FROM vnb_users WHERE name = ?");
            $stmt->execute([trim($uname)]);
            $row = $stmt->fetch();
            
            if (!$row) {
                unset($_SESSION['login_nonce'], $_SESSION['nonce_username'], $_SESSION['nonce_expire']);
                $retjo->message = "Invalid username or password";
                return $retjo;
            }
            $storedHash = $row['pass'];
        }
        
        // Calculate expected: Hash(storedHash + nonce)
        $expected = hash('sha256', $storedHash . $nonce);
        unset($_SESSION['login_nonce'], $_SESSION['nonce_username'], $_SESSION['nonce_expire']);
        
        if ($expected !== $response_hash) {
            $retjo->message = "Invalid username or password";
            return $retjo;
        }
        
        // Success
        if (session_id()) session_destroy();
        session_start();
        
        if ($isInitialization) {
            $_SESSION['user_id'] = 1;
            $_SESSION['user_name'] = 'admin';
            $_SESSION['user_dispname'] = 'Administrator';
            $sid = session_id();
            $cookie_str = 'admin@'.$sid.'@'.md5('admin@'.$sid);
            $expiry = $keepme ? time() + 3600*24*365 : 0;
            setcookie(vnb_sessname(), $cookie_str, $expiry, '/');
            $retjo->success = 'true';
            $retjo->login = ['sid' => $sid, 'uid' => 1, 'uname' => 'admin', 'dname' => 'Administrator'];
        } else {
            $_SESSION['user_id'] = $row['id'];
            $_SESSION['user_name'] = $row['name'];
            $_SESSION['user_dispname'] = $row['dispname'];
            $sid = session_id();
            $cookie_str = $row['name'].'@'.$sid.'@'.md5($row['name'].'@'.$sid);
            $expiry = $keepme ? time() + 3600*24*365 : 0;
            setcookie(vnb_sessname(), $cookie_str, $expiry, '/');
            $retjo->success = 'true';
            $retjo->login = ['sid' => $sid, 'uid' => $row['id'], 'uname' => $row['name'], 'dname' => $row['dispname']];
        }
    } catch (Exception $e) {
        unset($_SESSION['login_nonce'], $_SESSION['nonce_username'], $_SESSION['nonce_expire']);
        $retjo->message = "Login error: " . $e->getMessage();
    }
    return $retjo;
}

function vnb_dologout() {
    if (session_status() === PHP_SESSION_NONE) session_start();
    session_destroy();
    setcookie(vnb_sessname(), '', time() - 3600, '/');
}