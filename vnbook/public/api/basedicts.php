<?php
require_once 'utils.php';
require_once 'db.php';
require_once 'login.php';

header('Content-Type: application/json; charset=utf-8');

// 验证登录和管理员权限
$logsess = vnb_checklogin($_GET["_sessid"] ?? null);
if ($logsess->success !== true || $logsess->login['uname'] !== 'admin') {
    die(json_encode(['success' => false, 'message' => 'Unauthorized']));
}

$action = $_GET['action'] ?? '';

switch ($action) {
    case 'list':
        handleList();
        break;
    case 'get':
        handleGet();
        break;
    case 'stats':
        handleStats();
        break;
    case 'create':
        handleCreate();
        break;
    case 'update':
        handleUpdate();
        break;
    case 'delete':
        handleDelete();
        break;
    case 'sync':
        handleSync();
        break;
    case 'check':
        handleCheck();
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
        break;
}

function handleList()
{
    $ret = new stdClass();
    $ret->success = false;
    try {
        $db = DB::base();
        if ($db === null) {
            throw new Exception('Failed to connect to base dictionary database');
        }

        $stmt = $db->query("SELECT `key`, `tag`, `name`, `sorder`, `active`, `desc` FROM `registry` ORDER BY `active` DESC, `sorder` ASC, `key` ASC");
        $dicts = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $ret->success = true;
        $ret->dicts = $dicts;
    } catch (Exception $e) {
        $ret->message = $e->getMessage();
    }
    echo json_encode($ret);
}

function handleGet()
{
    $ret = new stdClass();
    $ret->success = false;
    try {
        $key = $_GET['key'] ?? '';
        if (empty($key)) {
            throw new Exception('Key is required');
        }

        $db = DB::base();
        if ($db === null) {
            throw new Exception('Failed to connect to base dictionary database');
        }

        $stmt = $db->prepare("SELECT `key`, `tag`, `name`, `sorder`, `active`, `desc` FROM `registry` WHERE `key` = ?");
        $stmt->execute([$key]);
        $dict = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($dict === false) {
            throw new Exception('Dictionary not found');
        }

        $ret->success = true;
        $ret->dict = $dict;
    } catch (Exception $e) {
        $ret->message = $e->getMessage();
    }
    echo json_encode($ret);
}

function handleStats()
{
    $ret = new stdClass();
    $ret->success = false;
    try {
        $key = $_GET['key'] ?? '';
        if (empty($key)) {
            throw new Exception('Key is required');
        }

        $db = DB::base();
        if ($db === null) {
            throw new Exception('Failed to connect to base dictionary database');
        }

        if ($key === C_DICT_GEN_KEY) {
            $wordsTable = 'words';
            $defsTable = 'definitions';
        } else {
            $wordsTable = 'words_' . $key;
            $defsTable = 'definitions_' . $key;
        }

        $wordCount = 0;
        $defCount = 0;

        $stmt = $db->prepare("SELECT COUNT(*) FROM `{$wordsTable}`");
        $stmt->execute();
        $wordCount = $stmt->fetchColumn();

        $stmt = $db->prepare("SELECT COUNT(*) FROM `{$defsTable}`");
        $stmt->execute();
        $defCount = $stmt->fetchColumn();

        $ret->success = true;
        $ret->stats = [
            'wordCount' => (int)$wordCount,
            'defCount' => (int)$defCount,
        ];
    } catch (Exception $e) {
        $ret->message = $e->getMessage();
    }
    echo json_encode($ret);
}

