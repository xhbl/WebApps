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
                `time_c` DATETIME DEFAULT CURRENT_TIMESTAMP,
                `time_r` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                UNIQUE INDEX `idx_u_w` (`user_id`, `word_id`),
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
