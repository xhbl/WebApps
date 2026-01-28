<?php
require_once 'login.php';
require_once 'impdb.php';

function getUsers($uname=null) {
    $db = DB::vnb();
    if ($uname) {
        $stmt = $db->prepare("SELECT id, name, dispname, time_c FROM vnb_users WHERE name = ? AND name NOT IN ('admin', 'test')");
        $stmt->execute([$uname]);
        $rows = $stmt->fetchAll();
    } else {
        $stmt = $db->query("SELECT id, name, dispname, time_c FROM vnb_users WHERE name NOT IN ('admin', 'test')");
        $rows = $stmt->fetchAll();
    }
    foreach ($rows as &$row) { $row['_new'] = 0; }
    return $rows;
}

function updateUsers($items) {
    $db = DB::vnb();
    $ret = new stdClass();
    $ret->v = false;
    $out = [];
    try {
        $db->beginTransaction();
        foreach ($items as $item) {
            if (!empty($item->_new)) {
                // Hash password before storing
                $hashedPass = hash('sha256', $item->pass);
                $stmt = $db->prepare("INSERT INTO vnb_users (name, pass, dispname) VALUES (?, ?, ?)");
                $stmt->execute([$item->name, $hashedPass, $item->dispname]);
                $item->id = $db->lastInsertId();
                $db->prepare("INSERT INTO vnu_books (user_id, title) VALUES (?, 'Default')")->execute([$item->id]);
                $item->_new = 0;
            } else {
                $sql = "UPDATE vnb_users SET dispname = ?";
                $params = [$item->dispname];
                if (!empty($item->pass)) {
                    $sql .= ", pass = ?";
                    $params[] = hash('sha256', $item->pass); // Hash new password
                }
                $sql .= " WHERE name = ?"; $params[] = $item->name;
                $db->prepare($sql)->execute($params);
            }
            $out[] = $item;
        }
        $db->commit();
        $ret->v = true; $ret->o = $out;
    } catch (Exception $e) {
        if($db) $db->rollBack(); $ret->e = $e->getMessage();
    }
    return $ret;
}

function deleteUsers($items) {
    $db = DB::vnb();
    $stmt = $db->prepare("DELETE FROM vnb_users WHERE name = ?");
    foreach ($items as $item) { $stmt->execute([$item->name]); }
    return true;
}

header('Content-Type: application/json; charset=utf-8');

$logsess = vnb_checklogin($_GET["_sessid"] ?? null);
if ($logsess->success !== 'true' || $logsess->login['uname'] !== 'admin') {
    die(json_encode(['success' => 'false', 'message' => 'Unauthorized']));
}

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents("php://input"));
if ($input && !is_array($input)) $input = [$input];
$response = ['success' => 'false'];

if ($method == 'GET') {
    $response = ['success' => 'true', 'user' => getUsers()];
} elseif ($method == 'PUT' && $input) {
    $res = updateUsers($input);
    if ($res->v) { $response = ['success' => 'true', 'user' => $res->o]; }
    else { $response['message'] = $res->e; }
} elseif ($method == 'DELETE' && $input) {
    if (deleteUsers($input)) $response = ['success' => 'true'];
}
echo json_encode($response);