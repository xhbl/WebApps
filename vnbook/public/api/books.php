<?php

/**
 * books.php - User's Wordbook Collection Management API
 * 
 * Manages book collections (containers for vocabulary learning).
 * Full CRUD operations with proper user isolation via FK constraints.
 */

require_once 'login.php';

/**
 * Retrieve book(s) for current user
 * 
 * @param int $bid Optional book ID for single book retrieval
 * @return array Array of book objects or false on error
 */
function getBooks($bid = null)
{
    $db = DB::vnb();
    $uid = $_SESSION['user_id'];

    try {
        if ($bid) {
            // Fetch single book with ownership verification
            $stmt = $db->prepare("SELECT id, user_id, title, nums, time_c, hide, ptop, sorder FROM vnu_books WHERE id = ? AND user_id = ?");
            $stmt->execute([$bid, $uid]);
        } else {
            // Fetch all user's books
            $stmt = $db->prepare("SELECT id, user_id, title, nums, time_c, hide, ptop, sorder FROM vnu_books WHERE user_id = ? ORDER BY ptop DESC, sorder ASC, time_c DESC");
            $stmt->execute([$uid]);
        }

        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Add _new flag for client tracking
        foreach ($rows as &$row) {
            $row['_new'] = 0;
        }

        return $rows;
    } catch (Exception $e) {
        return false;
    }
}

/**
 * Create new book or update existing book metadata
 * 
 * @param array $items Array of book objects with _new flag
 * @return stdClass Object with v (success), e (error), and o (output data)
 */
function updateBooks($items)
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
                // Create new book
                $stmt = $db->prepare("INSERT INTO vnu_books (user_id, title, nums, hide, ptop, sorder) VALUES (?, ?, 0, 0, ?, ?)");
                $ptop = isset($item->ptop) ? (int)$item->ptop : 0;
                $sorder = isset($item->sorder) ? (int)$item->sorder : 0;
                $stmt->execute([$uid, $item->title ?? 'Untitled', $ptop, $sorder]);

                $bid = $db->lastInsertId();

                $item->id = $bid;
            } else {
                // Update existing book (ownership verified)
                // Use dynamic update to avoid resetting fields (like sorder) to 0 if not provided in request
                $fields = [];
                $params = [];
                $updatableFields = ['title', 'hide', 'ptop', 'sorder'];
                foreach ($updatableFields as $f) {
                    if (isset($item->$f)) {
                        $fields[] = "$f = ?";
                        $params[] = $item->$f;
                    }
                }
                // Construct and execute the SQL only if there are changes
                if (!empty($fields)) {
                    // Join fields with commas and append WHERE clause for security (ownership check)
                    $sql = "UPDATE vnu_books SET " . implode(", ", $fields) . " WHERE id = ? AND user_id = ?";
                    // Add WHERE clause parameters (id and uid) to the array
                    array_push($params, $item->id, $uid);
                    // Execute prepared statement
                    $db->prepare($sql)->execute($params);
                }
            }

            // Refresh from DB (Unified for both Insert and Update)
            // This ensures we get the correct data types (int for id) and server-generated fields (time_c)
            $stmt = $db->prepare("SELECT * FROM vnu_books WHERE id = ? AND user_id = ?");
            $stmt->execute([$item->id, $uid]);
            $book = $stmt->fetch(PDO::FETCH_ASSOC);
            $item = (object)$book;
            $item->_new = 0;

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
 * Delete book(s) and all associated mappings
 * CASCADE FK constraint automatically deletes from vnu_mapbw
 * 
 * @param array $items Array of book objects to delete
 * @return bool Success flag
 */
function deleteBooks($items)
{
    $db = DB::vnb();
    $uid = $_SESSION['user_id'];
    try {
        $db->beginTransaction();
        foreach ($items as $item) {
            $bookId = $item->id;
            $deleteWords = !empty($item->deleteWords);
            if ($deleteWords) {
                // 勾选了“同时删除”，则删除本次操作后会变成孤儿的单词
                $sqlGetOnlyInThisBook = "
                    SELECT word_id FROM vnu_mapbw 
                    WHERE book_id = ? AND user_id = ?
                    AND word_id NOT IN (
                        SELECT word_id FROM vnu_mapbw WHERE book_id != ? AND user_id = ?
                    )";
                $sqlDeleteOrphans = "DELETE FROM vnu_words WHERE id IN ($sqlGetOnlyInThisBook)";
                $db->prepare($sqlDeleteOrphans)->execute([$bookId, $uid, $bookId, $uid]);
            }
            // 如果不勾选，则不删除任何单词。下面的删除单词本操作会通过级联删除自动移除关联。
            // 再删除本子（级联删除映射）
            $db->prepare("DELETE FROM vnu_books WHERE id = ? AND user_id = ?")
                ->execute([$bookId, $uid]);
        }
        $db->commit();
        return true;
    } catch (Exception $e) {
        $db->rollBack();
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
    if ($method == 'GET') {
        // Read - retrieve books
        $bid = $_GET["bid"] ?? null;
        $rows = getBooks($bid);

        if ($rows !== false) {
            $response = ['success' => true, 'book' => $rows];

            // Get review book count
            try {
                $db = DB::vnb();
                $uid = $_SESSION['user_id'];
                $stmt = $db->prepare("SELECT COUNT(*) FROM vnu_review WHERE user_id = ?");
                $stmt->execute([$uid]);
                $response['reviewCount'] = (int)$stmt->fetchColumn();
            } catch (Exception $e) {
                $response['reviewCount'] = 0;
            }
        } else {
            $response['message'] = "Error fetching books";
        }
    } else if ($method == 'PUT' && $input) {
        // Update - create or modify books
        $ret = updateBooks($input);
        if ($ret->v) {
            $response = ['success' => true, 'book' => $ret->o];
        } else {
            $response['message'] = $ret->e;
        }
    } else if ($method == 'DELETE' && $input) {
        // Delete - remove books
        if (deleteBooks($input)) {
            $response = ['success' => true, 'book' => null];
        } else {
            $response['message'] = "Error deleting books";
        }
    } else {
        $response['message'] = "Invalid request method or missing data";
    }
} catch (Exception $e) {
    $response['message'] = $e->getMessage();
}

echo json_encode($response);
