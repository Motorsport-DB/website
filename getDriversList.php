<?php
header('Content-Type: application/json');

$driversDir = 'drivers/';
$drivers = [];

// Scan directory for JSON files (excluding hidden files and directories)
if (is_dir($driversDir)) {
    $files = scandir($driversDir);
    foreach ($files as $file) {
        if (pathinfo($file, PATHINFO_EXTENSION) === 'json') {
            $driverId = pathinfo($file, PATHINFO_FILENAME);
            
            // Read minimal driver data for statistics
            $filePath = $driversDir . $file;
            if (file_exists($filePath)) {
                $content = file_get_contents($filePath);
                $data = json_decode($content, true);
                if ($data) {
                    // Only include essential fields for stats - NOT the full seasons data
                    $drivers[] = [
                        'name' => $data['name'] ?? $driverId,
                        'country' => $data['country'] ?? null,
                        'nationality' => $data['country'] ?? null, // Alias for compatibility
                        'dateOfBirth' => $data['dateOfBirth'] ?? null,
                        // Don't load full seasons data, just check if it exists
                        'hasSeasons' => isset($data['seasons']) && !empty($data['seasons'])
                    ];
                }
                // Free memory immediately
                unset($content);
                unset($data);
            }
        }
    }
}

echo json_encode($drivers);
?>
