<?php
require_once 'utils.php';
require_once 'db.php';
require_once 'login.php';
require_once 'impdb.php';

header('Content-Type: application/json; charset=utf-8');

// 验证登录和管理员权限
$logsess = vnb_checklogin($_GET["_sessid"] ?? null);
if ($logsess->success !== true || $logsess->login['uname'] !== 'admin') {
    die(json_encode(['success' => false, 'message' => 'Unauthorized']));
}

$response = ['success' => false];

$method = $_SERVER['REQUEST_METHOD'];

if ($method == 'GET') {
    $action = $_GET['action'] ?? null;
    
    if ($action === 'info') {
        // 获取系统信息
        $info = [];
        
        // Web服务器信息
        $info['serverSoftware'] = $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown';
        
        // PHP版本
        $info['phpVersion'] = phpversion();
        
        // 数据库信息
        $db = DB::vnb();
        if ($db) {
            // 用户数据库名称
            $info['vnbDbName'] = C_VNB_DB_NAME;
            
            // 获取数据库版本
            $stmt = $db->query("SELECT VERSION() as version");
            $row = $stmt->fetch();
            $info['dbVersion'] = $row['version'] ?? 'Unknown';
        }
        
        // 基本词典库统计
        $baseDb = DB::base();
        if ($baseDb) {
            // 基本词典库名称
            $info['baseDbName'] = C_DB_BASE;
            
            // 词条数
            $stmt = $baseDb->query("SELECT COUNT(*) as count FROM words");
            $info['baseWordCount'] = (int)($stmt->fetch()['count'] ?? 0);
            
            // 释义数
            $stmt = $baseDb->query("SELECT COUNT(*) as count FROM definitions");
            $info['baseDefCount'] = (int)($stmt->fetch()['count'] ?? 0);
        }
        
        // 用户数（排除管理员）
        $stmt = $db->prepare("SELECT COUNT(*) as count FROM vnb_users WHERE name != 'admin'");
        $stmt->execute();
        $info['userCount'] = (int)($stmt->fetch()['count'] ?? 0);
        
        $response = ['success' => true, 'info' => $info];
    } else {
        $response['message'] = 'Invalid action';
    }
} elseif ($method == 'POST') {
    $action = $_GET['action'] ?? null;
    
    if ($action === 'reset') {
        // 清空重置用户数据库
        $result = resetAllUserData();
        if ($result) {
            $response = ['success' => true];
        } else {
            $response['message'] = 'Failed to reset user data';
        }
    } else {
        $response['message'] = 'Invalid action';
    }
} else {
    $response['message'] = 'Method not allowed';
}

echo json_encode($response);

/**
 * 清空重置所有用户数据
 * 直接调用 impdb.php 中的 resetVnbInitData 函数
 */
function resetAllUserData()
{
    $result = resetVnbInitData();
    return $result->v === true;
}
