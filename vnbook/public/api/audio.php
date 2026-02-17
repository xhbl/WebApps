<?php

/**
 * 简化版 audio.php - 基于明确前提的优化实现
 */

require_once __DIR__ . '/utils.php';
require_once __DIR__ . '/login.php';
require_once __DIR__ . '/audiotts.php';

function getAudio($word)
{
    // --- 0. 安全检查 ---
    $logsess = vnb_checklogin();
    if ($logsess->success !== true) {
        return ['success' => false, 'word' => $word, 'message' => 'Unauthorized'];
    }

    // --- 1. 缓存目录配置 ---
    if (!ensure_writable_directory(ABS_PATH_AUDIO)) {
        return ['success' => false, 'word' => $word, 'message' => 'Cache directory not writable'];
    }

    // --- 2. 生成缓存文件名 ---
    $cache_filename_base = generateAudioCacheFilenameBase($word);

    // --- 3. 缓存命中检查 ---
    $cache_pattern = ABS_PATH_AUDIO . DIRECTORY_SEPARATOR . $cache_filename_base . '.*';
    $existing_files = glob($cache_pattern);
    if (!empty($existing_files)) {
        $cache_filename = basename($existing_files[0]);
        return [
            'success' => true,
            'word' => $word,
            'url' => REL_URL_AUDIO . '/' . $cache_filename,
            'cached' => true
        ];
    }

    // --- 4. 字典查询 ---
    $dict_search_script = get_sibling_abspath(DIR0_NAME_DICT, 'oxford/search_audio.php');
    $source_result = ['success' => false];

    if (file_exists($dict_search_script)) {
        $original_get = $_GET;
        $_GET['q'] = $word;
        ob_start();
        include $dict_search_script;
        $output = ob_get_clean();
        $_GET = $original_get;

        $decoded_output = json_decode($output, true);
        if ($decoded_output && !empty($decoded_output['success'])) {
            $source_result = $decoded_output;
        }
    }

    // --- 5. 处理字典结果 ---
    if ($source_result['success']) {
        $full_dict_url = $source_result['url'];

        // 尝试解析本地文件路径用于缓存
        // 逻辑：查找 /dict/ 路径段，提取其后的部分作为相对路径
        $source_filepath = '';
        $url_path = parse_url($full_dict_url, PHP_URL_PATH);
        $dict_path_segment = '/' . DIR0_NAME_DICT . '/';
        $pos = strpos($url_path, $dict_path_segment);

        if ($pos !== false) {
            $rel_path = substr($url_path, $pos + strlen($dict_path_segment));
            $source_filepath = get_sibling_abspath(DIR0_NAME_DICT, $rel_path);
        }

        $extension = pathinfo($url_path, PATHINFO_EXTENSION);

        // 尝试缓存
        // is_readable() will implicitly check if the file exists.
        if ($extension && $source_filepath && is_readable($source_filepath)) {
            $cache_filename = $cache_filename_base . '.' . $extension;
            $cache_filepath = ABS_PATH_AUDIO . DIRECTORY_SEPARATOR . $cache_filename;

            if (@copy($source_filepath, $cache_filepath)) {
                return [
                    'success' => true,
                    'word' => $word,
                    'url' => REL_URL_AUDIO . '/' . $cache_filename,
                    'cached' => false
                ];
            }
        }

        // 缓存失败，直接返回字典提供的原始URL
        return [
            'success' => true,
            'word' => $word,
            'url' => $url_path,
            'cached' => false
        ];
    }

    // --- 6. TTS兜底 ---
    return getOrGenerateTTSAudio($word, $cache_filename_base);
}

// API入口
if (basename(__FILE__) == basename($_SERVER['SCRIPT_FILENAME'])) {
    header('Content-Type: application/json; charset=utf-8');

    $word_to_search = isset($_GET['q']) ? trim($_GET['q']) : '';
    if (empty($word_to_search)) {
        echo json_encode(['success' => false, 'message' => 'Query parameter "q" is missing.']);
        exit;
    }

    $result = getAudio($word_to_search);
    echo json_encode($result, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
}
