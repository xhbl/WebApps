<?php
require_once __DIR__ . '/audiotts.php';

// --- Constants for Cache Paths ---
define('AUDIO_CACHE_DIR_NAME', 'audio');
define('AUDIO_CACHE_DIR_RELATIVE', '../' . AUDIO_CACHE_DIR_NAME); // For filesystem operations
define('AUDIO_CACHE_URL_PREFIX', AUDIO_CACHE_DIR_NAME . '/');   // For client-facing URLs

/**
 * Gets the pronunciation information for a word, with TTS fallback and file caching.
 *
 * @param string $word The word to query.
 * @return array An associative array with a consistent JSON structure.
 */
function getAudio($word)
{
    // --- 1. Main Audio Cache Configuration ---
    $main_cache_dir_relative = AUDIO_CACHE_DIR_RELATIVE;
    $main_cache_dir_absolute = realpath(__DIR__ . '/' . $main_cache_dir_relative);
    if (!$main_cache_dir_absolute) {
        @mkdir(__DIR__ . '/' . $main_cache_dir_relative, 0755, true);
        $main_cache_dir_absolute = realpath(__DIR__ . '/' . $main_cache_dir_relative);
    }

    require_once 'utils.php';

    // --- 2. Generate a unique cache filename (once) ---
    $cache_filename_base = generateAudioCacheFilenameBase($word);

    // --- 3. Check Main Cache (Cache Hit) - Consistent Response ---
    if ($main_cache_dir_absolute && is_dir($main_cache_dir_absolute)) {
        $cache_pattern = $main_cache_dir_absolute . '/' . $cache_filename_base . '.*';
        $existing_files = glob($cache_pattern);
        if (!empty($existing_files)) {
            $cache_filename = basename($existing_files[0]);
            $cache_url = AUDIO_CACHE_URL_PREFIX . $cache_filename;
            // Build a clean, consistent response array
            return ['success' => true, 'word' => $word, 'url' => $cache_url, 'cached' => true];
        }
    }

    // --- 4. Cache Miss, execute original dictionary search logic ---
    $doc_root = str_replace('\\', '/', rtrim($_SERVER['DOCUMENT_ROOT'], '/\\'));
    $web_script_path = '/dict/oxford/search_audio.php';
    $abs_script_path = $doc_root . $web_script_path;

    $source_result = ['success' => false];

    if (file_exists($abs_script_path)) {
        $original_get = $_GET;
        $_GET['q'] = $word;
        ob_start();
        include $abs_script_path;
        $output = ob_get_clean();
        $_GET = $original_get;
        $decoded_output = json_decode($output, true);
        if ($decoded_output && !empty($decoded_output['success'])) {
            $source_result = $decoded_output;
        }
    }

    // --- 5. If dictionary search is successful, create cache and return - Consistent Response ---
    if ($source_result['success']) {
        $audio_filename = basename($source_result['url']);
        $search_script_dir = dirname($web_script_path);
        $source_url = $search_script_dir . '/audio/' . $audio_filename;
        $source_filepath = $doc_root . $source_url;
        $extension = pathinfo($source_url, PATHINFO_EXTENSION);

        if ($main_cache_dir_absolute && is_writable($main_cache_dir_absolute) && is_readable($source_filepath) && $extension) {
            $cache_filename = $cache_filename_base . '.' . $extension;
            $cache_filepath = $main_cache_dir_absolute . '/' . $cache_filename;

            if (@copy($source_filepath, $cache_filepath)) {
                $cache_url = AUDIO_CACHE_URL_PREFIX . $cache_filename;
                // Build a clean, consistent response array for a newly cached file
                return ['success' => true, 'word' => $word, 'url' => $cache_url, 'cached' => false];
            }
        }
        // Fallback to original URL if caching fails, but still provide a consistent response
        return ['success' => true, 'word' => $word, 'url' => $source_url, 'cached' => false];
    }

    // --- 6. Fallback to TTS Generation ---
    return getOrGenerateTTSAudio($word, $cache_filename_base);
}


/**
 * When this file is accessed directly as an API, execute the following logic.
 */
if (basename(__FILE__) == basename($_SERVER['SCRIPT_FILENAME'])) {
    header('Content-Type: application/json; charset=utf-8');

    $word_to_search = isset($_GET['q']) ? trim($_GET['q']) : '';

    if (empty($word_to_search)) {
        echo json_encode(['success' => false, 'word' => $word_to_search, 'message' => 'Query parameter "q" is missing.']);
        exit;
    }

    $result = getAudio($word_to_search);

    echo json_encode($result, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
}
