<?php

/**
 * Simplified audio.php - Optimized implementation based on explicit assumptions
 */

require_once __DIR__ . '/utils.php';

function getAudio($word, $cached = false)
{
    // Normalize word: trim whitespace to ensure cache filename matches audioq.php (API)
    $word = trim($word);

    // --- 1. Cache Directory Configuration ---
    if (!ensure_writable_directory(ABS_PATH_AUDIO)) {
        return ['success' => false, 'word' => $word, 'message' => 'Cache directory not writable'];
    }

    // --- 2. Generate Cache Filename ---
    $cache_filename_base = generateAudioCacheFilenameBase($word);

    // --- 3. Cache Hit Check ---
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

    // --- 3.1 Cache-Only Mode Check ---
    if ($cached) {
        // In cache-only mode, also check TTS cache
        return getOrGenerateTTSAudio($word, $cache_filename_base, true);
    }

    // --- 4. Dictionary Lookup ---
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

    // --- 5. Process Dictionary Result ---
    if ($source_result['success']) {
        $full_dict_url = $source_result['url'];

        // Attempt to resolve local file path for caching
        // Logic: Find /dict/ path segment, extract the part after it as relative path
        $source_filepath = '';
        $url_path = parse_url($full_dict_url, PHP_URL_PATH);
        $dict_path_segment = '/' . DIR0_NAME_DICT . '/';
        $pos = strpos($url_path, $dict_path_segment);

        if ($pos !== false) {
            $rel_path = substr($url_path, $pos + strlen($dict_path_segment));
            $source_filepath = get_sibling_abspath(DIR0_NAME_DICT, $rel_path);
        }

        $extension = pathinfo($url_path, PATHINFO_EXTENSION);

        // Attempt to cache
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

        // Cache failed, return the original URL provided by the dictionary directly
        return [
            'success' => true,
            'word' => $word,
            'url' => $url_path,
            'cached' => false
        ];
    }

    // --- 6. TTS Fallback ---
    return getOrGenerateTTSAudio($word, $cache_filename_base);
}

/**
 * Deletes all cached audio files for a given word.
 * This includes files in the main audio directory and the TTS subdirectory,
 * matching the base filename pattern regardless of extension.
 *
 * @param string $word The word to delete audio for.
 * @return void
 */
function deleteAudio($word)
{
    $word = trim($word);
    if (empty($word)) return;

    $cache_filename_base = generateAudioCacheFilenameBase($word);

    // 1. Delete from main audio directory
    $main_pattern = ABS_PATH_AUDIO . DIRECTORY_SEPARATOR . $cache_filename_base . '.*';
    array_map('unlink', glob($main_pattern));

    // 2. Delete from TTS subdirectory
    $tts_pattern = ABS_PATH_AUDIO . DIRECTORY_SEPARATOR . DIR2_NAME_TTS . DIRECTORY_SEPARATOR . $cache_filename_base . '.*';
    array_map('unlink', glob($tts_pattern));
}

/**
 * Gets a TTS audio URL, generating and caching the audio file if it doesn't exist.
 * This function encapsulates all logic related to TTS audio generation.
 * Moved from audiotts.php
 *
 * @param string $word The word or phrase to convert to speech.
 * @param string $cache_filename_base The pre-computed, unique base for the cache file.
 * @return array An associative array with a consistent JSON structure.
 */
function getOrGenerateTTSAudio($word, $cache_filename_base, $cached_only = false)
{
    // 1. Cache configuration
    $tts_cache_dir = ABS_PATH_AUDIO . DIRECTORY_SEPARATOR . DIR2_NAME_TTS;
    $tts_cache_url = REL_URL_AUDIO . '/' . DIR2_NAME_TTS;

    $cache_dir_absolute = $tts_cache_dir;
    if (!ensure_writable_directory($cache_dir_absolute)) {
        return [
            'success' => false,
            'word' => $word,
            'message' => 'TTS cache directory not writable'
        ];
    }

    $cache_filename = $cache_filename_base . '.mp3';
    $cache_filepath = $cache_dir_absolute . DIRECTORY_SEPARATOR . $cache_filename;
    $cache_url = $tts_cache_url . '/' . $cache_filename;

    // 2. Check cache (Cache Hit) - Consistent Response
    if (file_exists($cache_filepath)) {
        return ['success' => true, 'word' => $word, 'url' => $cache_url, 'cached' => true];
    }

    // 3. If in cache-only mode and not found, return failure
    if ($cached_only) {
        return ['success' => false, 'word' => $word, 'message' => 'Not cached'];
    }

    // 3. Cache Miss: Call TTS Service
    // Note: TTS service URL remains unchanged as it points to local service
    $tts_service_url = "http://localhost:3343/tts?text=" . urlencode($word);

    $context = stream_context_create([
        'http' => [
            'timeout' => 15, // 15 seconds timeout
            'ignore_errors' => true // Get content even on non-200 status codes
        ]
    ]);

    $audio_data = @file_get_contents($tts_service_url, false, $context);

    // Manually check the HTTP status code from the special $http_response_header variable
    $http_code = 0;
    if (isset($http_response_header[0])) {
        preg_match('{HTTP/1\.\d (\d{3})}', $http_response_header[0], $matches);
        $http_code = (int)$matches[1];
    }

    // 4. Process response and create cache - Consistent Response
    if ($http_code === 200 && $audio_data) {
        if ($cache_dir_absolute && is_writable($cache_dir_absolute)) {
            file_put_contents($cache_filepath, $audio_data);
            return ['success' => true, 'word' => $word, 'url' => $cache_url, 'cached' => false];
        }
    }

    // 5. Failure - Consistent Response
    return [
        'success' => false,
        'word' => $word,
        'message' => 'Failed to find or generate the audio file.',
        'tts_http_code' => $http_code // Keep for debugging
    ];
}
