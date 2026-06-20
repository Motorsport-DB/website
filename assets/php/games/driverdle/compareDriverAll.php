<?php
ini_set('display_errors', '0');
error_reporting(0);
header('Content-Type: application/json');
require_once __DIR__ . '/helpers.php';

$input   = json_decode(file_get_contents('php://input'), true);
$guessId = trim($input['guess'] ?? '');

if (!$guessId) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing guess']);
    exit;
}

$cacheFile = __DIR__ . '/../../../../driverdle-all.json';
$today     = date('Y-m-d');
$target    = null;

// Try to load from cache
if (file_exists($cacheFile)) {
    $cached = json_decode(file_get_contents($cacheFile), true);
    if (is_array($cached) && ($cached['date'] ?? '') === $today) {
        $target = $cached;
    }
}

// Bootstrap if needed
if ($target === null) {
    $listCache = __DIR__ . '/../../../../driverdle-all-list.json';
    $all = [];

    if (file_exists($listCache) && (time() - filemtime($listCache)) < 86400) {
        $all = json_decode(file_get_contents($listCache), true) ?: [];
    } else {
        foreach (glob(DRIVERS_DIR . '*.json') as $f) {
            $all[] = pathinfo($f, PATHINFO_FILENAME);
        }
        @file_put_contents($listCache, json_encode($all));
    }

    if (empty($all)) {
        http_response_code(500);
        echo json_encode(['error' => 'No drivers available']);
        exit;
    }

    $tid   = pickDailyDriver($all, 'all');
    $tdata = loadDriverData($tid);
    if (!$tdata) {
        http_response_code(500);
        echo json_encode(['error' => 'Could not load target driver']);
        exit;
    }

    $target         = computeAllStats($tdata, $tid . '.json');
    $target['date'] = $today;
    @file_put_contents($cacheFile, json_encode($target, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
}

// Load and validate guessed driver
$guessData = loadDriverData($guessId);
if (!$guessData) {
    http_response_code(404);
    echo json_encode(['error' => 'Unknown driver']);
    exit;
}

$guessStats = computeAllStats($guessData, $guessId . '.json');
$comparison = compareAllStats($guessStats, $target);
$won        = $guessId === $target['id'];

echo json_encode([
    'won'        => $won,
    'guessStats' => $guessStats,
    'comparison' => $comparison,
    'target'     => $won ? ['id' => $target['id'], 'firstname' => $target['firstname'], 'lastname' => $target['lastname']] : null,
]);
