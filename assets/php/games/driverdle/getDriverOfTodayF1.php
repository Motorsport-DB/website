<?php
ini_set('display_errors', '0');
error_reporting(0);
header('Content-Type: application/json');
require_once __DIR__ . '/helpers.php';

$cacheFile = __DIR__ . '/../../../../driverdle-f1.json';
$today     = date('Y-m-d');

// Return cached target if still valid for today
if (file_exists($cacheFile)) {
    $cached = json_decode(file_get_contents($cacheFile), true);
    if (($cached['date'] ?? '') === $today) {
        echo json_encode(['id' => $cached['id'], 'name' => $cached['firstname'] . ' ' . $cached['lastname'], 'date' => $today]);
        exit;
    }
}

// Build list of F1-eligible drivers (reuse search cache when available)
$listCache = __DIR__ . '/../../../../driverdle-f1-list.json';
$eligible  = [];

if (file_exists($listCache) && (time() - filemtime($listCache)) < 86400) {
    $eligible = json_decode(file_get_contents($listCache), true) ?: [];
} else {
    foreach (glob(DRIVERS_DIR . '*.json') as $file) {
        $data = json_decode(file_get_contents($file), true);
        if ($data && isF1Driver($data)) {
            $eligible[] = pathinfo($file, PATHINFO_FILENAME);
        }
    }
    file_put_contents($listCache, json_encode($eligible));
}

if (empty($eligible)) {
    http_response_code(500);
    echo json_encode(['error' => 'No F1 drivers found']);
    exit;
}

$id   = pickDailyDriver($eligible, 'f1');
$data = loadDriverData($id);

if (!$data) {
    http_response_code(500);
    echo json_encode(['error' => 'Driver data not found']);
    exit;
}

$stats = computeF1Stats($data, $id . '.json');
$stats['date'] = $today;

file_put_contents($cacheFile, json_encode($stats, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

echo json_encode(['id' => $stats['id'], 'name' => $stats['firstname'] . ' ' . $stats['lastname'], 'date' => $today]);
