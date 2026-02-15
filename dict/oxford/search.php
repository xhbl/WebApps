<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$word = $_GET['q'] ?? '';
if (empty($word)) {
    echo json_encode(['found' => false]);
    exit;
}

// 处理锚点 (Handle anchors)
if (strpos($word, '#') !== false) {
    $word = explode('#', $word)[0];
}
$word = trim($word);

$dbFile = __DIR__ . '/oxford.db';
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
        
        // 修正音频路径 (Fix sound:// paths)
        // 将 sound://path/to/file.mp3 转换为 audio/path/to/file.mp3
        // 并处理 Windows 路径分隔符
    $html = preg_replace_callback('/sound:\/\/([^"\']+)/', function($matches) {
        $path = $matches[1];
        $path = str_replace('\\', '/', $path); 
        $path = ltrim($path, '/');
        return 'audio/' . $path;
    }, $html);

    // 修正普通 href 音频链接 (Fix href="file.mp3")
    // 将 href="file.mp3" 转换为 href="audio/file.mp3"
    // 排除已经包含 audio/ 或 http/https 的链接
    $html = preg_replace('/href="(?!(audio\/|http:\/\/|https:\/\/))([^"]+\.(mp3|wav))"/', 'href="audio/$2"', $html);
        
        // 修正内部链接 (Fix entry:// to javascript calls)
        // 将 entry://word 转换为 javascript:search('word')
        $html = preg_replace_callback('/entry:\/\/([^"\']+)/', function($matches) {
            return "javascript:search('" . addslashes($matches[1]) . "')";
        }, $html);

        // 修正图片路径 (Fix image paths)
        // 将根目录图片引用移动到 images/ 子目录
        // 1. 仅替换 src 属性
        // 2. 仅匹配不包含路径分隔符 (/ 或 \) 的文件名
        // 3. 排除 data-src 等其他属性
        // 注意：使用更安全的捕获组方式，避免Lookbehind断言在不同PHP版本中的兼容性问题
        // 正则解释：
        // src="        : 匹配 src=" 字面量
        // (            : 开始捕获组1
        //   [^"\/\\]+ : 匹配不包含 " / \ 的字符 (文件名)
        //   \.png      : 匹配 .png 后缀
        // )            : 结束捕获组1
        // "            : 匹配结束的引号
        $html = preg_replace('/src="([^"\/\\\\]+\.png)"/', 'src="images/$1"', $html);
        
        echo json_encode(['found' => true, 'word' => $word, 'content' => $html]);
    } else {
        echo json_encode(['found' => false, 'word' => $word]);
    }
} catch (Exception $e) {
    echo json_encode(['found' => false, 'error' => $e->getMessage()]);
}
?>