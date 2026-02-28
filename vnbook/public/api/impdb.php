<?php
require_once 'db.php';

/**
 * Initialize all tables based on the latest SQL schema
 */
function createVnbInitData()
{
    $ret = new stdClass();
    $ret->v = false;
    try {
        $tmpPdo = new PDO("mysql:host=" . C_VNB_DB_HOST, C_VNB_DB_USER, C_VNB_DB_PASS);
        $tmpPdo->exec("CREATE DATABASE IF NOT EXISTS `" . C_VNB_DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

        $db = DB::vnb();
        $queries = [
            // 1. POS Standards
            "CREATE TABLE IF NOT EXISTS `vnb_pos` (
                `pos` VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
                `name` JSON NOT NULL,
                PRIMARY KEY (`pos`)
            ) ENGINE=InnoDB",

            // 2. User main table
            "CREATE TABLE IF NOT EXISTS `vnb_users` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `name` VARCHAR(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
                `pass` VARCHAR(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
                `dispname` VARCHAR(100) DEFAULT NULL,
                `time_c` DATETIME DEFAULT CURRENT_TIMESTAMP,
                `cfg` JSON DEFAULT NULL,
                UNIQUE INDEX `idx_user_name` (`name`)
            ) ENGINE=InnoDB",

            // 3. Wordbooks
            "CREATE TABLE IF NOT EXISTS `vnu_books` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `user_id` INT NOT NULL,
                `title` VARCHAR(255) NOT NULL DEFAULT 'My Wordbook',
                `nums` INT UNSIGNED DEFAULT 0,
                `time_c` DATETIME DEFAULT CURRENT_TIMESTAMP,
                `hide` TINYINT(1) DEFAULT 0,
                `ptop` TINYINT(1) DEFAULT 0,
                `sorder` INT DEFAULT 0,
                INDEX `idx_vnu_user_books` (`user_id` ASC, `ptop` DESC, `sorder` ASC, `time_c` DESC),
                CONSTRAINT `fk_book_user` FOREIGN KEY (`user_id`) REFERENCES `vnb_users` (`id`) ON DELETE CASCADE
            ) ENGINE=InnoDB",

            // 4. Words
            "CREATE TABLE IF NOT EXISTS `vnu_words` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `user_id` INT NOT NULL,
                `word` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
                `phon` VARCHAR(255) DEFAULT NULL,
                `time_c` DATETIME DEFAULT CURRENT_TIMESTAMP,
                INDEX `idx_vnu_user_word` (`user_id`, `word`),
                INDEX `idx_user_timec` (`user_id`, `time_c` DESC),
                CONSTRAINT `fk_word_user` FOREIGN KEY (`user_id`) REFERENCES `vnb_users` (`id`) ON DELETE CASCADE
            ) ENGINE=InnoDB",

            // 5. Explanations
            "CREATE TABLE IF NOT EXISTS `vnu_explanations` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `word_id` INT NOT NULL,
                `pos` VARCHAR(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
                `exp` JSON NOT NULL,
                `time_c` DATETIME DEFAULT CURRENT_TIMESTAMP,
                `sorder` SMALLINT DEFAULT 0,
                INDEX `idx_vnu_exp_word` (`word_id` ASC, `sorder` ASC, `time_c` DESC),
                CONSTRAINT `fk_exp_pos` FOREIGN KEY (`pos`) REFERENCES `vnb_pos` (`pos`) ON UPDATE CASCADE,
                CONSTRAINT `fk_exp_word` FOREIGN KEY (`word_id`) REFERENCES `vnu_words` (`id`) ON DELETE CASCADE
            ) ENGINE=InnoDB",

            // 6. Sentences
            "CREATE TABLE IF NOT EXISTS `vnu_sentences` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `exp_id` INT NOT NULL,
                `sen` JSON NOT NULL,
                `time_c` DATETIME DEFAULT CURRENT_TIMESTAMP,
                `smemo` VARCHAR(100) DEFAULT NULL,
                `sorder` SMALLINT DEFAULT 0,
                INDEX `idx_vnu_sen_exp` (`exp_id` ASC, `sorder` ASC, `time_c` DESC),
                CONSTRAINT `fk_sen_exp` FOREIGN KEY (`exp_id`) REFERENCES `vnu_explanations` (`id`) ON DELETE CASCADE
            ) ENGINE=InnoDB",

            // 7. Mapping table (Many-to-Many)
            "CREATE TABLE IF NOT EXISTS `vnu_mapbw` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `user_id` INT NOT NULL,
                `book_id` INT NOT NULL,
                `word_id` INT NOT NULL,
                `time_c` DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE INDEX `idx_vnu_unique_map` (`book_id`, `word_id`),
                INDEX `idx_vnu_user_maps` (`user_id`),
                CONSTRAINT `fk_map_user` FOREIGN KEY (`user_id`) REFERENCES `vnb_users` (`id`) ON DELETE CASCADE,
                CONSTRAINT `fk_map_book` FOREIGN KEY (`book_id`) REFERENCES `vnu_books` (`id`) ON DELETE CASCADE,
                CONSTRAINT `fk_map_word` FOREIGN KEY (`word_id`) REFERENCES `vnu_words` (`id`) ON DELETE CASCADE
            ) ENGINE=InnoDB",

            // 8. Review records
            "CREATE TABLE IF NOT EXISTS `vnu_review` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `user_id` INT NOT NULL,
                `word_id` INT NOT NULL,
                `n_known` TINYINT UNSIGNED DEFAULT 0,
                `n_unknown` TINYINT UNSIGNED DEFAULT 0,
                `n_streak` TINYINT UNSIGNED DEFAULT 0,
                `last_status` TINYINT DEFAULT 0,
                `time_c` DATETIME DEFAULT CURRENT_TIMESTAMP,
                `time_r` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE INDEX `idx_u_w` (`user_id`, `word_id`),
                INDEX `idx_user_timec` (`user_id`, `time_c` DESC),
                CONSTRAINT `fk_vnr_u` FOREIGN KEY (`user_id`) REFERENCES `vnb_users` (`id`) ON DELETE CASCADE,
                CONSTRAINT `fk_vnr_w` FOREIGN KEY (`word_id`) REFERENCES `vnu_words` (`id`) ON DELETE CASCADE
            ) ENGINE=InnoDB",

            // 9. Triggers for automatic word counting
            // Case 1: Insert mapping - Auto increment book word count
            "CREATE TRIGGER tr_mapbw_insert AFTER INSERT ON vnu_mapbw 
             FOR EACH ROW UPDATE vnu_books SET nums = nums + 1 WHERE id = NEW.book_id",
            // Case 2: Delete mapping - Auto decrement book word count
            "CREATE TRIGGER tr_mapbw_delete AFTER DELETE ON vnu_mapbw 
             FOR EACH ROW UPDATE vnu_books SET nums = nums - 1 WHERE id = OLD.book_id",
            // Case 3: Update mapping - Handle moving words between books
            "CREATE TRIGGER tr_mapbw_update AFTER UPDATE ON vnu_mapbw 
             FOR EACH ROW BEGIN 
                IF OLD.book_id <> NEW.book_id THEN 
                    UPDATE vnu_books SET nums = nums - 1 WHERE id = OLD.book_id; 
                    UPDATE vnu_books SET nums = nums + 1 WHERE id = NEW.book_id; 
                END IF; 
             END",
            // Case 4: Physical delete word - Handle cascade delete issue
            "CREATE TRIGGER tr_word_physical_delete BEFORE DELETE ON vnu_words 
             FOR EACH ROW BEGIN 
                UPDATE vnu_books SET nums = nums - 1 
                WHERE id IN (SELECT book_id FROM vnu_mapbw WHERE word_id = OLD.id); 
             END"
        ];

        foreach ($queries as $sql) {
            $db->exec($sql);
        }

        // Store SHA-256 hashed password (not plaintext)
        $hashedPassword = hash('sha256', C_ADMIN_PASSINIT);
        $db->prepare("INSERT IGNORE INTO vnb_users (id, name, pass, dispname) VALUES (1, ?, ?, 'Administrator')")->execute([C_ADMIN_NAME, $hashedPassword]);
        initSystemPosData();
        $ret->v = true;
    } catch (Exception $e) {
        $ret->e = $e->getMessage();
    }
    return $ret;
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

            // Start transaction
            $pdo->beginTransaction();
            try {
                // Create words_key table using LIKE
                $pdo->exec("CREATE TABLE `{$wordsTable}` LIKE `words`");

                // Create definitions_key table using LIKE
                $pdo->exec("CREATE TABLE `{$defsTable}` LIKE `definitions`");

                // Re-create foreign key constraint for definitions_key table
                $pdo->exec("ALTER TABLE `{$defsTable}` ADD CONSTRAINT `fk_word_ref_{$key}` FOREIGN KEY (`word_id`) REFERENCES `{$wordsTable}` (`id`) ON DELETE CASCADE");

                $pdo->commit();
                $ret->created[] = $key;
            } catch (Exception $e) {
                $pdo->rollBack();
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

        // Start transaction
        $pdo->beginTransaction();
        try {
            // Drop definitions table first (due to foreign key)
            $pdo->exec("DROP TABLE IF EXISTS `{$defsTable}`");
            $pdo->exec("DROP TABLE IF EXISTS `{$wordsTable}`");

            // Delete registry record if requested
            if ($deleteRegistry) {
                $stmt = $pdo->prepare("DELETE FROM `registry` WHERE `key` = ? AND `key` != 'gen'");
                $stmt->execute([$key]);
            }

            $pdo->commit();
            $ret->v = true;
            $ret->msg = "Tables deleted successfully for key: " . $key . ($deleteRegistry ? " (including registry record)" : "");
        } catch (Exception $e) {
            $pdo->rollBack();
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
        $stmt = $pdo->query("SELECT `key` FROM `registry` WHERE `key` != 'gen' AND `active` = 1");
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
                    $pdo->beginTransaction();

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

                    $pdo->commit();
                    $ret->synced[] = $key;
                } catch (Exception $e) {
                    $pdo->rollBack();
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
        $stmt = $pdo->query("SELECT `key` FROM `registry` WHERE `key` != 'gen' AND `active` = 1");
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

function initSystemPosData()
{
    $db = DB::vnb();
    $posData = [
        ['n.', '{"en": "noun", "zh": "名词"}'],
        ['v.', '{"en": "verb", "zh": "动词 (统称)"}'],
        ['vt.', '{"en": "transitive verb", "zh": "及物动词"}'],
        ['vi.', '{"en": "intransitive verb", "zh": "不及物动词"}'],
        ['aux.', '{"en": "auxiliary verb", "zh": "助动词"}'],
        ['adj.', '{"en": "adjective", "zh": "形容词"}'],
        ['adv.', '{"en": "adverb", "zh": "副词"}'],
        ['prep.', '{"en": "preposition", "zh": "介词"}'],
        ['pron.', '{"en": "pronoun", "zh": "代词"}'],
        ['abbr.', '{"en": "abbreviation", "zh": "缩写词"}'],
        ['conj.', '{"en": "conjunction", "zh": "连词"}'],
        ['int.', '{"en": "interjection", "zh": "感叹词"}'],
        ['det.', '{"en": "determiner", "zh": "限定词"}'],
        ['num.', '{"en": "numeral", "zh": "数词"}'],
        ['quant.', '{"en": "quantifier", "zh": "量词"}'],
        ['art.', '{"en": "article", "zh": "冠词"}'],
        ['phr.', '{"en": "phrase", "zh": "短语"}'],
        ['idm.', '{"en": "idiom", "zh": "惯用语"}'],
        ['na.', '{"en": "not applicable", "zh": "不适用"}']
    ];
    $stmt = $db->prepare("INSERT IGNORE INTO vnb_pos (pos, name) VALUES (?, ?)");
    foreach ($posData as $row) {
        $stmt->execute($row);
    }
}

/**
 * Delete user and all associated data (backward compatibility interface)
 * 
 * NOTE: This function is kept for backward compatibility with legacy code
 * that may call deleteVnbUserData($uname). However, it is NOT invoked in
 * the refactored architecture.
 * 
 * The actual deletion is handled directly in users.php deleteUsers() function:
 *   DELETE FROM vnb_users WHERE name = ?
 * 
 * Thanks to database foreign key constraints (ON DELETE CASCADE), a single
 * DELETE on vnb_users automatically cascades to clean up all related records:
 *   - vnu_mapbw (word-book mappings)
 *   - vnu_review (review records)
 *   - vnu_sentences (example sentences)
 *   - vnu_explanations (word explanations)
 *   - vnu_words (user's words)
 *   - vnu_books (user's wordbooks)
 * 
 * This function remains callable for any legacy integration points but should
 * not be used in new code.
 * 
 * @param string $uname Username to delete
 * @return stdClass Object with v (boolean success) and optional e (error message)
 */
function deleteVnbUserData($uname)
{
    $ret = new stdClass();
    $ret->v = false;
    try {
        $db = DB::vnb();
        $stmt = $db->prepare("DELETE FROM vnb_users WHERE name = ?");
        $stmt->execute([$uname]);
        $ret->v = true;
    } catch (Exception $e) {
        $ret->e = $e->getMessage();
    }
    return $ret;
}

/**
 * Reset all initialized system data (backward compatibility interface)
 * 
 * Clears all user data and resets the system to a clean state by:
 * 1. Deleting all non-admin users (which cascades to delete all their data)
 * 2. Clearing POS (part-of-speech) standard data
 * 3. Re-initializing POS standards
 * 4. Ensuring admin user remains
 * 
 * NOTE: This function is kept for backward compatibility with legacy code
 * that needs to reset the system to initial state.
 * 
 * @return stdClass Object with v (boolean success) and optional e (error message)
 */
function resetVnbInitData()
{
    $ret = new stdClass();
    $ret->v = false;
    try {
        $db = DB::vnb();
        $db->beginTransaction();

        // Clear review records for full reset
        $db->exec("DELETE FROM vnu_review");

        // Delete all non-admin users (CASCADE will clean up all related data)
        $db->exec("DELETE FROM vnb_users WHERE name NOT IN ('admin')");

        // Clear POS data
        $db->exec("DELETE FROM vnb_pos");

        // Re-initialize POS standards
        initSystemPosData();

        $db->commit();
        $ret->v = true;
    } catch (Exception $e) {
        if ($db) $db->rollBack();
        $ret->e = $e->getMessage();
    }
    return $ret;
}

/**
 * Initialize base dictionary database structure
 * 
 * Creates the va_basedict database and its tables based on the schema defined
 * in va_basedict_init.sql. This function is called during admin's first login
 * when the base dictionary database does not exist.
 * 
 * @return stdClass Object with v (boolean success) and optional e (error message)
 */
function createBaseDictInitData()
{
    $ret = new stdClass();
    $ret->v = false;
    try {
        // Create database if it doesn't exist
        $tmpPdo = new PDO("mysql:host=" . C_VNB_DB_HOST, C_VNB_DB_USER, C_VNB_DB_PASS);
        $tmpPdo->exec("CREATE DATABASE IF NOT EXISTS `" . C_DB_BASE . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

        // Get connection to the base dictionary database
        $db = DB::base();
        if ($db === null) {
            throw new Exception("Failed to connect to base dictionary database after creation");
        }

        // Create tables
        $queries = [
            // 1. Registry table
            "CREATE TABLE IF NOT EXISTS `registry` (
                `key` VARCHAR(20) NOT NULL,
                `tag` VARCHAR(20) NOT NULL,
                `name` VARCHAR(100) NOT NULL,
                `sorder` SMALLINT DEFAULT 0,
                `active` TINYINT(1) DEFAULT 1,
                `desc` TEXT,
                PRIMARY KEY (`key`),
                INDEX `idx_active_order` (`active`, `sorder`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

            // 2. Words table
            "CREATE TABLE IF NOT EXISTS `words` (
                `id` INT(11) NOT NULL AUTO_INCREMENT,
                `word` VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
                `word_search` VARCHAR(100) GENERATED ALWAYS AS (LCASE(`word`)) STORED,
                `ipas` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (JSON_VALID(`ipas`)),
                PRIMARY KEY (`id`),
                UNIQUE KEY `idx_word_unique` (`word`),
                KEY `idx_word_search` (`word_search`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci",

            // 3. Definitions table
            "CREATE TABLE IF NOT EXISTS `definitions` (
                `id` INT(11) NOT NULL AUTO_INCREMENT,
                `word_id` INT(11) NOT NULL,
                `pos` VARCHAR(10) NOT NULL,
                `ipa_idx` TINYINT(4) DEFAULT 0,
                `meanings` LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL CHECK (JSON_VALID(`meanings`)),
                PRIMARY KEY (`id`),
                KEY `fk_word_ref` (`word_id`),
                CONSTRAINT `fk_word_ref` FOREIGN KEY (`word_id`) REFERENCES `words` (`id`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
        ];

        foreach ($queries as $sql) {
            $db->exec($sql);
        }

        // Insert system reserved registry record
        $stmt = $db->prepare("INSERT IGNORE INTO `registry` (`key`, `tag`, `name`, `sorder`, `active`, `desc`) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute(['gen', '通用', '通用词典', 0, 1, '内置基本通用词典']);

        $ret->v = true;
    } catch (Exception $e) {
        $ret->e = $e->getMessage();
    }
    return $ret;
}
