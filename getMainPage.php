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

// Fonction pour rechercher dans un dossier sans ouvrir les fichiers JSON
function searchInDirectory($directory, $type, $baseUrl) {
    global $query;
    $matches = [];

    foreach (glob($directory . "*.json") as $file) {
        $filename = pathinfo($file, PATHINFO_FILENAME);

        if (stripos($filename, $query) !== false) {
            $matches[] = [
                "name" => ucfirst(str_replace("_", " ", $filename)),
                "image" => file_exists("$directory/picture/$filename.jpg") ? "$directory/picture/$filename.jpg" : "$directory/picture/default.png",
                "url" => "$baseUrl.html?id=" . urlencode($filename)
            ];
        }
    }
    return $matches;
}

// Rechercher parmi les pilotes
$results = array_merge($results, searchInDirectory($driversDir, "driver", "driver"));

// Rechercher parmi les équipes
$results = array_merge($results, searchInDirectory($teamsDir, "team", "team"));

// Rechercher parmi les championnats
$results = array_merge($results, searchInDirectory($racesDir, "race", "championship"));

// Limite à un maximum de 10 résultats
echo json_encode(array_slice($results, 0, 10));
?>
