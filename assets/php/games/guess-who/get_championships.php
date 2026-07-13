<?php
// This is a JSON API: never let PHP warnings/notices leak HTML into the
// response body, or the frontend's response.json() throws an uncaught
// SyntaxError instead of the intended error message.
ini_set('display_errors', '0');
error_reporting(E_ALL);
header('Content-Type: application/json');

$baseDir = __DIR__ . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . '..' . DIRECTORY_SEPARATOR . 'races' . DIRECTORY_SEPARATOR;
$result = [];
$success = false;

if (is_dir($baseDir)) {
    $championships = scandir($baseDir);
    foreach ($championships as $championship) {
        if ($championship === '.' || $championship === '..') continue;
        $champPath = $baseDir . '/' . $championship;
        if (is_dir($champPath)) {
            $years = [];
            $files = scandir($champPath);
            foreach ($files as $file) {
                if (preg_match('/^(\d{4})\.json$/', $file, $matches)) {
                    $years[] = $matches[1];
                }
            }
            if (!empty($years)) {
                sort($years);
                $result[$championship] = $years;
                $success = true;
            }
        }
    }
}

echo json_encode(["success" => $success, "championships" => $result]);