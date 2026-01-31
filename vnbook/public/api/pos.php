<?php

/**
 * pos.php - Lexical Categories / Parts of Speech API
 * Renamed from lexicalcats.php for clarity
 * 
 * Read-only reference data API for parts-of-speech categories.
 * Returns standardized lexical category data with multilingual support.
 */

require_once 'login.php';

function getPos()
{
    $db = DB::vnb();
    $stmt = $db->query("SELECT pos, name FROM vnb_pos ORDER BY pos");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Format output: parse JSON name field for client-side compatibility
    foreach ($rows as &$row) {
        $row['name'] = json_decode($row['name'], true); // Convert JSON string to array
    }

    return $rows;
}

// Check login
header('Content-Type: application/json; charset=utf-8');
$logsess = vnb_checklogin($_GET["_sessid"] ?? null);
if ($logsess->success !== true) {
    die(json_encode($logsess));
}

$response = ['success' => false];

try {
    $rows = getPos();
    if ($rows !== false) {
        $response = [
            'success' => true,
            'pos' => $rows
        ];
    } else {
        $response['message'] = 'Error fetching POS data';
    }
} catch (Exception $e) {
    $response['message'] = $e->getMessage();
}

echo json_encode($response);
