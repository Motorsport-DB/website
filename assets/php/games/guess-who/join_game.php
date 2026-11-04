<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';

$file = gwSessionFile($_GET['session'] ?? null);
$player = (string) ($_GET['player'] ?? '');
if ($file === null || !in_array($player, ['1', '2'], true)) {
    gwOut(['success' => false, 'error' => 'Missing parameters'], 400);
}

$fh = @fopen($file, 'r+');
if ($fh === false) {
    gwOut(['success' => false, 'error' => 'Session not found'], 404);
}
flock($fh, LOCK_EX);
$data = json_decode((string) stream_get_contents($fh), true);

if (!is_array($data) || time() - (int) ($data['created_at'] ?? 0) > GUESS_WHO_TTL) {
    flock($fh, LOCK_UN);
    fclose($fh);
    @unlink($file);
    gwOut(['success' => false, 'error' => 'Session expired'], 410);
}
$data["player{$player}_ready"] = true;
$response = [
    'success'      => true,
    'pilots'       => $data['pilots'],
    'secret_pilot' => $data['secrets'][$player],
];

if ($data['player1_ready'] && $data['player2_ready']) {
    flock($fh, LOCK_UN);
    fclose($fh);
    @unlink($file);
} else {
    ftruncate($fh, 0);
    rewind($fh);
    fwrite($fh, json_encode($data));
    flock($fh, LOCK_UN);
    fclose($fh);
}
gwOut($response);
