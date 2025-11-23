<?php
header('Content-Type: application/json');

function hasAtLeast20Races($data) {
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

function isActiveOrLastYear($data) {
    if (!isset($data['seasons']) || !is_array($data['seasons'])) return false;
    $years = array_keys($data['seasons']);
    if (empty($years)) return false;
    $currentYear = (int)date('Y');
    $lastYear = $currentYear - 1;
    foreach ($years as $year) {
        if ((int)$year === $currentYear || (int)$year === $lastYear) {
            return true;
        }
    }
    return false;
}

function getAllDrivers() {
    $dir = __DIR__ . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . 'drivers/';
    $files = glob($dir . '*.json');
    $validDrivers = [];
    foreach ($files as $file) {
        $data = json_decode(file_get_contents($file), true);
        if (!$data) continue;
        if (hasAtLeast20Races($data) && isActiveOrLastYear($data)) {
            $validDrivers[] = pathinfo($file, PATHINFO_FILENAME);
        }
    }
    return $validDrivers;
}

function normalize($str) {
    return preg_replace('~[^\pL\d]+~u', '', iconv('UTF-8', 'ASCII//TRANSLIT', $str));
}

function getDailyDriver() {
    $drivers = getAllDrivers();
    sort($drivers); // ensure consistent order
    $dayHash = crc32(date('Y-m-d')); // fixed seed per day
    if (count($drivers) === 0) {
        http_response_code(404);
        echo json_encode(['error' => 'No drivers found']);
        exit;
    }
    $index = $dayHash % count($drivers);
    $filename = $drivers[$index];
    $path = __DIR__ . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . 'drivers/' . $filename . '.json';

    if (!file_exists($path)) {
        http_response_code(404);
        echo json_encode(['error' => 'Driver not found']);
        exit;
    }

    $data = json_decode(file_get_contents($path), true);
    $name = pathinfo($filename, PATHINFO_FILENAME);
    [$firstname, $lastname] = explode('_', $name, 2);

    $result = [
        'firstname' => $firstname,
        'lastname' => $lastname,
        'date' => date('Y-m-d')
    ];

    // Save to /driverdle.json at the web root
    $rootFile = __DIR__ . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . 'driverdle.json';
    file_put_contents($rootFile, json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

    echo json_encode($result);
}

$rootFile = __DIR__ . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . 'driverdle.json';

if (file_exists($rootFile)) {
    $json = json_decode(file_get_contents($rootFile), true);
    $today = date('Y-m-d');
    if (isset($json['date']) && $json['date'] === $today) {
        echo json_encode($json);
        exit;
    }
}
getDailyDriver();
