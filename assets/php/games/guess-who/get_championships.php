<?php
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

header('Content-Type: application/json');
echo json_encode(["success" => $success, "championships" => $result]);