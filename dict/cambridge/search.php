<?php
header('Content-Type: application/json');
header('X-CDEPE-Search-Version: 2026-02-17-r2');
// header('Access-Control-Allow-Origin: *');

ini_set('display_errors', '0');
error_reporting(E_ALL);
ob_start();
set_error_handler(function($severity, $message, $file, $line) {
    error_log("[search.php warning] $message in $file:$line");
    return true;
});

function send_json_and_exit($payload) {
    while (ob_get_level() > 0) {
        ob_end_clean();
    }
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    restore_error_handler();
    exit;
}

$word = $_GET['q'] ?? $_GET['word'] ?? '';
if (empty($word)) {
    echo json_encode(['found' => false]);
    exit;
}

// 处理锚点 (Handle anchors)
if (strpos($word, '#') !== false) {
    $word = explode('#', $word)[0];
}
$word = trim($word);

$dbFile = __DIR__ . '/cambridge.db';
if (!file_exists($dbFile)) {
    echo json_encode(['found' => false, 'error' => 'Database not found']);
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


    if ($result) {
        $rawHtml = $html;

        $applyRegex = function($pattern, $replacement, $subject) {
            $tmp = preg_replace($pattern, $replacement, $subject);
            return $tmp === null ? $subject : $tmp;
        };

        $applyCallback = function($pattern, $callback, $subject) {
            $tmp = preg_replace_callback($pattern, $callback, $subject);
            return $tmp === null ? $subject : $tmp;
        };

        $html = $applyCallback('/sound:\/\/([^"\']+)/', function($matches) {
            $path = $matches[1];
            $path = str_replace('\\', '/', $path);
            $path = ltrim($path, '/');
            return 'audio/' . $path;
        }, $html);

        $html = $applyCallback('/href="([^"]+)"/i', function($matches) {
            $href = $matches[1];
            if (preg_match('/^(audio\/|https?:\/\/)/i', $href)) {
                return 'href="' . $href . '"';
            }
            if (preg_match('/\.(mp3|wav)(?:$|[?#])/i', $href)) {
                return 'href="audio/' . ltrim($href, '/') . '"';
            }
            return 'href="' . $href . '"';
        }, $html);

        $html = $applyCallback('/entry:\/\/([^"\']+)/', function($matches) {
            return "javascript:search('" . addslashes($matches[1]) . "')";
        }, $html);

        $html = $applyRegex('/<\/?body[^>]*>/i', '', $html);
        $html = $applyRegex('/<\/?body-content[^>]*>/i', '', $html);
        $html = $applyRegex('/<link[^>]*>/i', '', $html);
        $html = $applyRegex('/<script[^>]*>.*?<\/script>/is', '', $html);

        $html = $applyRegex('/src="([^"\/\\]+\.png)"/i', 'src="images/$1"', $html);
        $html = $applyRegex('/src="([^"\/]+\.(jpg|jpeg|gif|webp|svg))"/i', 'src="images/$1"', $html);

        if ($html === '' && $rawHtml !== '') {
            $html = $rawHtml;
        }

        $payload = [
            'found' => true,
            'word' => $word,
            'content' => $html,
        ];

        send_json_and_exit($payload);
    } else {
        send_json_and_exit(['found' => false, 'word' => $word]);
    }
} catch (Exception $e) {
    send_json_and_exit(['found' => false, 'error' => $e->getMessage()]);
}
?>