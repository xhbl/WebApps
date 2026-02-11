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
                    (SELECT COUNT(*) FROM vnu_mapbw m WHERE m.word_id = w.id) as book_count,
                    (SELECT COUNT(*) FROM vnu_review r WHERE r.word_id = w.id) as in_review
                    FROM vnu_words w
                    WHERE w.user_id = ?";
            $params = [$uid];
        } else if ($bid == -1) {
            // Review Book: Fetch words from vnu_review
            // Use r.time_c (added to review time) as the main time_c for sorting consistency
            $sql = "SELECT w.id, w.user_id, w.word, w.phon, r.time_c,
                    r.n_known, r.n_unknown, r.n_streak, r.time_r,
                    (SELECT COUNT(*) FROM vnu_mapbw m WHERE m.word_id = w.id) as book_count,
                    1 as in_review
                    FROM vnu_words w
                    JOIN vnu_review r ON w.id = r.word_id
                    WHERE w.user_id = ?";
            $params = [$uid];
        } else {
            // Get words for this book (only those mapped to this book)
            $sql = "SELECT w.id, w.user_id, w.word, w.phon, w.time_c, m.book_id, m.id as map_id,
                    (SELECT COUNT(*) FROM vnu_review r WHERE r.word_id = w.id) as in_review
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

        if ($bid == -1) {
            $sql .= " ORDER BY r.time_c DESC";
        } else {
            $sql .= " ORDER BY w.time_c DESC";
        }

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
        $sql = "SELECT e.id, e.word_id, e.pos, e.exp, e.time_c, e.sorder
                FROM vnu_explanations e
                WHERE e.word_id = ?";
        $params = [$wid];

        if ($eid) {
            $sql .= " AND e.id = ?";
            $params[] = $eid;
        }

        $sql .= " ORDER BY e.sorder ASC, e.time_c DESC";

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
        $sql = "SELECT id, exp_id, sen, time_c, sorder, smemo
                FROM vnu_sentences
                WHERE exp_id = ?";
        $params = [$eid];

        if ($sid) {
            $sql .= " AND id = ?";
            $params[] = $sid;
        }

        $sql .= " ORDER BY sorder ASC, time_c DESC";

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
 * Get word suggestions from Base Dictionary
 */
function getWordSuggestions($prefix)
{
    if (empty($prefix)) return [];
    $db = DB::base();
    if (!$db) return [];

    try {
        $stmt = $db->prepare("SELECT id, word FROM words WHERE word_search LIKE ? ORDER BY word_search LIMIT 10");
        $stmt->execute([strtolower($prefix) . '%']);
        $words = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($words)) return [];

        $ids = array_column($words, 'id');
        $placeholders = implode(',', array_fill(0, count($ids), '?'));

        $stmt = $db->prepare("SELECT word_id, pos, meanings FROM definitions WHERE word_id IN ($placeholders)");
        $stmt->execute($ids);
        $defs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $defMap = [];
        foreach ($defs as $d) {
            $wid = $d['word_id'];
            if (isset($defMap[$wid])) continue; // 仅取第一个释义以保持简洁
            $meanings = json_decode($d['meanings'], true);
            $zh = $meanings['zh'] ?? [];
            if (!empty($zh)) {
                $defMap[$wid] = $d['pos'] . ' ' . implode('; ', array_slice($zh, 0, 2));
            }
        }

        $out = [];
        foreach ($words as $w) {
            $out[] = [
                'word' => $w['word'],
                'def' => $defMap[$w['id']] ?? ''
            ];
        }
        return $out;
    } catch (Exception $e) {
        return [];
    }
}

/**
 * Helper: Fetch data from Base Dictionary (va_basedict)
 * @param array $wordList Array of word strings
 * @return array Map of word -> baseInfo object
 */
