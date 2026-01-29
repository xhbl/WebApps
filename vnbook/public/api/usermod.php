<?php
require_once 'login.php';

function vnb_moduser($dname, $upassold, $upassnew) {
    $uname = $_SESSION['user_name'];
    $retjo = new stdClass();
    $retjo->success = 'false';
    $db = DB::vnb();

    try {
        // 1. Validate old password if changing password
        if (!empty($upassnew)) {
            // Compare hashed old password
            $hashedOldPass = hash('sha256', $upassold);
            $stmt = $db->prepare("SELECT id FROM vnb_users WHERE name = ? AND pass = ?");
            $stmt->execute([$uname, $hashedOldPass]);
            if (!$stmt->fetch()) {
                $retjo->message = "Old password incorrect";
                return $retjo;
            }
        }

        // 2. Build and execute update
        $sql = "UPDATE vnb_users SET dispname = ?";
        $params = [$dname];
        if (!empty($upassnew)) {
            $sql .= ", pass = ?";
            // Hash new password before storing
            $params[] = hash('sha256', $upassnew);
        }
        $sql .= " WHERE name = ?";
        $params[] = $uname;

        $db->prepare($sql)->execute($params);

        // Update session
        $_SESSION['user_dispname'] = $dname;

        $retjo->success = 'true';
        $retjo->login = [
            'sid' => session_id(),
            'uname' => $uname,
            'dname' => $dname
        ];
    } catch (Exception $e) { $retjo->message = $e->getMessage(); }

    return $retjo;
}

header('Content-Type: application/json; charset=utf-8');

// Security Check
$logsess = vnb_checklogin($_POST["_sessid"] ?? null);
if ($logsess->success !== 'true') { die(json_encode($logsess)); }

echo json_encode(vnb_moduser(
    $_POST["dname"] ?? $_SESSION['user_dispname'],
    $_POST["upassold"] ?? '',
    $_POST["upassnew"] ?? ''
));