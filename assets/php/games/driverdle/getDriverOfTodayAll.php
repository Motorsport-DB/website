<?php
ini_set('display_errors', '0');
error_reporting(0);
header('Content-Type: application/json');
require_once __DIR__ . '/helpers.php';

$today = date('Y-m-d');
$cache = readDriverdleCache();

// Return cached target if still valid for today
if (($cache['all']['date'] ?? '') === $today) {
    $all = $cache['all'];
    echo json_encode(['id' => $all['id'], 'name' => $all['firstname'] . ' ' . $all['lastname'], 'date' => $today]);
    exit;
}

// Build (or reuse today's) list of drivers with ≥150 races across all categories
if (($cache['allList']['date'] ?? '') === $today && !empty($cache['allList']['drivers'])) {
    $all = $cache['allList']['drivers'];
} else {
    $all = [];
    foreach (glob(DRIVERS_DIR . '*.json') as $file) {
        $data = json_decode(file_get_contents($file), true);
        if ($data && hasAtLeastNRaces($data, 150)) {
            $all[] = pathinfo($file, PATHINFO_FILENAME);
        }
    }
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

$stats         = computeAllStats($data, $id . '.json');
$stats['date'] = $today;

writeDriverdleSections([
    'all'     => $stats,
    'allList' => ['date' => $today, 'drivers' => $all],
]);

echo json_encode(['id' => $stats['id'], 'name' => $stats['firstname'] . ' ' . $stats['lastname'], 'date' => $today]);
