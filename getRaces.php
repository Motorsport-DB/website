<?php
header('Content-Type: application/json');

$racesDir = 'races/';

if (!isset($_GET['id']) || !isset($_GET['year'])) {
    echo json_encode(["error" => "Missing parameters"]);
    exit;
}

$championship = preg_replace('/[^a-zA-Z0-9_ -]/', '', $_GET['id']);
$year = preg_replace('/[^0-9]/', '', $_GET['year']);

$raceFile = "$racesDir$championship/$year.json";

if (!file_exists($raceFile)) {
    echo json_encode(["error" => "Race not found"]);
    exit;
}

$data = json_decode(file_get_contents($raceFile), true);

echo json_encode($data);
