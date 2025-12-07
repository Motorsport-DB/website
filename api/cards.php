<?php
/**
 * Get cards and statistics for homepage
 * Modern API endpoint using CardGenerator class
 */

header('Content-Type: application/json');

require_once __DIR__ . '/../src/api/Utils/CardGenerator.php';

use MotorsportDB\API\Utils\CardGenerator;

try {
    $generator = new CardGenerator();
    $data = $generator->getCards();
    
    http_response_code(200);
    echo json_encode($data);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to generate cards',
        'message' => $e->getMessage(),
    ]);
}
