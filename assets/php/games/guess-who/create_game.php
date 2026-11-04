<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';

use MotorsportDB\API\Data\Database;

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    gwOut(['success' => false, 'error' => 'Method not allowed'], 405);
}
gwClearExpired();

$input = json_decode((string) file_get_contents('php://input', false, null, 0, 8192), true);
$championships = is_array($input['championships'] ?? null) ? $input['championships'] : [];
if (count($championships) < 1 || count($championships) > 50) {
    gwOut(['success' => false, 'error' => 'At least 1 championship required']);
}

$pilots = [];
foreach ($championships as $c) {
    $champ = is_array($c) ? ($c[0] ?? null) : null;
    $year  = is_array($c) ? (string) ($c[1] ?? '') : '';
    if (!is_string($champ) || !preg_match('/^[A-Za-z0-9_-]{1,100}$/', $champ) || !preg_match('/^\d{4}$/', $year)) {
        gwOut(['success' => false, 'error' => 'Invalid championship'], 400);
    }
    $ids = Database::column(
        'SELECT DISTINCT ed.driver_id FROM events ev
         JOIN sessions s ON s.event_id = ev.id
         JOIN entries en ON en.session_id = s.id
         JOIN entry_drivers ed ON ed.entry_id = en.id
         WHERE ev.championship = ? AND ev.year = ?',
        [$champ, $year]
    );
    if (!$ids) {
        gwOut(['success' => false, 'error' => "No data for $champ $year"], 404);
    }
    $pilots = array_merge($pilots, $ids);
}
$pilots = array_values(array_unique($pilots));
shuffle($pilots);
$pilots = array_slice($pilots, 0, 20);
if (count($pilots) < 2) {
    gwOut(['success' => false, 'error' => 'Not enough drivers to create a game']);
}

$dir = gwSessionDir();
if (count(glob($dir . '/*.json') ?: []) >= GUESS_WHO_MAX_SESSIONS) {
    gwOut(['success' => false, 'error' => 'Too many games in progress, try again in a few minutes'], 503);
}

$pictures = [];
$in = implode(',', array_fill(0, count($pilots), '?'));
foreach (Database::all("SELECT id, picture FROM drivers WHERE id IN ($in)", $pilots) as $r) {
    $pictures[$r['id']] = $r['picture'];
}
$cards = [];
foreach ($pilots as $id) {
    $cards[$id] = ['id' => $id, 'picture' => '/' . ($pictures[$id] ?? 'drivers/picture/default.png')];
}

[$k1, $k2] = array_rand($pilots, 2);
$sessionId = bin2hex(random_bytes(8));
$data = [
    'created_at'    => time(),
    'player1_ready' => false,
    'player2_ready' => false,
    'pilots'        => $cards,
    // each player must guess the driver picked for the other one
    'secrets'       => ['1' => $pilots[$k2], '2' => $pilots[$k1]],
];
if (file_put_contents($dir . '/' . $sessionId . '.json', json_encode($data), LOCK_EX) === false) {
    gwOut(['success' => false, 'error' => 'Unable to save the game'], 500);
}
gwOut(['success' => true, 'session_id' => $sessionId]);
