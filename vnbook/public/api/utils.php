<?php

/**
 * Optimized Path Configuration - Streamlined solution based on explicit assumptions.
 *
 * CRITICAL ASSUMPTIONS (Deployment Prerequisites):
 * 1. Anchor File Location: This file (utils.php) MUST reside in the 'api' subdirectory
 *    of the application root. It serves as the anchor to determine the application root.
 *    (e.g., .../vnbook/api/utils.php -> App Root is .../vnbook)
 *
 * 2. Peer Directory Structure: The 'dict' directory (and other external resources)
 *    MUST be a sibling (peer) of the application root directory.
 *    If the app is at /var/www/html/vnbook, the dict must be at /var/www/html/dict.
 *    This structure allows the app to be deployed at any subdirectory level (root,
 *    first-level, second-level, etc.) while maintaining relative access to resources.
 */

// ===== Directory Name Constants =====
define('DIR0_NAME_DICT', 'dict');
define('DIR1_NAME_AUDIO', 'audio');
define('DIR2_NAME_TTS', 'tts');

// ===== Core Constant Definitions (Based on Fixed Structure) =====
// Application Root Physical Path: dirname(__DIR__) = parent of ../api
define('ABS_PATH_APP_ROOT', dirname(__DIR__));

// Website Root Relative URL (e.g., /vnbook)
// FIX: Use __DIR__ relative to DOCUMENT_ROOT to ensure correctness even when included from other scripts.
// $_SERVER['SCRIPT_NAME'] changes based on the entry script, which breaks paths during includes.
$_local_dir = str_replace('\\', '/', __DIR__);
$_doc_root = str_replace('\\', '/', $_SERVER['DOCUMENT_ROOT']);
if (substr($_doc_root, -1) === '/') $_doc_root = substr($_doc_root, 0, -1); // Normalize doc root

if (strpos($_local_dir, $_doc_root) === 0) {
    // We are inside the document root, calculate relative path safely
    $_rel_path = substr($_local_dir, strlen($_doc_root)); // e.g. /vnbook/api
    define('REL_URL_APP_BASE', str_replace('\\', '/', rtrim(dirname($_rel_path), '/\\')));
} else {
    // Fallback for complex setups (symlinks/aliases) where physical path != doc root path
    define('REL_URL_APP_BASE', str_replace('\\', '/', rtrim(dirname(dirname($_SERVER['SCRIPT_NAME'])), '/\\')));
}

// Common Application Directories
define('ABS_PATH_AUDIO', ABS_PATH_APP_ROOT . DIRECTORY_SEPARATOR . DIR1_NAME_AUDIO);
define('REL_URL_AUDIO', REL_URL_APP_BASE . '/' . DIR1_NAME_AUDIO);

// ===== General Peer Directory Handling Functions =====
/**
 * Get physical path of a sibling directory
 * @param string $sibling_dir Sibling directory name
 * @param string $relative_path Path relative to that directory
 * @return string Full physical path
 */
function get_sibling_abspath($sibling_dir, $relative_path = '')
{
    // If REL_URL_APP_BASE is empty, we are in an environment (like the dev Docker)
    // where the app root is the web root. In this case, 'dict' is a sibling of 'api'
    // under the app root, not a peer of the app root.
    if (REL_URL_APP_BASE === '') {
        $parent_dir = ABS_PATH_APP_ROOT;
    } else {
        // Production: Jump up one level to find the common parent directory
        $parent_dir = dirname(ABS_PATH_APP_ROOT);
    }
    $full_path = $parent_dir . DIRECTORY_SEPARATOR . $sibling_dir;

    if ($relative_path) {
        $clean_path = ltrim(str_replace(['\\', '/'], DIRECTORY_SEPARATOR, $relative_path), DIRECTORY_SEPARATOR);
        $full_path .= DIRECTORY_SEPARATOR . $clean_path;
    }
    return $full_path;
}

/**
 * Get relative URL path of a sibling directory
 * @param string $sibling_dir Sibling directory name
 * @param string $relative_path Path relative to that directory
 * @return string URL path relative to website root
 */
function get_sibling_url($sibling_dir, $relative_path = '')
{
    // Dynamically calculate parent URL to support arbitrary deployment levels (e.g., /apps/vnbook -> /apps)
    $app_base = REL_URL_APP_BASE;
    $parent_url = dirname($app_base);

    // Normalize path separators and handle root directory case
    $parent_url = str_replace('\\', '/', $parent_url);
    if ($parent_url === '/' || $parent_url === '.') {
        $parent_url = '';
    }

    $url = $parent_url . '/' . $sibling_dir;

    if ($relative_path) {
        $clean_path = ltrim(str_replace(['\\', '/'], '/', $relative_path), '/');
        $url .= '/' . $clean_path;
    }
    return $url;
}

// ===== Utility Functions =====
/**
 * Ensure directory exists and is writable
 */
function ensure_writable_directory($dir_path)
{
    if (!is_dir($dir_path)) {
        return @mkdir($dir_path, 0755, true) && is_writable($dir_path);
    }
    return is_writable($dir_path);
}

/**
 * Generates a unique and filesystem-safe cache filename base for a given word.
 */
function generateAudioCacheFilenameBase($word)
{
    $word_part = substr(preg_replace('#[\\\\/:*?"<>|]#u', '', str_replace(' ', '_', $word)), 0, 8);
    $md5_part = substr(md5($word), 0, 10);
    return $word_part . '_' . $md5_part;
}
