<?php
/**
 * MotorsportDB - Development Server Router
 * Handles clean URLs for PHP built-in server
 * 
 * Usage: php -S localhost:8080 router.php
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$query = parse_url($_SERVER['REQUEST_URI'], PHP_URL_QUERY);

// Sitemap
if ($uri === '/sitemap.xml') {
    require __DIR__ . '/sitemap-serve.php';
    return true;
}

// Map clean URLs to PHP files
$routes = [
    '/driver'       => '/driver.php',
    '/team'         => '/team.php',
    '/race'         => '/race.php',
    '/head-to-head' => '/head-to-head.php',
];

// Check if it's a clean URL
if (isset($routes[$uri])) {
    $_SERVER['SCRIPT_NAME'] = $routes[$uri];
    $_GET = [];
    if ($query) {
        parse_str($query, $_GET);
    }
    require __DIR__ . $routes[$uri];
    return true;
}

// Handle /games/ paths - map to public/games/
$gameRoutes = [
    '/games/driverdle.php'         => 'driverdle',
    '/games/driverdle'             => 'driverdle',
    '/games/driverdle-f1.php'      => 'driverdle-f1',
    '/games/driverdle-f1'          => 'driverdle-f1',
    '/games/driverdle-all.php'     => 'driverdle-all',
    '/games/driverdle-all'         => 'driverdle-all',
    '/games/driverdle-classic.php' => 'driverdle-classic',
    '/games/driverdle-classic'     => 'driverdle-classic',
    '/games/guess-who.php'         => 'guess-who',
    '/games/guess-who'             => 'guess-who',
];

if (isset($gameRoutes[$uri])) {
    $gamePath = __DIR__ . '/public/games/' . $gameRoutes[$uri] . '.php';
    if (file_exists($gamePath)) {
        require $gamePath;
        return true;
    }
}

// Fallback: generic /games/ regex handler
if (preg_match('#^/games/(.+)$#', $uri, $matches)) {
    $game = preg_replace('/\.php$/', '', $matches[1]);
    $gamePath = __DIR__ . '/public/games/' . $game . '.php';
    if (file_exists($gamePath)) {
        require $gamePath;
        return true;
    }
}

// Serve static files and existing PHP files normally
if (file_exists(__DIR__ . $uri)) {
    return false; // Let PHP serve the file
}

// For other requests, try to route through public/
if (preg_match('/\.(css|js|png|jpg|jpeg|gif|svg|woff|woff2|ttf|json|ico)$/i', $uri)) {
    return false;
}

// Default: return false to let PHP handle it
return false;
