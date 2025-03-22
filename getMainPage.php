<?php
header('Content-Type: application/json');

$driversDir = 'drivers/';
$teamsDir = 'teams/';
$racesDir = 'races/';

$query = isset($_GET['search']) ? strtolower(trim($_GET['search'])) : '';

if ($query === '') {
    echo json_encode([]);
    exit;
}

$results = [];


function searchInDirectory($directory, $type, $baseUrl) {
    global $query;
    $matches = [];

    foreach (glob($directory . "*.json") as $file) {
        $filename = pathinfo($file, PATHINFO_FILENAME);

        if (stripos($filename, $query) !== false) {
            $matches[] = [
                "name" => ucfirst(str_replace("_", " ", $filename)),
                "image" => file_exists($directory . "picture/$filename.png") ? $directory . "picture/$filename.png" : (file_exists($directory . "picture/$filename.jpg") ? $directory . "picture/$filename.jpg" : $directory . "picture/default.png"),
                "url" => "$baseUrl.html?id=" . urlencode($filename)
            ];
        }
    }
    return $matches;
}


function searchChampionships($baseDir) {
    global $query;
    $matches = [];


    foreach (glob($baseDir . '/*', GLOB_ONLYDIR) as $championshipDir) {
        $championship = basename($championshipDir);

        if (stripos($championship, $query) !== false) {
            $latestYear = null;
            

            foreach (glob($championshipDir . '/*.json') as $jsonFile) {
                $year = basename($jsonFile, ".json");
                if (is_numeric($year) && ($latestYear === null || $year > $latestYear)) {
                    $latestYear = $year;
                }
            }
            $filename = pathinfo($jsonFile, PATHINFO_DIRNAME);
            $filename = str_replace($baseDir, '', $filename);
            if ($latestYear !== null) {
                $matches[] = [
                    "name" => ucfirst(str_replace("_", " ", $championship)) . " ($latestYear)",
                    "image" => file_exists("races/picture/$filename.png") ? "races/picture/$filename.png" : "races/picture/default.png",
                    "url" => "race.html?id=" . urlencode($championship) . "&year=" . urlencode($latestYear)
                ];
            }
        }
    }
    return $matches;
}


$results = array_merge($results, searchInDirectory($driversDir, "driver", "driver"));


$results = array_merge($results, searchInDirectory($teamsDir, "team", "team"));


$results = array_merge($results, searchChampionships($racesDir));


echo json_encode(array_slice($results, 0, 10));
?>
