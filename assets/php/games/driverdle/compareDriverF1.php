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

// Use shared cache (same as getDriverOfTodayF1.php)
if (($cache['f1']['date'] ?? '') === $today) {
    $target = $cache['f1'];
}

// Bootstrap if needed — mirrors getDriverOfTodayF1.php logic exactly
if ($target === null) {
    if (($cache['f1List']['date'] ?? '') === $today && !empty($cache['f1List']['drivers'])) {
        $eligible = $cache['f1List']['drivers'];
    } else {
        $eligible = [];
        foreach (glob(DRIVERS_DIR . '*.json') as $f) {
            $d = json_decode(file_get_contents($f), true);
            if ($d && isF1Driver($d)) {
                $eligible[] = pathinfo($f, PATHINFO_FILENAME);
            }
        }
    }

    if (empty($eligible)) {
        http_response_code(500);
        echo json_encode(['error' => 'No F1 drivers available']);
        exit;
    }

    $tid   = pickDailyDriver($eligible, 'f1');
    $tdata = loadDriverData($tid);
    if (!$tdata) {
        http_response_code(500);
        echo json_encode(['error' => 'Could not load target driver']);
        exit;
    }

    $target         = computeF1Stats($tdata, $tid . '.json');
    $target['date'] = $today;
    writeDriverdleSections([
        'f1'     => $target,
        'f1List' => ['date' => $today, 'drivers' => $eligible],
    ]);
}

// Load and validate guessed driver
$guessData = loadDriverData($guessId);
if (!$guessData) {
    http_response_code(404);
    echo json_encode(['error' => 'Unknown driver']);
    exit;
}

if (!isF1Driver($guessData)) {
    http_response_code(422);
    echo json_encode(['error' => 'This driver has no F1 Race entry']);
    exit;
}

$guessStats = computeF1Stats($guessData, $guessId . '.json');
$comparison = compareF1Stats($guessStats, $target);
$won        = $guessId === $target['id'];

echo json_encode([
    'won'        => $won,
    'guessStats' => $guessStats,
    'comparison' => $comparison,
    'target'     => $won ? ['id' => $target['id'], 'firstname' => $target['firstname'], 'lastname' => $target['lastname']] : null,
]);
