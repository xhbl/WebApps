<?php

/**
 * words.php - Vocabulary Management API with Nested Structure
 * 
 * Complex multi-level CRUD for vocabulary with explanations and sentences.
 * Supports hierarchical queries: words → explanations → sentences
 * 
 * Query Parameters:
 * - bid (book ID) - required for word requests
 * - wid (word ID) - optional, filters to specific word
 * - eid (explanation ID) - optional, filters to specific explanation
 * - sid (sentence ID) - optional, filters to specific sentence
 * - req (request type) - auto-detected if not specified: 'w'=words, 'e'=explanations, 's'=sentences
 */

require_once 'login.php';

/**
 * Retrieve words for a book with nested explanations
 */
function getWords($bid, $wid = null, $word = null)
{
    $db = DB::vnb();
    $uid = $_SESSION['user_id'];

    try {
        if ($bid == 0) {
            // Fetch all words for the user (All Words view)
            $sql = "SELECT w.id, w.user_id, w.word, w.phon, w.time_c,
                    (SELECT COUNT(*) FROM vnu_mapbw m WHERE m.word_id = w.id) as book_count
                    FROM vnu_words w
                    WHERE w.user_id = ?";
            $params = [$uid];
        } else {
            // Get words for this book (only those mapped to this book)
            $sql = "SELECT w.id, w.user_id, w.word, w.phon, w.time_c, m.book_id, m.id as map_id
                    FROM vnu_words w
                    LEFT JOIN vnu_mapbw m ON w.id = m.word_id AND m.book_id = ?
                    WHERE w.user_id = ? AND m.id IS NOT NULL";
            $params = [$bid, $uid];
        }

        if ($wid) {
            $sql .= " AND w.id = ?";
            $params[] = $wid;
        }

        if ($word) {
            $sql .= " AND w.word = ?";
            $params[] = $word;
        }

        $sql .= " ORDER BY w.time_c DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Add nested explanations and _new flag
        foreach ($rows as &$row) {
            $row['explanations'] = getExplanations($row['id']);
            $row['_new'] = 0;
        }

        return $rows;
    } catch (Exception $e) {
        return false;
    }
}

/**
 * Retrieve explanations for a word with nested sentences
 */
function getExplanations($wid, $eid = null)
{
    $db = DB::vnb();

    try {
        $sql = "SELECT e.id, e.word_id, e.pos, e.exp, e.time_c
                FROM vnu_explanations e
                WHERE e.word_id = ?";
        $params = [$wid];

        if ($eid) {
            $sql .= " AND e.id = ?";
            $params[] = $eid;
        }

        $sql .= " ORDER BY e.time_c DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Parse JSON exp field and add nested sentences
        foreach ($rows as &$row) {
            $row['exp'] = json_decode($row['exp'], true);
            $row['sentences'] = getSentences($row['id']);
            $row['_new'] = 0;
        }

        return $rows;
    } catch (Exception $e) {
        return false;
    }
}

/**
 * Retrieve sentences for an explanation
 */
function getSentences($eid, $sid = null)
{
    $db = DB::vnb();

    try {
        $sql = "SELECT id, exp_id, sen, time_c
                FROM vnu_sentences
                WHERE exp_id = ?";
        $params = [$eid];

        if ($sid) {
            $sql .= " AND id = ?";
            $params[] = $sid;
        }

        $sql .= " ORDER BY time_c DESC";

        $stmt = $db->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Parse JSON sen field
        foreach ($rows as &$row) {
            $row['sen'] = json_decode($row['sen'], true);
            $row['_new'] = 0;
        }

        return $rows;
    } catch (Exception $e) {
        return false;
    }
}

/**
 * Update words (add new, edit existing, or add existing word to book)
 */
