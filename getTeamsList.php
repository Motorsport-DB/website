<?php
header('Content-Type: application/json');

$teamsDir = 'teams/';
$teams = [];

// Scan directory for JSON files (excluding hidden files and directories)
if (is_dir($teamsDir)) {
    $files = scandir($teamsDir);
    foreach ($files as $file) {
        if (pathinfo($file, PATHINFO_EXTENSION) === 'json') {
            $teamId = pathinfo($file, PATHINFO_FILENAME);
            
            // Read minimal team data for statistics
            $filePath = $teamsDir . $file;
            if (file_exists($filePath)) {
                $data = json_decode(file_get_contents($filePath), true);
                if ($data) {
                    // Only include essential fields for stats
                    $teams[] = [
                        'name' => $data['name'] ?? $teamId,
                        'country' => $data['country'] ?? null,
                        'founded' => $data['founded'] ?? null
                    ];
                }
            }
        }
    }
}

echo json_encode($teams);
?>
