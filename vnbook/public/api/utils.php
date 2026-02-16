<?php

/**
 * Generates a unique and filesystem-safe cache filename base for a given word.
 * The format is: 8 characters from the word + '_' + 10 characters from its MD5 hash.
 *
 * @param string $word The input word or phrase.
 * @return string The generated filename base (without extension).
 */
function generateAudioCacheFilenameBase($word)
{
    // Sanitize the word part: remove illegal characters, replace spaces with underscores.
    $word_part = substr(preg_replace('#[\\\\/:*?"<>|]#u', '', str_replace(' ', '_', $word)), 0, 8);
    
    // Get the MD5 hash part.
    $md5_part = substr(md5($word), 0, 10);
    
    return $word_part . '_' . $md5_part;
}
