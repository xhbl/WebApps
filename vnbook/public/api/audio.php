<?php
// --- 1. 环境准备 (核心：利用 DOCUMENT_ROOT 实现全域定位) ---
// 无论 a.php 在哪个文件夹，DOCUMENT_ROOT 永远指向网站根目录的物理路径
$doc_root = str_replace('\\', '/', rtrim($_SERVER['DOCUMENT_ROOT'], '/\\'));

// 你定义的“从网站根目录开始”的逻辑路径
$web_script_path = '/dict/oxford/search_audio.php';

// 拼接出该脚本在服务器上的【绝对物理路径】
$abs_script_path = $doc_root . $web_script_path;

if (!file_exists($abs_script_path)) {
    header('Content-Type: application/json');
    die(json_encode(['success' => false, 'error' => '找不到目标脚本: ' . $abs_script_path]));
}

// 动态计算目标脚本所在的 Web 目录 (结果永远是 /dict/oxford/)
$abs_dir = str_replace('\\', '/', dirname($abs_script_path));
$right_segment = '/' . ltrim(str_replace($doc_root, '', $abs_dir), '/') . '/';
$right_segment = str_replace('//', '/', $right_segment);

// --- 2. 捕获输出 ---
ob_start();
// 💡 重点：直接 include 绝对物理路径，不受 a.php 位置影响
include $abs_script_path;
$output = ob_get_clean();
$result = json_decode($output, true);

// --- 3. 精准重组 URL ---
if ($result && isset($result['success']) && $result['success'] === true && isset($result['url'])) {
    // 只提取文件名 (例如 apple.mp3)
    $filename = basename($result['url']);

    // 重新拼凑：协议 + 域名 + 之前算出的固定 Web 目录 + 子目录 + 文件名
    $result['url'] = $right_segment . "audio/" . $filename;
}

// --- 4. 输出结果 ---
header('Content-Type: application/json; charset=utf-8');
echo json_encode($result, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
