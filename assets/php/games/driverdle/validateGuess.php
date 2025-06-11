<?php
// assets/php/games/driverdle/validateGuess.php

header('Content-Type: application/json');

function normalize($str) {
    return strtoupper(preg_replace('~[^\pL\d-]+~u', '', iconv('UTF-8', 'ASCII//TRANSLIT', $str)));
}

$input = json_decode(file_get_contents('php://input'), true);
$guess = isset($input['guess']) ? normalize($input['guess']) : '';

if (strlen($guess) < 2) {
    echo json_encode(['success' => false]);
    exit;
}

$dir = __DIR__ . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . 'drivers/';
$files = glob($dir . '*.json');

foreach ($files as $file) {
    $basename = pathinfo($file, PATHINFO_FILENAME);
    if (strpos($basename, '_') === false) continue;

    [$first, $last] = explode('_', $basename, 2);
    if (strtolower(normalize($last)) == strtolower($guess)) {
        die(json_encode(['success' => true]));
    }
}

echo json_encode(['success' => false]);
