<?php
$word = $_GET['q'] ?? '';
$db = new PDO('sqlite:' . __DIR__ . '/medce.db');

// 统一处理输出转义
function h($str) {
    return htmlspecialchars($str, ENT_QUOTES, 'UTF-8');
}

function resolve($db, $content, $column) {
    $depth = 0;
    while (strpos($content, '@@@LINK=') === 0 && $depth < 3) {
        $target = trim(substr($content, 8));
        $stmt = $db->prepare("SELECT $column FROM entries WHERE word = :w COLLATE NOCASE");
        $stmt->execute([':w' => $target]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($row && !empty($row[$column])) {
            $content = $row[$column];
        } else {
            // 安全地生成跳转链接
            // 使用 json_encode 确保 JS 参数绝对安全
            $js_param = json_encode($target, JSON_UNESCAPED_UNICODE);
            return "请参考: <a href='javascript:search($js_param)'>" . h($target) . "</a>";
        }
        $depth++;
    }
    return $content;
}

$stmt = $db->prepare("SELECT html_zh, html_en FROM entries WHERE word = :w COLLATE NOCASE LIMIT 1");
$stmt->execute([':w' => $word]);
$res = $stmt->fetch(PDO::FETCH_ASSOC);

if ($res) {
    echo '<div class="card">';
    
    // 处理中文
    if (!empty($res['html_zh'])) {
        $zh = resolve($db, $res['html_zh'], 'html_zh');
        echo "<div class='section'><span class='tag'>英汉医学大词典</span>$zh</div>";
    }

    if (!empty($res['html_zh']) && !empty($res['html_en'])) {
        echo '<div class="divider"></div>';
    }

    // 处理英文
    if (!empty($res['html_en'])) {
        $en = resolve($db, $res['html_en'], 'html_en');
        echo "<div class='section'><span class='tag'>Dorland's Medical Dictionary</span>$en</div>";
    }
    
    echo '</div>';
} else {
    echo "<div class='card' style='padding:20px; text-align: center;'>未找到: " . h($word) . "</div>";
}
