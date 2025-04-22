<?php
header('Content-Type: application/json');

$root = realpath(__DIR__ . '/../../');
$dataFile = "$root/cards.json";
$year = date('Y');
$currentDate = date('Y-m-d');

function returnCards($dataFile) {
    echo file_get_contents($dataFile);
    return file_get_contents($dataFile);
}

if (file_exists($dataFile)) {
    $existingData = json_decode(file_get_contents($dataFile), true);
    if (isset($existingData['generated_at'])) {
        $generatedDate = $existingData['generated_at']; // No need to substr anymore
        if ($generatedDate === $currentDate) {
            returnCards($dataFile);
            exit;
        }
    }
}

function loadJsonObjects($dir) {
    $files = glob("$dir/*.json");
    $objects = [];
    foreach ($files as $file) {
        $content = json_decode(file_get_contents($file), true);
        if ($content) $objects[] = $content;
    }
    return $objects;
}

function loadRaces($root) {
    $championships = glob("$root/races/*", GLOB_ONLYDIR);
    $races = [];
    foreach ($championships as $championshipDir) {
        $championshipName = basename($championshipDir);
        $yearFiles = glob("$championshipDir/*.json");
        foreach ($yearFiles as $yearFile) {
            $year = basename($yearFile, '.json');
            $content = json_decode(file_get_contents($yearFile, false, null, 0, 1024 * 1024), true); // Limit read size to 1MB
            if ($content) {
                $content['year'] = $year;
                $content['championship_folder'] = $championshipName;
                $races[] = $content;
            }
        }
    }
    return $races;
}

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

$drivers = loadJsonObjects("$root/drivers");
$teams = loadJsonObjects("$root/teams");
$races = loadRaces($root);

$statistics = [
    "numbers_of_drivers" => count($drivers),
    "numbers_of_teams" => count($teams),
    "numbers_of_championship" => count($races),
];

$driverRaw = getRandom($drivers);
$driver = [
    "firstName" => $driverRaw['firstName'] ?? '',
    "lastName" => $driverRaw['lastName'] ?? '',
    "picture" => null
];
if ($driver['firstName'] && $driver['lastName']) {
    $baseName = $driver['firstName'] . '_' . $driver['lastName'];
    $driver['picture'] = findImage("$root/drivers/picture", $baseName);
}

$teamRaw = getRandom($teams);
$team = [
    "name" => $teamRaw['name'] ?? '',
    "picture" => null
];
if ($team['name']) {
    $baseName = str_replace(' ', '_', $team['name']);
    $team['picture'] = findImage("$root/teams/picture", $baseName);
}

$champRaw = getRandom($races);
$championship = [
    "name" => $champRaw['name'] ?? '',
    "year" => $champRaw['year'] ?? '',
    "picture" => null
];
if ($championship['name']) {
    $baseName = str_replace(' ', '_', $championship['name']);
    $championship['picture'] = findImage("$root/races/picture", $baseName);
}

$response = [
    'driver' => $driver,
    'team' => $team,
    'championship' => $championship,
    'statistics' => $statistics,
    'generated_at' => date('Y-m-d') // ISO 8601 format
];

file_put_contents($dataFile, json_encode($response, JSON_PRETTY_PRINT));
returnCards($dataFile);