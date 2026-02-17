<?php

/**
 * Audio Query & Test Interface
 * 
 * - If 'q' parameter exists: Acts as the JSON API for audio retrieval (getAudio).
 * - If 'q' parameter missing: Displays the HTML test page for TTS/Audio debugging.
 */

require_once 'audio.php';
require_once 'login.php';

// === API Mode (JSON) ===
if (isset($_GET['q'])) {
    header('Content-Type: application/json; charset=utf-8');

    // Security Check
    $logsess = vnb_checklogin();
    if ($logsess->success !== true) {
        echo json_encode(['success' => false, 'message' => 'Unauthorized']);
        exit;
    }

    $word = trim($_GET['q']);
    if (empty($word)) {
        echo json_encode(['success' => false, 'message' => 'Query parameter "q" is missing.']);
        exit;
    }

    $result = getAudio($word);
    echo json_encode($result, JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    exit;
}

// === UI Mode (HTML Test Page) ===

// Check login for UI access
$logsess = vnb_checklogin();

header('Content-Type: text/html; charset=utf-8');

// If NOT logged in, display a simple login prompt.
if ($logsess->success !== true) {
?>
    <!DOCTYPE html>
    <html lang="en">

    <head>
        <meta charset="UTF-8">
        <title>Login Required</title>
        <link rel="icon" href="data:,">
        <style>
            body {
                font-family: sans-serif;
                max-width: 600px;
                margin: 4em auto;
                padding: 0 1em;
                text-align: center;
            }

            a {
                color: #007bff;
                text-decoration: none;
            }

            a:hover {
                text-decoration: underline;
            }
        </style>
    </head>

    <body>
        <h2>Login Required</h2>
        <p>This testing page requires authentication to use.</p>
        <p><a href="<?php echo REL_URL_APP_BASE ?: '/'; ?>">Click here to go to the main application to log in.</a></p>
    </body>

    </html>
<?php
    exit();
}

// If logged in, display the test form.
// Note: Submitting this form will reload the page with ?q=..., triggering the JSON API mode above.
$word_to_search = '';
?>
<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Audio Generation Test</title>
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

        .hint {
            margin-top: 2em;
            padding: 1em;
            background-color: #f8f9fa;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 0.9em;
            color: #666;
        }
    </style>
</head>

<body>
    <h1>Audio Generation Test</h1>
    <form method="GET" action="">
        <label for="q">Enter text:</label><br>
        <input type="text" id="q" name="q" value="<?php echo htmlspecialchars($word_to_search); ?>" required>
        <input type="submit" value="Get Audio JSON">
    </form>

    <div class="hint">Note: Submitting this form will return the raw JSON response from the API.</div>
</body>

</html>