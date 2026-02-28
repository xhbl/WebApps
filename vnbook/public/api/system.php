<?php
require_once 'utils.php';
require_once 'db.php';
require_once 'login.php';

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

            // 词典数
            $stmt = $baseDb->query("SELECT COUNT(*) as count FROM registry");
            $info['baseDictCount'] = (int)($stmt->fetch()['count'] ?? 0);
        }

        // 用户数（排除管理员）
        $stmt = $db->prepare("SELECT COUNT(*) as count FROM vnb_users WHERE name != 'admin'");
        $stmt->execute();
        $info['userCount'] = (int)($stmt->fetch()['count'] ?? 0);

        $response = ['success' => true, 'info' => $info];
    } elseif ($action === 'checkEmpty') {
        // 检查数据库是否为空（只有admin用户）
        $result = checkDatabaseEmpty();
        $response = ['success' => true, 'data' => ['isEmpty' => $result]];
    } elseif ($action === 'export') {
        // 导出数据为JSON文件
        exportDataAsFile();
        // exportDataAsFile 会直接输出文件并终止脚本
        exit;
    } else {
        $response['message'] = 'Invalid action';
    }
} elseif ($method == 'POST') {
    $action = $_GET['action'] ?? null;

    if ($action === 'reset') {
        // 清空重置用户数据库
        $result = resetAllUserData();
        if ($result['success']) {
            $response = ['success' => true];
        } else {
            $response['message'] = $result['message'] ?? 'Failed to reset user data';
        }
    } elseif ($action === 'import') {
        // 导入数据
        $result = importDataFromFile();
        $response = $result;
    } else {
        $response['message'] = 'Invalid action';
    }
} else {
    $response['message'] = 'Method not allowed';
}

echo json_encode($response);

/**
 * 清空重置所有用户数据
 * Clears all user data and resets the system to a clean state
 */
function resetAllUserData()
{
    $db = DB::vnb();
    try {
        $db->beginTransaction();

        // Clear review records for full reset
        $db->exec("DELETE FROM vnu_review");

        // Delete all non-admin users (CASCADE will clean up all related data)
        $db->exec("DELETE FROM vnb_users WHERE name NOT IN ('admin')");

        $db->commit();
        return ['success' => true];
    } catch (Exception $e) {
        if ($db) $db->rollBack();
        return ['success' => false, 'message' => $e->getMessage()];
    }
}

/**
 * 检查数据库是否为空（只有admin用户）
 * @return bool 如果只有admin用户返回true
 */
function checkDatabaseEmpty()
{
    $db = DB::vnb();
    $stmt = $db->prepare("SELECT COUNT(*) as count FROM vnb_users WHERE name != 'admin'");
    $stmt->execute();
    $count = (int)($stmt->fetch()['count'] ?? 0);
    return $count === 0;
}

/**
 * 导出所有用户数据为JSON文件并下载
 */
