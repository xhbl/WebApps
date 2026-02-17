<?php
header('Content-Type: application/json');
// header('Access-Control-Allow-Origin: *');

// --- Configuration ---
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
$host = $_SERVER['HTTP_HOST'];
$current_dir = str_replace('\\', '/', realpath(__DIR__) ?: __DIR__);
$document_root = str_replace('\\', '/', realpath($_SERVER['DOCUMENT_ROOT'] ?? '') ?: ($_SERVER['DOCUMENT_ROOT'] ?? ''));

if ($document_root !== '' && strpos($current_dir, rtrim($document_root, '/')) === 0) {
    $script_path = substr($current_dir, strlen(rtrim($document_root, '/')));
} else {
    $script_path = dirname($_SERVER['SCRIPT_NAME'] ?? '');
}

$script_path = '/' . trim(str_replace('\\', '/', $script_path), '/');
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
                
            }
        }
    }


    $sound_file = null;

    if ($result) {
        // --- Sound File Extraction Logic (Top-container scoped) ---
        // 只在词头容器 top-container 内查找，避免误匹配到例句音频。
        $sound_file = null;

        $isAudioHref = function($href) {
            if (!$href) return false;
            if (stripos($href, 'sound://') === 0) return true;
            return preg_match('/\.(mp3|wav)(?:$|[?#])/i', $href) === 1;
        };

        libxml_use_internal_errors(true);
        $doc = new DOMDocument();
        $wrapped = '<!DOCTYPE html><html><body>' . $html . '</body></html>';
        $loaded = $doc->loadHTML('<?xml encoding="utf-8" ?>' . $wrapped);

        if ($loaded !== false) {
            $xpath = new DOMXPath($doc);
            $topNodes = $xpath->query("//*[contains(concat(' ', normalize-space(@class), ' '), ' top-container ')]");

            if ($topNodes && $topNodes->length > 0) {
                $topNode = $topNodes->item(0);

                // Priority 1: pron-us
                $usNodes = $xpath->query(".//a[contains(concat(' ', normalize-space(@class), ' '), ' pron-us ') and @href]", $topNode);
                if ($usNodes && $usNodes->length > 0) {
                    $candidate = $usNodes->item(0)->getAttribute('href');
                    if ($isAudioHref($candidate)) {
                        $sound_file = $candidate;
                    }
                }

                // Priority 2: pron-br / pron-uk
                if (!$sound_file) {
                    $brNodes = $xpath->query(".//a[(contains(concat(' ', normalize-space(@class), ' '), ' pron-br ') or contains(concat(' ', normalize-space(@class), ' '), ' pron-uk ')) and @href]", $topNode);
                    if ($brNodes && $brNodes->length > 0) {
                        $candidate = $brNodes->item(0)->getAttribute('href');
                        if ($isAudioHref($candidate)) {
                            $sound_file = $candidate;
                        }
                    }
                }

                // Priority 3: first audio link in top-container only
                if (!$sound_file) {
                    $allLinks = $xpath->query('.//a[@href]', $topNode);
                    if ($allLinks) {
                        foreach ($allLinks as $link) {
                            $candidate = $link->getAttribute('href');
                            if ($isAudioHref($candidate)) {
                                $sound_file = $candidate;
                                break;
                            }
                        }
                    }
                }
            }
        }
        libxml_clear_errors();
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