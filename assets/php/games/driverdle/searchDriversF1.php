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

// Build (or load cached) list of F1-eligible driver IDs
$cacheFile = __DIR__ . '/../../../../driverdle-f1-list.json';
$f1Ids = [];

if (file_exists($cacheFile) && (time() - filemtime($cacheFile)) < 86400) {
    $f1Ids = json_decode(file_get_contents($cacheFile), true) ?: [];
} else {
    foreach (glob(DRIVERS_DIR . '*.json') as $file) {
        $data = json_decode(file_get_contents($file), true);
        if ($data && isF1Driver($data)) {
            $f1Ids[] = pathinfo($file, PATHINFO_FILENAME);
        }
    }
    file_put_contents($cacheFile, json_encode($f1Ids));
}

// Normalize query: transliterate accents and collapse hyphens to spaces
$q = strtolower(iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', str_replace('-', ' ', $q)));
$results = [];

foreach ($f1Ids as $id) {
    $name       = str_replace('_', ' ', $id);                                      // display (keeps hyphens)
    $normalized = strtolower(iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', str_replace('-', ' ', $name))); // search (no hyphens)
    if (strpos($normalized, $q) !== false) {
        $results[] = ['id' => $id, 'name' => $name];
        if (count($results) >= 20) break;
    }
}

usort($results, fn($a, $b) => strcmp($a['name'], $b['name']));
echo json_encode(array_values($results));
