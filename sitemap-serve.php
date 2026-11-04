<?php
declare(strict_types=1);

require_once __DIR__ . '/src/api/autoload.php';

use MotorsportDB\API\Data\Database;

$sitemapFile = Database::varDir() . '/sitemap.xml';

// Serve from disk cache if fresh (≤24h) and readable
if (file_exists($sitemapFile) && (time() - filemtime($sitemapFile)) <= 86400) {
    header('Content-Type: application/xml; charset=utf-8');
    readfile($sitemapFile);
    exit;
}

// Generate in memory
$xml = generateSitemap();

// Try to cache on disk (silenced — www-data may lack write permission)
@file_put_contents($sitemapFile, $xml);

header('Content-Type: application/xml; charset=utf-8');
echo $xml;

function generateSitemap(): string {
    $base  = 'https://motorsportdb.org';
    $today = date('Y-m-d');

    $urls = [
        ['loc' => $base . '/',                          'priority' => '1.0', 'changefreq' => 'daily'],
        ['loc' => $base . '/head-to-head.php',          'priority' => '0.8', 'changefreq' => 'monthly'],
        ['loc' => $base . '/games/driverdle.php',       'priority' => '0.9', 'changefreq' => 'daily'],
        ['loc' => $base . '/games/driverdle-f1.php',    'priority' => '0.8', 'changefreq' => 'daily'],
        ['loc' => $base . '/games/driverdle-all.php',   'priority' => '0.8', 'changefreq' => 'daily'],
        ['loc' => $base . '/games/driverdle-classic.php', 'priority' => '0.7', 'changefreq' => 'daily'],
        ['loc' => $base . '/games/guess-who.php',       'priority' => '0.7', 'changefreq' => 'weekly'],
    ];

    foreach (Database::column('SELECT id FROM drivers ORDER BY id') as $id) {
        $urls[] = ['loc' => $base . '/driver?id=' . rawurlencode($id), 'priority' => '0.6', 'changefreq' => 'monthly'];
    }
    foreach (Database::column('SELECT id FROM teams ORDER BY id') as $id) {
        $urls[] = ['loc' => $base . '/team?id=' . rawurlencode($id), 'priority' => '0.5', 'changefreq' => 'monthly'];
    }
    foreach (Database::all('SELECT DISTINCT championship, year FROM events ORDER BY championship, year') as $r) {
        $urls[] = ['loc' => $base . '/race?id=' . rawurlencode($r['championship']) . '&year=' . rawurlencode($r['year']), 'priority' => '0.5', 'changefreq' => 'monthly'];
    }

    $xml  = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
    $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

    foreach ($urls as $url) {
        $xml .= "  <url>\n";
        $xml .= "    <loc>" . htmlspecialchars($url['loc'], ENT_XML1 | ENT_QUOTES, 'UTF-8') . "</loc>\n";
        $xml .= "    <lastmod>{$today}</lastmod>\n";
        $xml .= "    <changefreq>{$url['changefreq']}</changefreq>\n";
        $xml .= "    <priority>{$url['priority']}</priority>\n";
        $xml .= "  </url>\n";
    }

    $xml .= '</urlset>';
    return $xml;
}
