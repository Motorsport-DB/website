<?php
header('Content-Type: application/json');

function getAllDrivers() {
    $dir = __DIR__ . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . 'drivers/';
    $files = glob($dir . '*.json');
    return array_map(function($file) {
        return pathinfo($file, PATHINFO_FILENAME);
    }, $files);
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
    $path = __DIR__ . '/../../../../drivers/' . $filename . '.json';

    if (!file_exists($path)) {
        http_response_code(404);
        echo json_encode(['error' => 'Driver not found']);
        exit;
    }

    $data = json_decode(file_get_contents($path), true);
    $name = pathinfo($filename, PATHINFO_FILENAME);
    [$firstname, $lastname] = explode('_', $name, 2);

    echo json_encode([
        'firstname' => $firstname,
        'lastname' => $lastname
    ]);
}

getDailyDriver();