function handleCreate()
{
    $ret = new stdClass();
    $ret->success = false;
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            throw new Exception('Invalid input data');
        }

        $key = $input['key'] ?? '';
        $tag = $input['tag'] ?? '';
        $name = $input['name'] ?? '';
        $sorder = $input['sorder'] ?? 0;
        $active = $input['active'] ?? 1;
        $desc = $input['desc'] ?? null;

        if (empty($key) || empty($tag) || empty($name)) {
            throw new Exception('Key, tag, and name are required');
        }

        if (!preg_match('/^[a-z][a-z0-9_]*$/', $key)) {
            throw new Exception('Invalid key format');
        }

        $db = DB::base();
        if ($db === null) {
            throw new Exception('Failed to connect to base dictionary database');
        }

        // DDL in createBaseDictRegData will cause implicit commit, so we handle cleanup manually instead of transaction
        $stmt = $db->prepare("INSERT INTO `registry` (`key`, `tag`, `name`, `sorder`, `active`, `desc`) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$key, $tag, $name, $sorder, $active, $desc]);

        $result = createBaseDictRegData($db, $key);
        if (!$result->v) {
            // If table creation failed, manually delete the registry entry
            $db->prepare("DELETE FROM `registry` WHERE `key` = ?")->execute([$key]);
            throw new Exception($result->e ?? 'Failed to create tables');
        }

        $ret->success = true;
        $ret->dict = [
            'key' => $key,
            'tag' => $tag,
            'name' => $name,
            'sorder' => $sorder,
            'active' => $active,
            'desc' => $desc,
        ];
    } catch (Exception $e) {
        $ret->message = $e->getMessage();
    }
    echo json_encode($ret);
}

function handleUpdate()
{
    $ret = new stdClass();
    $ret->success = false;
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            throw new Exception('Invalid input data');
        }

        $key = $input['key'] ?? '';
        if (empty($key)) {
            throw new Exception('Key is required');
        }

        $db = DB::base();
        if ($db === null) {
            throw new Exception('Failed to connect to base dictionary database');
        }

        $fields = [];
        $values = [];

        if (isset($input['tag'])) {
            $fields[] = "`tag` = ?";
            $values[] = $input['tag'];
        }
        if (isset($input['name'])) {
            $fields[] = "`name` = ?";
            $values[] = $input['name'];
        }
        if (isset($input['sorder'])) {
            $fields[] = "`sorder` = ?";
            $values[] = $input['sorder'];
        }
        if (isset($input['active'])) {
            $fields[] = "`active` = ?";
            $values[] = $input['active'];
        }
        if (isset($input['desc'])) {
            $fields[] = "`desc` = ?";
            $values[] = $input['desc'];
        }

        if (empty($fields)) {
            throw new Exception('No fields to update');
        }

        $values[] = $key;

        $sql = "UPDATE `registry` SET " . implode(', ', $fields) . " WHERE `key` = ?";
        $stmt = $db->prepare($sql);
        $stmt->execute($values);

        $ret->success = true;
    } catch (Exception $e) {
        $ret->message = $e->getMessage();
    }
    echo json_encode($ret);
}

function handleDelete()
{
    $ret = new stdClass();
    $ret->success = false;
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            throw new Exception('Invalid input data');
        }

        $key = $input['key'] ?? '';
        $deleteTables = $input['deleteTables'] ?? false;

        if (empty($key)) {
            throw new Exception('Key is required');
        }

        if ($key === C_DICT_GEN_KEY) {
            throw new Exception('Cannot delete system reserved dictionary');
        }

        $db = DB::base();
        if ($db === null) {
            throw new Exception('Failed to connect to base dictionary database');
        }

        // DDL in deleteBaseDictRegData causes implicit commit
        try {
            if ($deleteTables) {
                $result = deleteBaseDictRegData($db, $key, false);
                if (!$result->v) {
                    throw new Exception($result->e ?? 'Failed to delete tables');
                }
            }

            $stmt = $db->prepare("DELETE FROM `registry` WHERE `key` = ?");
            $stmt->execute([$key]);

            $ret->success = true;
            $ret->message = 'Dictionary deleted successfully';
        } catch (Exception $e) {
            throw $e;
        }
    } catch (Exception $e) {
        $ret->message = $e->getMessage();
    }
    echo json_encode($ret);
}

function handleSync()
{
    $ret = new stdClass();
    $ret->success = false;
    try {
        $db = DB::base();
        if ($db === null) {
            throw new Exception('Failed to connect to base dictionary database');
        }

        $result = syncBaseDictRegData($db);
        if (!$result->v) {
            throw new Exception($result->e ?? 'Failed to sync dictionaries');
        }

        $ret->success = true;
        $ret->synced = $result->synced ?? [];
        $ret->message = $result->msg ?? 'Sync completed';
    } catch (Exception $e) {
        $ret->message = $e->getMessage();
    }
    echo json_encode($ret);
}

