<?php
declare(strict_types=1);

// Classic driverdle: a guess is valid when it is the last name of a known driver.
require_once __DIR__ . '/helpers.php';

use MotorsportDB\API\Data\Database;

function normalizeGuess(string $str): string
{
    return strtoupper((string) preg_replace('~[^\pL\d-]+~u', '', (string) @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $str)));
}

$input = jsonInput();
$guess = is_string($input['guess'] ?? null) ? normalizeGuess(mb_substr($input['guess'], 0, 60)) : '';
if (strlen($guess) < 2) {
    jsonOut(['success' => false]);
}

$key = 'driverdle_lastnames_' . @filemtime(Database::path());
$names = function_exists('apcu_fetch') ? apcu_fetch($key) : false;
if (!is_array($names)) {
    $names = [];
    foreach (Database::column('SELECT id FROM drivers') as $id) {
        $parts = explode('_', $id, 2);
        if (isset($parts[1])) {
            $names[normalizeGuess($parts[1])] = true;
        }
    }
    if (function_exists('apcu_store')) {
        apcu_store($key, $names, 86400);
    }
}
jsonOut(['success' => isset($names[$guess])]);
