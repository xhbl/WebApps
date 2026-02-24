<?php
require_once 'login.php';
require_once 'impdb.php';

function getUsers($uname = null)
{
    $db = DB::vnb();
    if ($uname) {
        $stmt = $db->prepare("SELECT id, name, dispname, time_c FROM vnb_users WHERE name = ? AND name != 'admin'");
        $stmt->execute([$uname]);
        $rows = $stmt->fetchAll();
    } else {
        $stmt = $db->query("SELECT id, name, dispname, time_c FROM vnb_users WHERE name != 'admin'");
        $rows = $stmt->fetchAll();
    }
    foreach ($rows as &$row) {
        $row['_new'] = 0;
    }
    return $rows;
}

function getUserStats($uid)
{
    $db = DB::vnb();

    // Get book count
    $stmt = $db->prepare("SELECT COUNT(*) as book_count FROM vnu_books WHERE user_id = ?");
    $stmt->execute([$uid]);
    $bookCount = $stmt->fetch()['book_count'] ?? 0;

    // Get word count (unique words for this user)
    $stmt = $db->prepare("SELECT COUNT(*) as word_count FROM vnu_words WHERE user_id = ?");
    $stmt->execute([$uid]);
    $wordCount = $stmt->fetch()['word_count'] ?? 0;

    // Get last_active from cfg
    $stmt = $db->prepare("SELECT cfg FROM vnb_users WHERE id = ?");
    $stmt->execute([$uid]);
    $row = $stmt->fetch();
    $cfg = json_decode($row['cfg'] ?? '', true);
    $lastActive = $cfg['last_active'] ?? '-';

    return [
        'bookCount' => (int)$bookCount,
        'wordCount' => (int)$wordCount,
        'lastActive' => $lastActive,
    ];
}

function updateUsers($items)
{
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
                $item->_new = 0;
            } else {
                $sql = "UPDATE vnb_users SET dispname = ?";
                $params = [$item->dispname];
                if (!empty($item->pass)) {
                    $sql .= ", pass = ?";
                    $params[] = hash('sha256', $item->pass); // Hash new password
                }
                $sql .= " WHERE name = ?";
                $params[] = $item->name;
                $db->prepare($sql)->execute($params);

                // Fetch updated user data
                $stmt = $db->prepare("SELECT id, name, dispname, time_c FROM vnb_users WHERE name = ?");
                $stmt->execute([$item->name]);
                $row = $stmt->fetch();
                if ($row) {
                    $item->id = $row['id'];
                    $item->name = $row['name'];
                    $item->dispname = $row['dispname'];
                    $item->time_c = $row['time_c'];
                }
            }
            $out[] = $item;
        }
        $db->commit();
        $ret->v = true;
        $ret->o = $out;
    } catch (Exception $e) {
        if ($db) $db->rollBack();
        // Check if error is duplicate entry
        $errorMsg = $e->getMessage();
        if (strpos($errorMsg, 'Duplicate entry') !== false || strpos($errorMsg, '1062') !== false) {
            $ret->e = 'Username already exists';
        } else {
            $ret->e = $errorMsg;
        }
    }
    return $ret;
}

function deleteUsers($items)
{
    $db = DB::vnb();
    $stmt = $db->prepare("DELETE FROM vnb_users WHERE name = ?");
    foreach ($items as $item) {
        $stmt->execute([$item->name]);
    }
    return true;
}

function clearUserData($uid)
{
    $db = DB::vnb();
    if (!$db) {
        error_log('clearUserData: Database connection failed');
        return false;
    }
    try {
        $db->beginTransaction();
        // 删除用户的所有单词
        $stmt = $db->prepare("DELETE FROM vnu_words WHERE user_id = ?");
        $stmt->execute([$uid]);
        // 删除用户的所有单词本
        $stmt = $db->prepare("DELETE FROM vnu_books WHERE user_id = ?");
        $stmt->execute([$uid]);
        // 清空用户的配置
        $stmt = $db->prepare("UPDATE vnb_users SET cfg = NULL WHERE id = ?");
        $stmt->execute([$uid]);
        $db->commit();
        return true;
    } catch (Exception $e) {
        if ($db) $db->rollBack();
        error_log('clearUserData error: ' . $e->getMessage());
        return false;
    }
}

header('Content-Type: application/json; charset=utf-8');

$logsess = vnb_checklogin($_GET["_sessid"] ?? null);
if ($logsess->success !== true || $logsess->login['uname'] !== 'admin') {
    die(json_encode(['success' => false, 'message' => 'Unauthorized']));
}

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents("php://input"));
if ($input && !is_array($input)) $input = [$input];
$response = ['success' => false];

if ($method == 'GET') {
    // Check if requesting user stats
    $uid = $_GET['stats'] ?? null;
    if ($uid) {
        $response = ['success' => true, 'stats' => getUserStats((int)$uid)];
    } else {
        $response = ['success' => true, 'user' => getUsers()];
    }
} elseif ($method == 'POST') {
    // 清空用户数据
    $action = $_GET['action'] ?? null;
    if ($action === 'clear') {
        $uid = $_GET['uid'] ?? null;
        if (!$uid) {
            $response['message'] = 'Missing user ID';
        } else {
            $result = clearUserData((int)$uid);
            if ($result) {
                $response = ['success' => true];
            } else {
                $response['message'] = 'Failed to clear user data';
            }
        }
    } else {
        $response['message'] = 'Invalid action';
    }
} elseif ($method == 'PUT' && $input) {
    $res = updateUsers($input);
    if ($res->v) {
        $response = ['success' => true, 'user' => $res->o];
    } else {
        $response['message'] = $res->e;
    }
} elseif ($method == 'DELETE' && $input) {
    if (deleteUsers($input)) $response = ['success' => true];
}
echo json_encode($response);