function updateWords($bid, $items)
{
    $db = DB::vnb();
    $uid = $_SESSION['user_id'];
    $ret = new stdClass();
    $ret->v = false;
    $out = [];

    try {
        $db->beginTransaction();

        foreach ($items as $item) {
            if (!empty($item->_new)) {
                // New word: check if already exists
                $stmt = $db->prepare("SELECT id FROM vnu_words WHERE user_id = ? AND word = ?");
                $stmt->execute([$uid, $item->word]);
                $existingWord = $stmt->fetch(PDO::FETCH_ASSOC);

                if ($existingWord) {
                    // Word exists
                    if ($item->_new == 1) {
                        // First attempt: check if already in book
                        $stmt = $db->prepare("SELECT id FROM vnu_mapbw WHERE word_id = ? AND book_id = ?");
                        $stmt->execute([$existingWord['id'], $bid]);

                        if ($stmt->fetch()) {
                            // Already in book
                            $item->id = $existingWord['id'];
                            $item->_new = 0;
                        } else {
                            // Not in book yet, signal second attempt needed
                            $item->id = $existingWord['id'];
                            $item->_new = 2;
                        }
                    } else if ($item->_new == 2) {
                        // Second attempt: add to book
                        $stmt = $db->prepare("INSERT IGNORE INTO vnu_mapbw (user_id, book_id, word_id) VALUES (?, ?, ?)");
                        $stmt->execute([$uid, $bid, $item->id]);

                        $item->_new = 0;
                    }
                } else {
                    // Create new word
                    $stmt = $db->prepare("INSERT INTO vnu_words (user_id, word, phon) VALUES (?, ?, ?)");
                    $stmt->execute([$uid, $item->word, $item->phon ?? null]);

                    $wid = $db->lastInsertId();
                    $item->id = $wid;

                    // Add to book
                    $stmt = $db->prepare("INSERT INTO vnu_mapbw (user_id, book_id, word_id) VALUES (?, ?, ?)");
                    $stmt->execute([$uid, $bid, $wid]);

                    $item->_new = 0;
                }
            } else {
                // Edit existing word (pronunciation, hide status)
                $stmt = $db->prepare("UPDATE vnu_words SET phon = ? WHERE id = ? AND user_id = ?");
                $stmt->execute([$item->phon ?? null, $item->id, $uid]);
            }

            // Fetch full word with explanations
            $stmt = $db->prepare("SELECT * FROM vnu_words WHERE id = ? AND user_id = ?");
            $stmt->execute([$item->id, $uid]);
            $word = $stmt->fetch(PDO::FETCH_ASSOC);
            $word['explanations'] = getExplanations($item->id);
            $word['_new'] = 0;

            $out[] = (object)$word;
        }

        $db->commit();
        $ret->v = true;
        $ret->o = $out;
    } catch (Exception $e) {
        $db->rollBack();
        $ret->e = $e->getMessage();
    }

    return $ret;
}

/**
 * Update explanations (add new or edit existing)
 */
function updateExplanations($items)
{
    $db = DB::vnb();
    $uid = $_SESSION['user_id'];
    $ret = new stdClass();
    $ret->v = false;
    $out = [];

    try {
        $db->beginTransaction();

        foreach ($items as $item) {
            // Verify word belongs to user
            $stmt = $db->prepare("SELECT id FROM vnu_words WHERE id = ? AND user_id = ?");
            $stmt->execute([$item->word_id, $uid]);
            if (!$stmt->fetch()) {
                throw new Exception("Unauthorized: word not found");
            }

            if (!empty($item->_new)) {
                // Create new explanation
                $expJson = json_encode($item->exp ?? []);
                $stmt = $db->prepare("INSERT INTO vnu_explanations (word_id, pos, exp) VALUES (?, ?, ?)");
                $stmt->execute([$item->word_id, $item->pos ?? 'na.', $expJson]);

                $item->id = $db->lastInsertId();
                $item->_new = 0;
            } else {
                // Update existing explanation
                $expJson = json_encode($item->exp ?? []);
                $stmt = $db->prepare("UPDATE vnu_explanations SET pos = ?, exp = ? WHERE id = ? AND word_id IN (SELECT id FROM vnu_words WHERE user_id = ?)");
                $stmt->execute([$item->pos ?? 'na.', $expJson, $item->id, $uid]);
            }

            $out[] = $item;
        }

        $db->commit();
        $ret->v = true;
        $ret->o = $out;
    } catch (Exception $e) {
        $db->rollBack();
        $ret->e = $e->getMessage();
    }

    return $ret;
}

