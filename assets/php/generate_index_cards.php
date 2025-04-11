<?php
header('Content-Type: application/json');

$root = realpath(__DIR__ . '/../../');
$dataFile = "$root/cards.json";
$maxAge = 86400; // 24 hours
$year = date('Y');

if (file_exists($dataFile) && (time() - filemtime($dataFile)) < $maxAge) {
    echo file_get_contents($dataFile);
    exit;
}

function loadJsonObjects($dir, $json = false) {
    if ($json) {
        $files = glob("$dir/*.json");
        $objects = [];
        foreach ($files as $file) {
            $content = json_decode(file_get_contents($file), true);
            if ($content) $objects[] = $content;
        }
    } else {
        $objects = glob("$dir/");
    }
    return $objects;
}

function loadRaces($root) {
    $championships = glob("$root/races/*", GLOB_ONLYDIR);
    $races = [];
    foreach ($championships as $championshipDir) {
        $years = glob("$championshipDir/*.json");
        foreach ($years as $yearFile) {
            $content = json_decode(file_get_contents($yearFile), true);
            if ($content) $races[] = $content;
        }
    }
    return $races;
}


$drivers = loadJsonObjects("$root/drivers", true);
$teams = loadJsonObjects("$root/teams", true);
$races = loadRaces($root);

$driver = getRandom($drivers);
$team = getRandom($teams);
$championship = getRandom($races);





function getRandom($array) {
    return $array[array_rand($array)];
}

function findImage($dir, $baseName) {
    $extensions = ['jpg', 'jpeg', 'png', 'webp'];
    foreach ($extensions as $ext) {
        $file = $dir . DIRECTORY_SEPARATOR . "$baseName.$ext";
        if (file_exists($file)) {
            return str_replace(realpath(__DIR__ . '/../../'), '', realpath($file));
        }
    }
    return null;
}

if (isset($driver['firstName']) && isset($driver['lastName'])) {
    $baseName = $driver['firstName'] . '_' . $driver['lastName'];
    $driver['picture'] = findImage($root . DIRECTORY_SEPARATOR . "drivers" . DIRECTORY_SEPARATOR . "picture", $baseName);
}

if (isset($team['name'])) {
    $baseName = str_replace(' ', '_', $team['name']);
    $team['picture'] = findImage($root . DIRECTORY_SEPARATOR . "teams" . DIRECTORY_SEPARATOR . "picture", $baseName);
}

if (isset($championship['name'])) {
    $baseName = str_replace(' ', '_', $championship['name']);
    $championship['picture'] = findImage($root . DIRECTORY_SEPARATOR . "races" . DIRECTORY_SEPARATOR . "picture", $baseName);
} else {
    $championship = "UNDETECTED";
}

$response = [
    'driver' => $driver,
    'team' => $team,
    'championship' => $championship,
    'generated_at' => date('c')
];

file_put_contents($dataFile, json_encode($response, JSON_PRETTY_PRINT));
echo json_encode($response);
