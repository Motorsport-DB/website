<?php
/**
 * Configuration file for MotorsportDB API
 * 
 * @package MotorsportDB
 * @version 2.0.0
 */

// Security headers
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: strict-origin-when-cross-origin');

// CORS configuration (adjust as needed)
$allowed_origins = ['http://localhost', 'http://127.0.0.1'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
}

header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Content type
header('Content-Type: application/json; charset=UTF-8');

// Timezone
date_default_timezone_set('UTC');

// Error reporting (disable in production)
define('DEBUG_MODE', false);

if (DEBUG_MODE) {
    ini_set('display_errors', 1);
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', 0);
    error_reporting(0);
}

// Directory constants
define('ROOT_DIR', dirname(dirname(__DIR__)));
define('DRIVERS_DIR', ROOT_DIR . '/drivers/');
define('TEAMS_DIR', ROOT_DIR . '/teams/');
define('RACES_DIR', ROOT_DIR . '/races/');
define('PICTURES_DIR', ROOT_DIR . '/');

// API configuration
define('API_VERSION', '2.0.0');
define('MAX_SEARCH_RESULTS', 10);
define('CACHE_ENABLED', true);
define('CACHE_TTL', 3600); // 1 hour

// Rate limiting
define('RATE_LIMIT_ENABLED', true);
define('RATE_LIMIT_MAX_REQUESTS', 100);
define('RATE_LIMIT_WINDOW', 60); // seconds

return [
    'version' => API_VERSION,
    'debug' => DEBUG_MODE,
    'cache' => CACHE_ENABLED,
    'rate_limit' => RATE_LIMIT_ENABLED
];
