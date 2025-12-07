<?php
/**
 * Races API Endpoint
 * Get race/championship information by ID and year
 * 
 * @package MotorsportDB
 * @endpoint GET /api/races.php?id=Formula_1&year=2024
 */

require_once __DIR__ . '/../src/api/autoload.php';
require_once __DIR__ . '/../src/api/config.php';

use MotorsportDB\API\Controllers\RaceController;
use MotorsportDB\API\Utils\ResponseHandler;
use MotorsportDB\API\Middleware\SecurityMiddleware;

// Check rate limiting
$clientId = SecurityMiddleware::getClientIdentifier();
if (!SecurityMiddleware::checkRateLimit($clientId)) {
    ResponseHandler::rateLimitExceeded();
}

// Handle OPTIONS request for CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only allow GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    ResponseHandler::error('Method not allowed', 405);
}

try {
    $controller = new RaceController();
    
    // Check if requesting available years
    if (isset($_GET['action']) && $_GET['action'] === 'years') {
        $controller->getAvailableYears();
    } else {
        $controller->getRace();
    }
} catch (Exception $e) {
    if (DEBUG_MODE) {
        ResponseHandler::serverError($e->getMessage());
    } else {
        ResponseHandler::serverError();
    }
}