/**
 * Update sentences (add new or edit existing)
 */
function updateSentences($items)
{
    $db = DB::vnb();
    $uid = $_SESSION['user_id'];
    $ret = new stdClass();
    $ret->v = false;
    $out = [];

    try {
        $db->beginTransaction();

        foreach ($items as $item) {
            // Verify explanation belongs to user's word
            $stmt = $db->prepare("SELECT e.id FROM vnu_explanations e JOIN vnu_words w ON e.word_id = w.id WHERE e.id = ? AND w.user_id = ?");
            $stmt->execute([$item->exp_id, $uid]);
            if (!$stmt->fetch()) {
                throw new Exception("Unauthorized: explanation not found");
            }

            if (!empty($item->_new)) {
                // Create new sentence
                $senJson = json_encode($item->sen ?? []);
                $stmt = $db->prepare("INSERT INTO vnu_sentences (exp_id, sen) VALUES (?, ?)");
                $stmt->execute([$item->exp_id, $senJson]);

                $item->id = $db->lastInsertId();
                $item->_new = 0;
            } else {
                // Update existing sentence
                $senJson = json_encode($item->sen ?? []);
                $stmt = $db->prepare("UPDATE vnu_sentences SET sen = ? WHERE id = ? AND exp_id IN (SELECT e.id FROM vnu_explanations e JOIN vnu_words w ON e.word_id = w.id WHERE w.user_id = ?)");
                $stmt->execute([$senJson, $item->id, $uid]);
            }

            $out[] = $item;
        }

        $db->commit();
        $ret->v = true;
        $ret->o = $out;
    } catch (Exception $e) {
        $db->rollBack();
        $ret->e = $e->getMessage();
    }

    return $ret;
}

/**
 * Delete words (with cascade checks)
 */
function deleteWords($bid, $items)
{
    $db = DB::vnb();
    $uid = $_SESSION['user_id'];

    try {
        $db->beginTransaction();

        foreach ($items as $item) {
            if ($bid == 0) {
                // In "All Words" mode, delete the word directly.
                // ON DELETE CASCADE will remove mappings, explanations, sentences.
                $stmt = $db->prepare("DELETE FROM vnu_words WHERE id = ? AND user_id = ?");
                $stmt->execute([$item->id, $uid]);
            } else {
                // Specific book mode
                // Only delete the mapping for this book.
                // Never delete the word itself from a book view, even if it becomes orphaned.
                $stmt = $db->prepare("DELETE FROM vnu_mapbw WHERE word_id = ? AND book_id = ? AND user_id = ?");
                $stmt->execute([$item->id, $bid, $uid]);
            }
        }

        $db->commit();
        return true;
    } catch (Exception $e) {
        $db->rollBack();
        return false;
    }
}

/**
 * Delete explanations
 */
function deleteExplanations($items)
{
    $db = DB::vnb();
    $uid = $_SESSION['user_id'];

    try {
        $db->beginTransaction();

        foreach ($items as $item) {
            // Verify authorization
            $stmt = $db->prepare("SELECT e.id FROM vnu_explanations e JOIN vnu_words w ON e.word_id = w.id WHERE e.id = ? AND w.user_id = ?");
            $stmt->execute([$item->id, $uid]);
            if (!$stmt->fetch()) {
                throw new Exception("Unauthorized");
            }

            // Database ON DELETE CASCADE handles sentences
            $db->exec("DELETE FROM vnu_explanations WHERE id = " . (int)$item->id);
        }

        $db->commit();
        return true;
    } catch (Exception $e) {
        $db->rollBack();
        return false;
    }
}

