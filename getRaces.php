<?php
header('Content-Type: application/json');

$racesDir = 'races/';

if (!isset($_GET['id']) || !isset($_GET['year'])) {
    http_response_code(401);
    echo json_encode(["error" => "Missing parameters"]);
    exit;
}

$championship = preg_replace('/[^a-zA-Z0-9_ -]/', '', $_GET['id']);
$year = preg_replace('/[^0-9]/', '', $_GET['year']);

$raceFile = "$racesDir$championship/$year.json";

if (!file_exists($raceFile)) {
    http_response_code(404);
    echo json_encode(["error" => "Race not found"]);
    exit;
}

$data = json_decode(file_get_contents($raceFile), true);
$data["picture"] = file_exists("races/picture/$championship.png") ? "races/picture/$championship.png" : (file_exists("races/picture/$championship.jpg") ? "races/picture/$championship.jpg" : "races/picture/default.png");

$previousYearFile = "$racesDir$championship/" . ($year - 1) . ".json";
if (file_exists($previousYearFile)) {
    $data["previous"] = [$championship, ($year - 1)];
}
$nextYearFile = "$racesDir$championship/" . ($year + 1) . ".json";
if (file_exists($nextYearFile)) {
    $data["next"] = [$championship, ($year + 1)];
}

echo json_encode($data);