function getBaseDictData($wordList)
{
    if (empty($wordList)) return [];

    $db = DB::base();
    if (!$db) return []; // Base dict might not be configured

    $placeholders = implode(',', array_fill(0, count($wordList), '?'));
    $map = [];

    try {
        // 1. Fetch words and IPAs
        // Use word_search for case-insensitive matching if needed, but here we match exact word first or rely on DB collation
        $stmt = $db->prepare("SELECT id, word, ipas FROM words WHERE word IN ($placeholders)");
        $stmt->execute($wordList);
        $words = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $wordIds = [];
        foreach ($words as $w) {
            $map[$w['word']] = [
                'ipas' => json_decode($w['ipas']),
                'definitions' => []
            ];
            $wordIds[$w['id']] = $w['word'];
        }

        if (empty($wordIds)) return $map;

        // 2. Fetch definitions
        $idPlaceholders = implode(',', array_fill(0, count($wordIds), '?'));
        $stmt = $db->prepare("SELECT word_id, pos, ipa_idx, meanings FROM definitions WHERE word_id IN ($idPlaceholders) ORDER BY id");
        $stmt->execute(array_keys($wordIds));
        $defs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        foreach ($defs as $d) {
            $wordStr = $wordIds[$d['word_id']];
            $d['meanings'] = json_decode($d['meanings']);
            unset($d['word_id']); // Clean up
            $map[$wordStr]['definitions'][] = $d;
        }
    } catch (Exception $e) {
        // Ignore base dict errors to avoid breaking main app
    }
    return $map;
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
                    if ($bid == -1) {
                        // Review Book: Add to review (INSERT IGNORE handles duplicates)
                        $stmt = $db->prepare("INSERT IGNORE INTO vnu_review (user_id, word_id) VALUES (?, ?)");
                        $stmt->execute([$uid, $existingWord['id']]);
                        $item->id = $existingWord['id'];
                        $item->_new = 0;
                    } else if ($item->_new == 1) {
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
                    if ($bid == -1) {
                        $stmt = $db->prepare("INSERT IGNORE INTO vnu_review (user_id, word_id) VALUES (?, ?)");
                        $stmt->execute([$uid, $wid]);
                    } else {
                        $stmt = $db->prepare("INSERT INTO vnu_mapbw (user_id, book_id, word_id) VALUES (?, ?, ?)");
                        $stmt->execute([$uid, $bid, $wid]);
                    }

                    $item->_new = 0;
                }
            } else {
                // Edit existing word (pronunciation, hide status)
                $stmt = $db->prepare("UPDATE vnu_words SET phon = ? WHERE id = ? AND user_id = ?");
                $stmt->execute([$item->phon ?? null, $item->id, $uid]);
            }

            // Fetch full word with explanations
            $stmt = $db->prepare("SELECT *, 
                (SELECT COUNT(*) FROM vnu_mapbw m WHERE m.word_id = vnu_words.id) as book_count 
                FROM vnu_words WHERE id = ? AND user_id = ?");
            $stmt->execute([$item->id, $uid]);
            $word = $stmt->fetch(PDO::FETCH_ASSOC);
            $word['explanations'] = getExplanations($item->id);
            $word['_new'] = isset($item->_new) ? $item->_new : 0;

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
                $sql = "UPDATE vnu_explanations SET pos = ?, exp = ?";
                $params = [$item->pos ?? 'na.', $expJson];

                if (isset($item->sorder)) {
                    $sql .= ", sorder = ?";
                    $params[] = $item->sorder;
                }

                $sql .= " WHERE id = ? AND word_id IN (SELECT id FROM vnu_words WHERE user_id = ?)";
                $params[] = $item->id;
                $params[] = $uid;
                $db->prepare($sql)->execute($params);
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
                $stmt = $db->prepare("INSERT INTO vnu_sentences (exp_id, sen, smemo) VALUES (?, ?, ?)");
                $stmt->execute([$item->exp_id, $senJson, $item->smemo ?? null]);

                $item->id = $db->lastInsertId();
                $item->_new = 0;
            } else {
                // Update existing sentence
                $senJson = json_encode($item->sen ?? []);
                $sql = "UPDATE vnu_sentences SET sen = ?";
                $params = [$senJson];

                if (isset($item->sorder)) {
                    $sql .= ", sorder = ?";
                    $params[] = $item->sorder;
                }

                if (property_exists($item, 'smemo')) {
                    $sql .= ", smemo = ?";
                    $params[] = $item->smemo;
                }

                $sql .= " WHERE id = ? AND exp_id IN (SELECT e.id FROM vnu_explanations e JOIN vnu_words w ON e.word_id = w.id WHERE w.user_id = ?)";
                $params[] = $item->id;
                $params[] = $uid;
                $db->prepare($sql)->execute($params);
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
 * Delete words (Optimized for batch operation)
 */
function deleteWords($bid, $items)
{
    $db = DB::vnb();
    $uid = $_SESSION['user_id'];

    // Extract IDs
    $ids = array_map(function ($item) {
        return (int)$item->id;
    }, $items);
    if (empty($ids)) return true;

    // Check if deleteOrphans is requested (assume consistent for batch)
    $deleteOrphans = !empty($items[0]->deleteOrphans);

    try {
        $db->beginTransaction();

        // Create placeholders string (?,?,?)
        $placeholders = implode(',', array_fill(0, count($ids), '?'));

        if ($bid == 0) {
            // Mode: All Words - Physical Delete
            // Params: [...ids, uid]
            $sql = "DELETE FROM vnu_words WHERE id IN ($placeholders) AND user_id = ?";
            $params = array_merge($ids, [$uid]);
            $db->prepare($sql)->execute($params);
        } else if ($bid == -1) {
            // Mode: Review Book - Remove from review
            // Params: [...ids, uid]
            $sql = "DELETE FROM vnu_review WHERE word_id IN ($placeholders) AND user_id = ?";
            $params = array_merge($ids, [$uid]);
            $db->prepare($sql)->execute($params);
        } else {
            // Mode: Specific Book - Remove mapping
            // 1. Delete mappings for this book
            // Params: [...ids, bid, uid]
            $sql = "DELETE FROM vnu_mapbw WHERE word_id IN ($placeholders) AND book_id = ? AND user_id = ?";
            $params = array_merge($ids, [$bid, $uid]);
            $db->prepare($sql)->execute($params);

            // 2. (Optional) Clean up orphans
            if ($deleteOrphans) {
                // Delete words that are in the target list AND no longer have any mappings
                // Params: [...ids, uid]
                $sql = "DELETE FROM vnu_words 
                        WHERE id IN ($placeholders) 
                        AND user_id = ?
                        AND id NOT IN (SELECT word_id FROM vnu_mapbw)";
                $params = array_merge($ids, [$uid]);
                $db->prepare($sql)->execute($params);
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

    // Handle direct dictionary lookup (req=dict)
    if ($req == 'dict' && $word) {
        $dictData = getBaseDictData([$word]);
        $data = $dictData[$word] ?? null;
        echo json_encode(['success' => true, 'data' => $data]);
        exit;
    }

    // Handle word suggestions (req=suggest)
    if ($req == 'suggest' && $word) {
        $suggestions = getWordSuggestions($word);
        echo json_encode(['success' => true, 'data' => $suggestions]);
        exit;
    }

    // Handle get belonging books (req=books)
    if ($req == 'books' && $wid) {
        $db = DB::vnb();
        $uid = $_SESSION['user_id'];
        $stmt = $db->prepare("
            SELECT b.id, b.title 
            FROM vnu_books b
            JOIN vnu_mapbw m ON b.id = m.book_id
            WHERE m.word_id = ? AND m.user_id = ?
            ORDER BY b.title
        ");
        $stmt->execute([$wid, $uid]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Check review status
        $stmt = $db->prepare("SELECT 1 FROM vnu_review WHERE word_id = ? AND user_id = ?");
        $stmt->execute([$wid, $uid]);
        $inReview = (bool)$stmt->fetchColumn();

        echo json_encode(['success' => true, 'book' => $rows, 'inReview' => $inReview]);
        exit;
    }

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
                // Attach Base Dictionary Info
                $wordList = array_column($rows, 'word');
                // Filter unique words to reduce query size
                $uniqueWords = array_unique($wordList);
                $baseData = getBaseDictData(array_values($uniqueWords));

                foreach ($rows as &$row) {
                    $row['baseInfo'] = $baseData[$row['word']] ?? null;
                }

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
                // Attach Base Dictionary Info for updated/created words
                $rows = $ret->o;
                $wordList = [];
                foreach ($rows as $row) {
                    if (isset($row->word)) {
                        $wordList[] = $row->word;
                    }
                }
                if (!empty($wordList)) {
                    $baseData = getBaseDictData(array_values(array_unique($wordList)));
                    foreach ($rows as $row) {
                        if (isset($row->word) && isset($baseData[$row->word])) {
                            $row->baseInfo = $baseData[$row->word];
                        }
                    }
                }
                $response = ['success' => true, 'word' => $rows];
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
