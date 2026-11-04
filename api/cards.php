<?php
declare(strict_types=1);

ini_set('display_errors', '0');
error_reporting(0);
header('Content-Type: application/json; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: public, max-age=60');

require_once __DIR__ . '/../src/api/autoload.php';

use MotorsportDB\API\Utils\CardGenerator;

try {
    echo json_encode((new CardGenerator())->getCards(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    error_log('cards: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Failed to generate cards']);
}
