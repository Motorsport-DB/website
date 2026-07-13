<?php
// This is a JSON API: never let PHP warnings/notices leak HTML into the
// response body, or the frontend's response.json() throws an uncaught
// SyntaxError instead of the intended error message.
ini_set('display_errors', '0');
error_reporting(E_ALL);
header('Content-Type: application/json');

$root_dir = __DIR__ . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR;

require_once 'clear_sessions.php';

$session_id = $_GET["session"] ?? null;
$player = $_GET["player"] ?? null;

if (!$session_id || !in_array($player, [1, 2])) {
    echo json_encode(["success" => false, "error" => "Missing parameters"]);
    exit;
}

$session_file = $root_dir . "games" . DIRECTORY_SEPARATOR . "guess-who" . DIRECTORY_SEPARATOR . "$session_id.json";
if (!file_exists($session_file)) {
    echo json_encode(["success" => false, "error" => "Session not found"]);
    exit;
}

$data = json_decode(file_get_contents($session_file), true);
if (time() - $data["created_at"] > 300) {
    unlink($session_file);
    echo json_encode(["success" => false, "error" => "Session expired"]);
    exit;
}

$data["player{$player}_ready"] = true;

$response = [
    "success" => true,
    "pilots" => $data["pilots"],
    "secret_pilot" => $data["secrets"][(string)$player]
];

// If both players have joined, delete the file
if ($data["player1_ready"] && $data["player2_ready"]) {
    unlink($session_file);
} else {
    file_put_contents($session_file, json_encode($data));
}

echo json_encode($response);

