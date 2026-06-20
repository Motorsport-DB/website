<?php
ini_set('display_errors', '0');
error_reporting(0);
header('Content-Type: application/json');
require_once __DIR__ . '/helpers.php';

$cacheFile = __DIR__ . '/../../../../driverdle-all.json';
$today     = date('Y-m-d');

if (file_exists($cacheFile)) {
    $cached = json_decode(file_get_contents($cacheFile), true);
    if (($cached['date'] ?? '') === $today) {
        echo json_encode(['id' => $cached['id'], 'name' => $cached['firstname'] . ' ' . $cached['lastname'], 'date' => $today]);
        exit;
    }
}

$listCache = __DIR__ . '/../../../../driverdle-all-list.json';
$all = [];

if (file_exists($listCache) && (time() - filemtime($listCache)) < 86400) {
    $all = json_decode(file_get_contents($listCache), true) ?: [];
} else {
    foreach (glob(DRIVERS_DIR . '*.json') as $file) {
        $all[] = pathinfo($file, PATHINFO_FILENAME);
    }
    file_put_contents($listCache, json_encode($all));
}

if (empty($all)) {
    http_response_code(500);
    echo json_encode(['error' => 'No drivers found']);
    exit;
}

$id   = pickDailyDriver($all, 'all');
$data = loadDriverData($id);

if (!$data) {
    http_response_code(500);
    echo json_encode(['error' => 'Driver data not found']);
    exit;
}

$stats = computeAllStats($data, $id . '.json');
$stats['date'] = $today;

file_put_contents($cacheFile, json_encode($stats, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

echo json_encode(['id' => $stats['id'], 'name' => $stats['firstname'] . ' ' . $stats['lastname'], 'date' => $today]);
