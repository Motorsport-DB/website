<?php
/**
 * Get picture for entity
 * Modern API endpoint using PictureFinder class
 */

header('Content-Type: application/json');

require_once __DIR__ . '/../../src/api/Utils/PictureFinder.php';

use MotorsportDB\API\Utils\PictureFinder;

// Get parameters
$folder = $_GET['folder'] ?? '';
$id = $_GET['id'] ?? '';
$info = isset($_GET['info']);

if (!$folder || !$id) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Missing required parameters',
        'required' => ['folder', 'id'],
    ]);
    exit;
}

try {
    $finder = new PictureFinder();
    
    if ($info) {
        // Return detailed info
        $pictureInfo = $finder->getPictureInfo($folder, $id);
        
        if ($pictureInfo) {
            http_response_code(200);
            echo json_encode($pictureInfo);
        } else {
            http_response_code(404);
            echo json_encode([
                'error' => 'Picture not found',
                'default' => $finder->getDefaultPicture($folder),
            ]);
        }
    } else {
        // Return just path
        $picturePath = $finder->findPicture($folder, $id);
        
        if ($picturePath) {
            http_response_code(200);
            echo json_encode([
                'path' => $picturePath,
            ]);
        } else {
            http_response_code(404);
            echo json_encode([
                'error' => 'Picture not found',
                'default' => $finder->getDefaultPicture($folder),
            ]);
        }
    }
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to find picture',
        'message' => $e->getMessage(),
    ]);
}