function handleCheck()
{
    $ret = new stdClass();
    $ret->success = false;
    try {
        $db = DB::base();
        if ($db === null) {
            throw new Exception('Failed to connect to base dictionary database');
        }

        $result = checkBaseDictRegData($db);
        if (!$result->v) {
            throw new Exception($result->e ?? 'Failed to check dictionaries');
        }

        $ret->success = true;
        $ret->created = $result->created ?? [];
        $ret->message = $result->msg ?? 'Check completed';
    } catch (Exception $e) {
        $ret->message = $e->getMessage();
    }
    echo json_encode($ret);
}

/**
 * Create words_key and definitions_key tables for specific registry keys
 * @param PDO $pdo Database connection
 * @param string|array $keys Registry key(s) (e.g., 'med', 'tech' or ['med', 'tech'])
 * @return stdClass Result object with 'v' (success), 'created' (array), and optional 'e' (error)
 */
function createBaseDictRegData($pdo, $keys)
{
    $ret = new stdClass();
    $ret->v = false;
    $ret->created = [];

    // Convert single key to array
    $keys = (array)$keys;

    try {
        foreach ($keys as $key) {
            // Validate key format
            if (!preg_match('/^[a-z][a-z0-9_]*$/', $key)) {
                throw new Exception("Invalid key format for '{$key}': must start with letter and contain only letters, numbers, and underscores");
            }

            $wordsTable = "words_" . $key;
            $defsTable = "definitions_" . $key;

            // Check if tables already exist
            $stmt = $pdo->prepare("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN (?, ?)");
            $stmt->execute([$wordsTable, $defsTable]);
            $count = $stmt->fetchColumn();

            if ($count > 0) {
                continue; // Skip existing tables
            }

            // DDL statements cause implicit commit, so no transaction needed here
            try {
                // Create words_key table using LIKE
                $pdo->exec("CREATE TABLE `{$wordsTable}` LIKE `words`");

                // Create definitions_key table using LIKE
                $pdo->exec("CREATE TABLE `{$defsTable}` LIKE `definitions`");

                // Re-create foreign key constraint for definitions_key table
                $pdo->exec("ALTER TABLE `{$defsTable}` ADD CONSTRAINT `fk_word_ref_{$key}` FOREIGN KEY (`word_id`) REFERENCES `{$wordsTable}` (`id`) ON DELETE CASCADE");

                $ret->created[] = $key;
            } catch (Exception $e) {
                // Cleanup partial tables if creation failed
                $pdo->exec("DROP TABLE IF EXISTS `{$defsTable}`");
                $pdo->exec("DROP TABLE IF EXISTS `{$wordsTable}`");
                throw $e;
            }
        }

        $ret->v = true;
        $ret->msg = "Created tables for " . count($ret->created) . " keys: " . implode(', ', $ret->created);
    } catch (Exception $e) {
        $ret->e = $e->getMessage();
    }
    return $ret;
}

/**
 * Delete words_key and definitions_key tables for a specific registry key
 * @param PDO $pdo Database connection
 * @param string $key Registry key (e.g., 'med', 'tech')
 * @param bool $deleteRegistry Whether to delete the registry record
 * @return stdClass Result object with 'v' (success) and optional 'e' (error)
 */
function deleteBaseDictRegData($pdo, $key, $deleteRegistry = false)
{
    $ret = new stdClass();
    $ret->v = false;
    try {
        // Validate key format
        if (!preg_match('/^[a-z][a-z0-9_]*$/', $key)) {
            throw new Exception("Invalid key format for '{$key}'");
        }

        $wordsTable = "words_" . $key;
        $defsTable = "definitions_" . $key;

        // DDL statements cause implicit commit, so no transaction needed here
        try {
            // Drop definitions table first (due to foreign key)
            $pdo->exec("DROP TABLE IF EXISTS `{$defsTable}`");
            $pdo->exec("DROP TABLE IF EXISTS `{$wordsTable}`");

            // Delete registry record if requested
            if ($deleteRegistry) {
                $stmt = $pdo->prepare("DELETE FROM `registry` WHERE `key` = ? AND `key` != '" . C_DICT_GEN_KEY . "'");
                $stmt->execute([$key]);
            }

            $ret->v = true;
            $ret->msg = "Tables deleted successfully for key: " . $key . ($deleteRegistry ? " (including registry record)" : "");
        } catch (Exception $e) {
            throw $e;
        }
    } catch (Exception $e) {
        $ret->e = $e->getMessage();
    }
    return $ret;
}

