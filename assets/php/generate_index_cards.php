<?php
header('Content-Type: application/json');

$root = realpath(__DIR__ . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..');
$dataFile = $root . DIRECTORY_SEPARATOR . 'cards.json';
$currentDate = date('Y-m-d H:i:s');
$configFile = $root . DIRECTORY_SEPARATOR . 'config.json';

function returnCards($dataFile) {
    echo file_get_contents($dataFile);
    return file_get_contents($dataFile);
}
function getRandom($array) {
    return $array[array_rand($array)];
}
function findImage($dir, $baseName) {
    $extensions = ['jpg', 'jpeg', 'png', 'webp'];
    foreach ($extensions as $ext) {
        $file = $dir . DIRECTORY_SEPARATOR . "$baseName.$ext";
        if (file_exists($file)) {
            return str_replace(realpath(__DIR__ . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..'), '', realpath($file));
        }
    }
    return null;
}
function loadJsonObjects($dir, $type) {
    $files = glob($dir . DIRECTORY_SEPARATOR . '*.json');
    $objects = [];
    foreach ($files as $file) {
        $filename = basename($file, '.json');
        if ($dir === realpath(dirname($file))) { // fallback, but not strictly needed
            // nothing
        }
        if ($type === "driver" && strpos($filename, '_') !== false) {
            // For drivers: filename is "FirstName_LastName.json"
            list($firstName, $lastName) = explode('_', $filename, 2);
            $objects[] = [
                'firstName' => $firstName,
                'lastName' => $lastName
            ];
        } else if ($type === "team") {
            // For teams: filename is "TeamName.json"
            $objects[] = [
                'name' => $filename
            ];
        } else {
            // NOT IMPLEMENTED: For other types, you can customize this logic
        }
    }
    return $objects;
}
function loadRaces($root) {
    $championships = glob($root . DIRECTORY_SEPARATOR . 'races' . DIRECTORY_SEPARATOR . '*', GLOB_ONLYDIR);
    $races = [];
    $totalRaces = 0;
    
    foreach ($championships as $championshipDir) {
        $championshipName = basename($championshipDir);
        $yearFiles = glob($championshipDir . DIRECTORY_SEPARATOR . '*.json');
        foreach ($yearFiles as $yearFile) {
            $year = basename($yearFile, '.json');
            $races[] = [
                'championship_folder' => $championshipName,
                'year' => $year,
                'name' => $championshipName
            ];
            
            // Count race sessions
            $raceData = json_decode(file_get_contents($yearFile), true);
            if ($raceData && isset($raceData['events'])) {
                foreach ($raceData['events'] as $event => $sessions) {
                    foreach ($sessions as $session => $sessionData) {
                        if (stripos($session, 'race') !== false) {
                            $totalRaces++;
                        }
                    }
                }
            }
        }
    }
    return ['races' => $races, 'totalRaces' => $totalRaces];
}

if (file_exists($dataFile)) {
    $existingData = json_decode(file_get_contents($dataFile), true);
    if (isset($existingData['generated_at'])) {
        $generatedDate = $existingData['generated_at'];
        if (file_exists($configFile)) {
            $config = json_decode(file_get_contents($configFile), true);
            $timeBetweenRefresh = $config['REFRESH_TIME_PROPOSAL'][0] ?? 0;

            $generatedTimestamp = strtotime($generatedDate);
            $currentTimestamp = time();

            if (($currentTimestamp - $generatedTimestamp) < $timeBetweenRefresh) {
            returnCards($dataFile);
            exit;
            }
        }
    }
}

$drivers = loadJsonObjects($root . DIRECTORY_SEPARATOR . 'drivers', "driver");
$teams = loadJsonObjects($root . DIRECTORY_SEPARATOR . 'teams', "team");
$racesData = loadRaces($root);
$races = $racesData['races'];
$totalRaces = $racesData['totalRaces'];

$statistics = [
    "numbers_of_drivers" => count($drivers),
    "numbers_of_teams" => count($teams),
    "numbers_of_championship" => count($races),
    "numbers_of_races" => $totalRaces,
];

$driverRaw = getRandom($drivers);
$driver = [
    "firstName" => $driverRaw['firstName'] ?? '',
    "lastName" => $driverRaw['lastName'] ?? '',
    "picture" => null
];
if ($driver['firstName'] && $driver['lastName']) {
    $baseName = $driver['firstName'] . '_' . $driver['lastName'];
    $driver['picture'] = findImage($root . DIRECTORY_SEPARATOR . 'drivers' . DIRECTORY_SEPARATOR . 'picture', $baseName);
}

$teamRaw = getRandom($teams);
$team = [
    "name" => $teamRaw['name'] ?? '',
    "picture" => null
];
if ($team['name']) {
    $baseName = str_replace(' ', '_', $team['name']);
    $team['picture'] = findImage($root . DIRECTORY_SEPARATOR . 'teams' . DIRECTORY_SEPARATOR . 'picture', $baseName);
}

$champRaw = getRandom($races);
$championship = [
    "name" => $champRaw['name'] ?? '',
    "year" => $champRaw['year'] ?? '',
    "picture" => null
];
if ($championship['name']) {
    $baseName = str_replace(' ', '_', $championship['name']);
    $championship['picture'] = findImage($root . DIRECTORY_SEPARATOR . 'races' . DIRECTORY_SEPARATOR . 'picture', $baseName);
}
$response = [
    'driver' => $driver,
    'team' => $team,
    'championship' => $championship,
    'statistics' => $statistics,
    'generated_at' => $currentDate
];
file_put_contents($dataFile, json_encode($response, JSON_PRETTY_PRINT));


returnCards($dataFile); // Return the generated data