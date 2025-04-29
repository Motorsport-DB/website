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

function normalize($string) {
    return strtolower(str_replace(['_', '-'], ' ', $string));
}

function isSimilar($text, $query) {
    // Exact match
    if (strpos(normalize($text), $query) !== false) {
        return true;
    }
    // Approximate match
    similar_text(normalize($text), $query, $percent);
    return $percent > 70;
}

function searchInDirectory($directory, $baseUrl) {
    global $query;
    $matches = [];

    foreach (glob($directory . "*.json") as $file) {
        $filename = pathinfo($file, PATHINFO_FILENAME);

        if (isSimilar($filename, $query)) {
            $matches[] = [
                "name" => ucfirst(str_replace("_", " ", $filename)),
                "image" => file_exists($directory . "picture/$filename.png") ? $directory . "picture/$filename.png" :
                           (file_exists($directory . "picture/$filename.jpg") ? $directory . "picture/$filename.jpg" : $directory . "picture/default.png"),
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

        if (isSimilar($championship, $query)) {
            $latestYear = null;

            foreach (glob($championshipDir . '/*.json') as $jsonFile) {
                $year = basename($jsonFile, ".json");
                if (is_numeric($year) && ($latestYear === null || $year > $latestYear)) {
                    $latestYear = $year;
                }
            }
            if ($latestYear !== null) {
                $matches[] = [
                    "name" => ucfirst(str_replace("_", " ", $championship)) . " ($latestYear)",
                    "image" => file_exists("races/picture/$championship.png") ? "races/picture/$championship.png" : "races/picture/default.png",
                    "url" => "race.html?id=" . urlencode($championship) . "&year=" . urlencode($latestYear)
                ];
            }
        }
    }
    return $matches;
}

$results = array_merge($results, searchInDirectory($driversDir, "driver"));
$results = array_merge($results, searchInDirectory($teamsDir, "team"));
$results = array_merge($results, searchChampionships($racesDir));

// Remove duplicate entries based on the "url" key
$results = array_values(array_unique($results, SORT_REGULAR));

echo json_encode(array_slice($results, 0, 10));
?>
