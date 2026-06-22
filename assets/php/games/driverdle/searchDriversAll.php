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

$today = date('Y-m-d');
$cache = readDriverdleCache();

// Build (or reuse today's) list of drivers with ≥150 races across all categories
if (($cache['allList']['date'] ?? '') === $today && !empty($cache['allList']['drivers'])) {
    $allIds = $cache['allList']['drivers'];
} else {
    $allIds = [];
    foreach (glob(DRIVERS_DIR . '*.json') as $file) {
        $data = json_decode(file_get_contents($file), true);
        if ($data && hasAtLeastNRaces($data, 150)) {
            $allIds[] = pathinfo($file, PATHINFO_FILENAME);
        }
    }
    writeDriverdleSections(['allList' => ['date' => $today, 'drivers' => $allIds]]);
}

$q       = strtolower(iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', str_replace('-', ' ', $q)));
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