/**
 * Delete sentences
 */
function deleteSentences($items)
{
    $db = DB::vnb();
    $uid = $_SESSION['user_id'];

    try {
        foreach ($items as $item) {
            // Verify authorization
            $stmt = $db->prepare("SELECT s.id FROM vnu_sentences s JOIN vnu_explanations e ON s.exp_id = e.id JOIN vnu_words w ON e.word_id = w.id WHERE s.id = ? AND w.user_id = ?");
            $stmt->execute([$item->id, $uid]);
            if (!$stmt->fetch()) {
                throw new Exception("Unauthorized");
            }

            $db->exec("DELETE FROM vnu_sentences WHERE id = " . $item->id);
        }

        return true;
    } catch (Exception $e) {
        return false;
    }
}

// Set response header
header('Content-Type: application/json; charset=utf-8');

// Check login
$logsess = vnb_checklogin($_GET["_sessid"] ?? null);
if ($logsess->success !== true) {
    die(json_encode($logsess));
}

$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents("php://input"));
if ($input && !is_array($input)) $input = [$input];

$response = ['success' => false];

try {
    // Determine request type
    $req = $_GET["req"] ?? null;
    $bid = $_GET["bid"] ?? null;
    $wid = $_GET["wid"] ?? null;
    $eid = $_GET["eid"] ?? null;
    $sid = $_GET["sid"] ?? null;
    $word = $_GET["word"] ?? null;

    // Auto-detect request type if not specified
    if (!$req) {
        if ($sid) $req = 's';
        else if ($eid) $req = 'e';
        else $req = 'w';
    }

    if ($method == 'GET') {
        // Read operations
        if ($req == 'w') {
            $rows = getWords($bid, $wid, $word);
            if ($rows !== false) {
                $response = ['success' => true, 'word' => $rows];
            } else {
                $response['message'] = 'Error fetching words';
            }
        } else if ($req == 'e') {
            $rows = getExplanations($wid, $eid);
            if ($rows !== false) {
                $response = ['success' => true, 'explanation' => $rows];
            } else {
                $response['message'] = 'Error fetching explanations';
            }
        } else if ($req == 's') {
            $rows = getSentences($eid, $sid);
            if ($rows !== false) {
                $response = ['success' => true, 'sentence' => $rows];
            } else {
                $response['message'] = 'Error fetching sentences';
            }
        } else {
            $response['message'] = 'Invalid request type';
        }
    } else if ($method == 'PUT' && $input) {
        // Update operations
        if ($req == 'w') {
            $ret = updateWords($bid, $input);
            if ($ret->v) {
                $response = ['success' => true, 'word' => $ret->o];
            } else {
                $response['message'] = $ret->e;
            }
        } else if ($req == 'e') {
            $ret = updateExplanations($input);
            if ($ret->v) {
                $response = ['success' => true, 'explanation' => $ret->o];
            } else {
                $response['message'] = $ret->e;
            }
        } else if ($req == 's') {
            $ret = updateSentences($input);
            if ($ret->v) {
                $response = ['success' => true, 'sentence' => $ret->o];
            } else {
                $response['message'] = $ret->e;
            }
        }
    } else if ($method == 'DELETE' && $input) {
        // Delete operations
        if ($req == 'w') {
            if (deleteWords($bid, $input)) {
                $response = ['success' => true];
            } else {
                $response['message'] = 'Error deleting words';
            }
        } else if ($req == 'e') {
            if (deleteExplanations($input)) {
                $response = ['success' => true];
            } else {
                $response['message'] = 'Error deleting explanations';
            }
        } else if ($req == 's') {
            if (deleteSentences($input)) {
                $response = ['success' => true];
            } else {
                $response['message'] = 'Error deleting sentences';
            }
        }
    } else {
        $response['message'] = 'Invalid request';
    }
} catch (Exception $e) {
    $response['message'] = $e->getMessage();
}

echo json_encode($response);
