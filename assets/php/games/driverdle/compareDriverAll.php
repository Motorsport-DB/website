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

$today  = date('Y-m-d');
$cache  = readDriverdleCache();
$target = null;

// Use shared cache (same as getDriverOfTodayAll.php)
if (($cache['all']['date'] ?? '') === $today) {
    $target = $cache['all'];
}

// Bootstrap if needed — mirrors getDriverOfTodayAll.php logic exactly
if ($target === null) {
    if (($cache['allList']['date'] ?? '') === $today && !empty($cache['allList']['drivers'])) {
        $all = $cache['allList']['drivers'];
    } else {
        $all = [];
        foreach (glob(DRIVERS_DIR . '*.json') as $f) {
            $data = json_decode(file_get_contents($f), true);
            if ($data && hasAtLeastNRaces($data, 150)) {
                $all[] = pathinfo($f, PATHINFO_FILENAME);
            }
        }
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
    writeDriverdleSections([
        'all'     => $target,
        'allList' => ['date' => $today, 'drivers' => $all],
    ]);
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
