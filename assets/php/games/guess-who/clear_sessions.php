<?php
$root_dir_clear = __DIR__ . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . "games" . DIRECTORY_SEPARATOR . "guess-who";
$files = glob("$root_dir_clear/*.json");

foreach ($files as $file) {
    $data = json_decode(file_get_contents($file), true);
    if (time() - $data["created_at"] > 300 &&
        (!$data["player1_ready"] || !$data["player2_ready"])) {
        unlink($file);
    }
}
