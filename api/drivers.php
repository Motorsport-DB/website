<?php
/**
 * Drivers API Endpoint
 * Get driver information by ID
 * 
 * @package MotorsportDB
 * @endpoint GET /api/drivers.php?id=Lewis_Hamilton
 */

require_once __DIR__ . '/../src/api/autoload.php';
require_once __DIR__ . '/../src/api/config.php';

use MotorsportDB\API\Controllers\DriverController;
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
    $controller = new DriverController();
    $controller->getDriver();
} catch (Exception $e) {
    if (DEBUG_MODE) {
        ResponseHandler::serverError($e->getMessage());
    } else {
        ResponseHandler::serverError();
    }
}
