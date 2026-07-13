<?php
// This is required by JSON API endpoints: never let PHP warnings/notices
// leak HTML into the response body, or the frontend's response.json()
// throws an uncaught SyntaxError instead of the intended error message.
ini_set('display_errors', '0');
error_reporting(E_ALL);

$root_dir_clear = __DIR__ . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . "games" . DIRECTORY_SEPARATOR . "guess-who";

// "games/" is gitignored, so on a fresh checkout/deploy neither it nor
// "games/guess-who/" exist yet. Create both (mkdir recursive) before any
// guess-who endpoint tries to read/write session files.
if (!is_dir($root_dir_clear)) {
    @mkdir($root_dir_clear, 0777, true);
}

$files = glob("$root_dir_clear/*.json");
if ($files === false) {
    $files = [];
}

foreach ($files as $file) {
    $data = json_decode(file_get_contents($file), true);
    if (time() - $data["created_at"] > 300 &&
        (!$data["player1_ready"] || !$data["player2_ready"])) {
        unlink($file);
    }
}
