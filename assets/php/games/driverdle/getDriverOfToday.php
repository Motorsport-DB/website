<?php
ini_set('display_errors', '0');
error_reporting(0);
header('Content-Type: application/json');
require_once __DIR__ . '/helpers.php';

function hasAtLeast20Races(array $data): bool {
    $count = 0;
    if (!isset($data['seasons']) || !is_array($data['seasons'])) return false;
    foreach ($data['seasons'] as $season) {
        foreach ($season as $competition) {
            foreach ($competition as $race) {
                $count += count($race);
            }
        }
    }
    return $count >= 30;
}

function isActiveOrLastYear(array $data): bool {
    if (!isset($data['seasons']) || !is_array($data['seasons'])) return false;
    $currentYear = (int)date('Y');
    $lastYear    = $currentYear - 1;
    foreach (array_keys($data['seasons']) as $year) {
        if ((int)$year === $currentYear || (int)$year === $lastYear) return true;
    }
    return false;
}

$today = date('Y-m-d');
$cache = readDriverdleCache();

// Return cached driver if still valid for today
if (($cache['classic']['date'] ?? '') === $today) {
    echo json_encode($cache['classic']);
    exit;
}

// Build (or reuse today's) list of eligible drivers
if (($cache['classicList']['date'] ?? '') === $today && !empty($cache['classicList']['drivers'])) {
    $drivers = $cache['classicList']['drivers'];
} else {
    $drivers = [];
    foreach (glob(DRIVERS_DIR . '*.json') as $file) {
        $data = json_decode(file_get_contents($file), true);
        if ($data && hasAtLeast20Races($data) && isActiveOrLastYear($data)) {
            $drivers[] = pathinfo($file, PATHINFO_FILENAME);
        }
    }
    sort($drivers);
}

if (empty($drivers)) {
    http_response_code(404);
    echo json_encode(['error' => 'No drivers found']);
    exit;
}

$index = abs(crc32($today)) % count($drivers);
$id    = $drivers[$index];
[$firstname, $lastname] = explode('_', $id, 2);

$result = [
    'date'      => $today,
    'firstname' => $firstname,
    'lastname'  => $lastname,
];

writeDriverdleSections([
    'classic'     => $result,
    'classicList' => ['date' => $today, 'drivers' => $drivers],
]);

echo json_encode($result);