/**
 * Sync table structure for all registry keys with base tables
 * @param PDO $pdo Database connection
 * @return stdClass Result object with 'v' (success), 'synced' (array), and optional 'e' (error)
 */
function syncBaseDictRegData($pdo)
{
    $ret = new stdClass();
    $ret->v = false;
    $ret->synced = [];
    try {
        // Get all registry keys except 'gen'
        $stmt = $pdo->query("SELECT `key` FROM `registry` WHERE `key` != '" . C_DICT_GEN_KEY . "' AND `active` = 1");
        $keys = $stmt->fetchAll(PDO::FETCH_COLUMN);

        foreach ($keys as $key) {
            $wordsTable = "words_" . $key;
            $defsTable = "definitions_" . $key;

            // Check if tables exist
            $checkStmt = $pdo->prepare("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN (?, ?)");
            $checkStmt->execute([$wordsTable, $defsTable]);
            $count = $checkStmt->fetchColumn();

            if ($count == 2) {
                // Tables exist, sync structure
                try {
                    // DDL statements cause implicit commit
                    // Get structure from base tables
                    $baseWordsStruct = $pdo->query("SHOW CREATE TABLE `words`")->fetchColumn(1);
                    $baseDefsStruct = $pdo->query("SHOW CREATE TABLE `definitions`")->fetchColumn(1);

                    // Modify structure for key-specific tables
                    $wordsStruct = str_replace('CREATE TABLE `words`', "CREATE TABLE `{$wordsTable}`", $baseWordsStruct);
                    $defsStruct = str_replace('CREATE TABLE `definitions`', "CREATE TABLE `{$defsTable}`", $baseDefsStruct);
                    $defsStruct = str_replace('REFERENCES `words`', "REFERENCES `{$wordsTable}`", $defsStruct);
                    $defsStruct = str_replace('fk_word_ref', "fk_word_ref_{$key}", $defsStruct);

                    // Drop and re-create tables (preserving data would be more complex)
                    $pdo->exec("DROP TABLE IF EXISTS `{$defsTable}`");
                    $pdo->exec("DROP TABLE IF EXISTS `{$wordsTable}`");
                    $pdo->exec($wordsStruct);
                    $pdo->exec($defsStruct);

                    $ret->synced[] = $key;
                } catch (Exception $e) {
                    throw new Exception("Failed to sync tables for key '{$key}': " . $e->getMessage());
                }
            }
        }

        $ret->v = true;
        $ret->msg = "Synced table structure for " . count($ret->synced) . " keys: " . implode(', ', $ret->synced);
    } catch (Exception $e) {
        $ret->e = $e->getMessage();
    }
    return $ret;
}

/**
 * Check and create missing tables for all registry keys (excluding 'gen')
 * @param PDO $pdo Database connection
 * @return stdClass Result object with 'v' (success), 'created' (array of created keys), and optional 'e' (error)
 */
function checkBaseDictRegData($pdo)
{
    $ret = new stdClass();
    $ret->v = false;
    $ret->created = [];
    try {
        // Get all registry keys except 'gen'
        $stmt = $pdo->query("SELECT `key` FROM `registry` WHERE `key` != '" . C_DICT_GEN_KEY . "' AND `active` = 1");
        $keys = $stmt->fetchAll(PDO::FETCH_COLUMN);

        if (!empty($keys)) {
            // Use batch creation
            $result = createBaseDictRegData($pdo, $keys);
            if ($result->v) {
                $ret->created = $result->created;
            } else {
                throw new Exception($result->e);
            }
        }

        $ret->v = true;
        $ret->msg = "Checked " . count($keys) . " registry keys, created " . count($ret->created) . " missing table sets";
    } catch (Exception $e) {
        $ret->e = $e->getMessage();
    }
    return $ret;
}
