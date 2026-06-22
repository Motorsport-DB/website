<?php
ini_set('display_errors', '0');
error_reporting(0);
header('Content-Type: application/json');
require_once __DIR__ . '/helpers.php';

$today = date('Y-m-d');
$cache = readDriverdleCache();

// Return cached target if still valid for today
if (($cache['f1']['date'] ?? '') === $today) {
    $f1 = $cache['f1'];
    echo json_encode(['id' => $f1['id'], 'name' => $f1['firstname'] . ' ' . $f1['lastname'], 'date' => $today]);
    exit;
}

// Build (or reuse today's) list of F1-eligible drivers
if (($cache['f1List']['date'] ?? '') === $today && !empty($cache['f1List']['drivers'])) {
    $eligible = $cache['f1List']['drivers'];
} else {
    $eligible = [];
    foreach (glob(DRIVERS_DIR . '*.json') as $file) {
        $data = json_decode(file_get_contents($file), true);
        if ($data && isF1Driver($data)) {
            $eligible[] = pathinfo($file, PATHINFO_FILENAME);
        }
    }
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

$stats         = computeF1Stats($data, $id . '.json');
$stats['date'] = $today;

writeDriverdleSections([
    'f1'     => $stats,
    'f1List' => ['date' => $today, 'drivers' => $eligible],
]);

echo json_encode(['id' => $stats['id'], 'name' => $stats['firstname'] . ' ' . $stats['lastname'], 'date' => $today]);
