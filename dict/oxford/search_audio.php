<?php
header('Content-Type: application/json');
// header('Access-Control-Allow-Origin: *');

// --- Configuration ---
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
$host = $_SERVER['HTTP_HOST'];
$script_path = dirname($_SERVER['SCRIPT_NAME']);
$base_audio_url = rtrim($protocol . $host . $script_path, '/') . '/audio/';

$word = $_GET['q'] ?? $_GET['word'] ?? '';
if (empty($word)) {
    echo json_encode(['success' => false, 'error' => 'Query parameter is missing.']);
    exit;
}

// 处理锚点 (Handle anchors)
if (strpos($word, '#') !== false) {
    $word = explode('#', $word)[0];
}
$word = trim($word);

$dbFile = __DIR__ . '/oxford.db';
if (!file_exists($dbFile)) {
    echo json_encode(['success' => false, 'error' => 'Database not found']);
    exit;
}

try {
    $pdo = new PDO('sqlite:' . $dbFile);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $stmt = $pdo->prepare('SELECT content FROM dictionary WHERE word = :word');
    $stmt->execute([':word' => $word]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($result) {
        $html = $result['content'];
        
        // 处理重定向 (Handle redirects @@@LINK=)
        // MDX 格式使用 @@@LINK= 表示该词条是另一个词条的别名
        if (strpos($html, '@@@LINK=') === 0) {
            $target = trim(substr($html, 8));
            $stmt->execute([':word' => $target]);
            $result2 = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($result2) {
                $html = $result2['content'];
                $word = $target;
            }
        }
    }


    $sound_file = null;

    if ($result) {

        // --- Sound File Extraction Logic ---
        // Priority 1: Find American English pronunciation (pron-us)
        if (preg_match('/class="[^"]*?\bpron-us\b[^"]*?".*?href="([^"]+)"/i', $html, $matches)) {
            $sound_file = $matches[1];
        }
        // Priority 2: If no US sound, find British English (pron-br or pron-uk)
        elseif (preg_match('/class="[^"]*?\bpron-(br|uk)\b[^"]*?".*?href="([^"]+)"/i', $html, $matches)) {
            $sound_file = $matches[2];
        }
        // Priority 3: If still no sound, find the first available audio link (.mp3 or .wav)
        elseif (preg_match('/href="[^>]*?([^"\\/>]+?\.(mp3|wav))"/i', $html, $matches)) {
            $sound_file = $matches[1];
        }
    }

    // --- JSON Response ---
    if ($sound_file) {
        // Handle sound:// protocol and clean up path
        if (strpos($sound_file, 'sound://') === 0) {
            $sound_file = substr($sound_file, 8);
        }
        $sound_file = str_replace('\\', '/', $sound_file);
        $sound_file = ltrim($sound_file, '/');

        // Decode URL-encoded characters (like %23 for #) and get the basename
        $decoded_file = basename(urldecode($sound_file));
        $relative_audio_path = 'audio/' . $decoded_file;
        $absolute_audio_path = __DIR__ . '/' . $relative_audio_path;

        if (!file_exists($absolute_audio_path)) {
            echo json_encode(['success' => false, 'word' => $word, 'error' => 'audio file not exist']);
            exit;
        }

        $encoded_file = rawurlencode($decoded_file);
        $full_url = $base_audio_url . $encoded_file;
        echo json_encode(['success' => true, 'word' => $word, 'url' => $full_url]);
    } else {
        echo json_encode(['success' => false, 'word' => $word]);
    }

} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>