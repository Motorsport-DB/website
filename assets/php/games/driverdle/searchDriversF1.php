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

// Build (or reuse today's) list of F1-eligible drivers
if (($cache['f1List']['date'] ?? '') === $today && !empty($cache['f1List']['drivers'])) {
    $f1Ids = $cache['f1List']['drivers'];
} else {
    $f1Ids = [];
    foreach (glob(DRIVERS_DIR . '*.json') as $file) {
        $data = json_decode(file_get_contents($file), true);
        if ($data && isF1Driver($data)) {
            $f1Ids[] = pathinfo($file, PATHINFO_FILENAME);
        }
    }
    writeDriverdleSections(['f1List' => ['date' => $today, 'drivers' => $f1Ids]]);
}

$q       = strtolower(iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', str_replace('-', ' ', $q)));
$results = [];

foreach ($f1Ids as $id) {
    $name       = str_replace('_', ' ', $id);
    $normalized = strtolower(iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', str_replace('-', ' ', $name)));
    if (strpos($normalized, $q) !== false) {
        $results[] = ['id' => $id, 'name' => $name];
        if (count($results) >= 20) break;
    }
}

usort($results, fn($a, $b) => strcmp($a['name'], $b['name']));
echo json_encode(array_values($results));