function exportDataAsFile()
{
    $db = DB::vnb();

    $data = [
        'version' => '1.0',
        'exportTime' => date('Y-m-d H:i:s'),
        'tables' => []
    ];

    // 导出用户表（排除admin用户，保留admin的配置）
    $stmt = $db->query("SELECT id, name, pass, dispname, time_c, cfg FROM vnb_users WHERE name != 'admin'");
    $data['tables']['vnb_users'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 导出单词本表
    $stmt = $db->query("SELECT id, user_id, title, nums, time_c, hide, ptop, sorder FROM vnu_books");
    $data['tables']['vnu_books'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 导出单词表
    $stmt = $db->query("SELECT id, user_id, word, phon, time_c FROM vnu_words");
    $data['tables']['vnu_words'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 导出释义表
    $stmt = $db->query("SELECT id, word_id, pos, exp, time_c, sorder FROM vnu_explanations");
    $data['tables']['vnu_explanations'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 导出例句表
    $stmt = $db->query("SELECT id, exp_id, sen, time_c, smemo, sorder FROM vnu_sentences");
    $data['tables']['vnu_sentences'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 导出映射表
    $stmt = $db->query("SELECT id, user_id, book_id, word_id, time_c FROM vnu_mapbw");
    $data['tables']['vnu_mapbw'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 导出复习记录表
    $stmt = $db->query("SELECT id, user_id, word_id, n_known, n_unknown, n_streak, last_status, time_c, time_r FROM vnu_review");
    $data['tables']['vnu_review'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 导出词性配置（用于数据完整性）
    $stmt = $db->query("SELECT pos, name FROM vnb_pos");
    $data['tables']['vnb_pos'] = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 生成JSON并压缩
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    $compressed = gzencode($json, 9);

    // 生成校验和
    $checksum = hash('sha256', $json);

    // 设置响应头，下载文件
    $filename = 'vnbook_export_' . date('Ymd_His') . '.vnb';
    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Content-Length: ' . strlen($compressed));
    header('X-Vnb-Checksum: ' . $checksum);

    echo $compressed;
    exit;
}

/**
 * 从上传的文件导入数据
 * @return array 导入结果
 */
function importDataFromFile()
{
    // 检查是否有上传文件
    if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
        $errorMessages = [
            UPLOAD_ERR_INI_SIZE => '文件大小超过服务器限制',
            UPLOAD_ERR_FORM_SIZE => '文件大小超过表单限制',
            UPLOAD_ERR_PARTIAL => '文件只有部分被上传',
            UPLOAD_ERR_NO_FILE => '没有文件被上传',
            UPLOAD_ERR_NO_TMP_DIR => '缺少临时文件夹',
            UPLOAD_ERR_CANT_WRITE => '写入文件失败',
            UPLOAD_ERR_EXTENSION => '文件上传被扩展阻止'
        ];
        $errorCode = $_FILES['file']['error'] ?? UPLOAD_ERR_NO_FILE;
        return [
            'success' => false,
            'message' => $errorMessages[$errorCode] ?? '文件上传失败'
        ];
    }

    // 检查文件大小限制（50MB）
    $maxSize = 50 * 1024 * 1024;
    if ($_FILES['file']['size'] > $maxSize) {
        return ['success' => false, 'message' => '文件大小超过50MB限制'];
    }

    // 读取并解压文件
    $compressed = file_get_contents($_FILES['file']['tmp_name']);
    if ($compressed === false) {
        return ['success' => false, 'message' => '无法读取上传文件'];
    }

    // 尝试解压
    $json = @gzdecode($compressed);
    if ($json === false) {
        // 如果解压失败，可能是未压缩的JSON（兼容性处理）
        $json = $compressed;
    }

    // 验证校验和（如果提供）
    $expectedChecksum = $_SERVER['HTTP_X_VNB_CHECKSUM'] ?? null;
    if ($expectedChecksum && hash('sha256', $json) !== $expectedChecksum) {
        return ['success' => false, 'message' => '数据校验失败，文件可能已损坏'];
    }

    // 解析JSON
    $data = json_decode($json, true);
    if ($data === null) {
        return ['success' => false, 'message' => 'JSON解析失败: ' . json_last_error_msg()];
    }

    // 验证数据格式
    if (!isset($data['version']) || !isset($data['tables'])) {
        return ['success' => false, 'message' => '无效的数据格式'];
    }

    // 再次检查数据库是否为空
    if (!checkDatabaseEmpty()) {
        return ['success' => false, 'message' => '数据库不为空，无法导入。请先清空重置数据库。'];
    }

    // 开始导入
    $db = DB::vnb();
    try {
        $db->beginTransaction();

        // 禁用外键检查以保留原始ID
        $db->exec("SET FOREIGN_KEY_CHECKS = 0");

        // 导入顺序（按外键依赖顺序）
        $tableOrder = [
            'vnb_users',
            'vnu_books',
            'vnu_words',
            'vnu_explanations',
            'vnu_sentences',
            'vnu_mapbw',
            'vnu_review',
            'vnb_pos'
        ];

        foreach ($tableOrder as $table) {
            if (!isset($data['tables'][$table]) || !is_array($data['tables'][$table])) {
                continue;
            }

            $rows = $data['tables'][$table];
            if (empty($rows)) {
                continue;
            }

            // 跳过vnb_pos表如果已有数据（系统初始化时已创建）
            if ($table === 'vnb_pos') {
                $stmt = $db->query("SELECT COUNT(*) as count FROM vnb_pos");
                $count = (int)($stmt->fetch()['count'] ?? 0);
                if ($count > 0) {
                    continue;
                }
            }

            // 批量插入
            importTableData($db, $table, $rows);
        }

        // 重新启用外键检查
        $db->exec("SET FOREIGN_KEY_CHECKS = 1");

        $db->commit();

        return [
            'success' => true,
            'message' => '导入成功',
            'stats' => [
                'users' => count($data['tables']['vnb_users'] ?? []),
                'books' => count($data['tables']['vnu_books'] ?? []),
                'words' => count($data['tables']['vnu_words'] ?? []),
                'explanations' => count($data['tables']['vnu_explanations'] ?? []),
                'sentences' => count($data['tables']['vnu_sentences'] ?? []),
                'mappings' => count($data['tables']['vnu_mapbw'] ?? []),
                'reviews' => count($data['tables']['vnu_review'] ?? [])
            ]
        ];
    } catch (Exception $e) {
        $db->rollBack();
        $db->exec("SET FOREIGN_KEY_CHECKS = 1");
        return ['success' => false, 'message' => '导入失败: ' . $e->getMessage()];
    }
}

/**
 * 批量导入表数据
 * @param PDO $db 数据库连接
 * @param string $table 表名
 * @param array $rows 数据行
 */
function importTableData($db, $table, $rows)
{
    if (empty($rows)) {
        return;
    }

    // 获取列名（从第一行）
    $columns = array_keys($rows[0]);

    // 对vnu_books表特殊处理：跳过nums字段，由触发器自动维护
    if ($table === 'vnu_books') {
        $columns = array_filter($columns, function ($col) {
            return $col !== 'nums';
        });
        // 重新索引数组
        $columns = array_values($columns);
    }

    $columnList = '`' . implode('`, `', $columns) . '`';

    // 构建INSERT语句
    $placeholders = implode(', ', array_fill(0, count($columns), '?'));
    $sql = "INSERT INTO `{$table}` ({$columnList}) VALUES ({$placeholders})";

    $stmt = $db->prepare($sql);

    // 批量插入（每次1000条）
    $batchSize = 1000;
    $batch = [];
    $count = 0;

    foreach ($rows as $row) {
        // 对vnu_books表特殊处理：跳过nums字段的值
        if ($table === 'vnu_books') {
            unset($row['nums']);
        }
        $batch[] = array_values($row);
        $count++;

        if (count($batch) >= $batchSize) {
            foreach ($batch as $values) {
                $stmt->execute($values);
            }
            $batch = [];
        }
    }

    // 插入剩余数据
    if (!empty($batch)) {
        foreach ($batch as $values) {
            $stmt->execute($values);
        }
    }
}
