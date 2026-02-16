<?php

// Define the base path for the TTS cache directory.
define('TTS_CACHE_BASE_PATH', 'audio/tts');
// Define paths derived from the base path.
define('TTS_CACHE_DIR_RELATIVE', '../' . TTS_CACHE_BASE_PATH); // For filesystem operations
define('TTS_CACHE_URL_PREFIX', TTS_CACHE_BASE_PATH . '/');   // For client-facing URLs

/**
 * Gets a TTS audio URL, generating and caching the audio file if it doesn't exist.
 * This function encapsulates all logic related to TTS audio generation.
 *
 * @param string $word The word or phrase to convert to speech.
 * @param string $cache_filename_base The pre-computed, unique base for the cache file.
 * @return array An associative array with a consistent JSON structure.
 */
function getOrGenerateTTSAudio($word, $cache_filename_base)
{
    // 1. Cache configuration
    $cache_dir_relative = TTS_CACHE_DIR_RELATIVE; // Use the defined constant
    $cache_dir_absolute = realpath(__DIR__ . '/' . $cache_dir_relative);
    if (!$cache_dir_absolute) {
        @mkdir(__DIR__ . '/' . $cache_dir_relative, 0755, true);
        $cache_dir_absolute = realpath(__DIR__ . '/' . $cache_dir_relative);
    }

    $cache_filename = $cache_filename_base . '.mp3';
    $cache_filepath = $cache_dir_absolute . '/' . $cache_filename;
    $cache_url = TTS_CACHE_URL_PREFIX . $cache_filename; // Use the correct URL prefix

    // 2. Check cache (Cache Hit) - Consistent Response
    if (file_exists($cache_filepath)) {
        return ['success' => true, 'word' => $word, 'url' => $cache_url, 'cached' => true];
    }

    // 3. Cache Miss: Call TTS Service
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


/**
 * When this file is accessed directly, provide a simple UI for testing.
 */
if (basename(__FILE__) == basename($_SERVER['SCRIPT_FILENAME'])) {
    require_once 'utils.php'; // Include the utils file
    header('Content-Type: text/html; charset=utf-8');

    $result = null;
    $word_to_search = '';

    if (isset($_GET['q'])) {
        $word_to_search = trim($_GET['q']);
        if (!empty($word_to_search)) {
            // For direct testing, use the shared function to generate the filename.
            $filename_base = generateAudioCacheFilenameBase($word_to_search);
            $result = getOrGenerateTTSAudio($word_to_search, $filename_base);
        }
    }
?>
    <!DOCTYPE html>
    <html lang="en">

    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TTS Generation Test</title>
        <link rel="icon" href="data:,">
        <style>
            body {
                font-family: sans-serif;
                max-width: 600px;
                margin: 2em auto;
                padding: 0 1em;
            }

            input[type="text"] {
                width: 300px;
                padding: 5px;
            }

            input[type="submit"] {
                padding: 5px 10px;
            }

            .result {
                margin-top: 2em;
                padding: 1em;
                border: 1px solid #ccc;
                border-radius: 5px;
            }

            .error {
                color: red;
            }
        </style>
    </head>

    <body>
        <h1>TTS Generation Test</h1>
        <form method="GET" action="">
            <label for="q">Enter text:</label><br>
            <input type="text" id="q" name="q" value="<?php echo htmlspecialchars($word_to_search); ?>" required>
            <input type="submit" value="Generate Audio">
        </form>

        <?php if ($result): ?>
            <div class="result">
                <?php if ($result['success']): ?>
                    <h3>Success!</h3>
                    <p><strong>Word:</strong> <?php echo htmlspecialchars($result['word']); ?></p>
                    <p><strong>URL:</strong> <?php echo htmlspecialchars($result['url']); ?></p>
                    <p><strong>Cached:</strong> <?php echo $result['cached'] ? 'Yes (from cache)' : 'No (newly generated)'; ?></p>
                    <audio controls autoplay>
                        <source src="<?php echo htmlspecialchars($result['url']); ?>" type="audio/mpeg">
                        Your browser does not support the audio element.
                    </audio>
                <?php else: ?>
                    <h3 class="error">Error</h3>
                    <p><strong>Word:</strong> <?php echo htmlspecialchars($result['word']); ?></p>
                    <p><strong>Message:</strong> <?php echo htmlspecialchars($result['message']); ?></p>
                <?php endif; ?>
            </div>
        <?php endif; ?>
    </body>

    </html>
<?php
}
?>