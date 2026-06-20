<?php
ini_set('display_errors', '0');
error_reporting(0);
header('Content-Type: application/json');
require_once __DIR__ . '/helpers.php';

$q = trim($_GET['q'] ?? '');
if (strlen($q) < 2) {
    echo json_encode([]);
    exit;
}

$cacheFile = __DIR__ . '/../../../../driverdle-all-list.json';
$allIds = [];

if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < 86400) {
    $allIds = json_decode(file_get_contents($cacheFile), true) ?: [];
} else {
    foreach (glob(DRIVERS_DIR . '*.json') as $file) {
        $allIds[] = pathinfo($file, PATHINFO_FILENAME);
    }
    file_put_contents($cacheFile, json_encode($allIds));
}

$q = strtolower(iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', str_replace('-', ' ', $q)));
$results = [];

foreach ($allIds as $id) {
    $name       = str_replace('_', ' ', $id);
    $normalized = strtolower(iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', str_replace('-', ' ', $name)));
    if (strpos($normalized, $q) !== false) {
        $results[] = ['id' => $id, 'name' => $name];
        if (count($results) >= 20) break;
    }
}

usort($results, fn($a, $b) => strcmp($a['name'], $b['name']));
echo json_encode(array_values($results));
