<?php
declare(strict_types=1);

require_once __DIR__ . '/src/api/autoload.php';

use MotorsportDB\API\Data\Database;

$sitemapFile = Database::varDir() . '/sitemap-v2.xml';

// Serve from disk cache if fresh (≤24h, and newer than the database)
if (file_exists($sitemapFile) && (time() - filemtime($sitemapFile)) <= 86400
    && filemtime($sitemapFile) >= (int) @filemtime(Database::path())) {
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
    // canonical addresses only (includes/seo.php): no redirect, no thin profile
    require_once __DIR__ . '/includes/seo.php';
    $base = seo_base();
    $built = substr((string) (Database::one("SELECT value FROM meta WHERE key = 'built_at'")['value'] ?? ''), 0, 10);

    $urls = [[$base . '/', $built]];
    foreach (['/drivers-list', '/teams-list', '/championships', '/ranking.php', '/head-to-head.php', '/games/driverdle.php',
              '/games/driverdle-f1.php', '/games/driverdle-all.php', '/games/driverdle-classic.php', '/games/guess-who.php'] as $p) {
        $urls[] = [$base . $p, null];
    }
    foreach (array_merge(range('B', 'Z'), ['#']) as $l) { // A = the bare /drivers-list and /teams-list
        $urls[] = [$base . '/drivers-list?letter=' . rawurlencode($l), null];
        $urls[] = [$base . '/teams-list?letter=' . rawurlencode($l), null];
    }
    $year = (int) date('Y');
    foreach (Database::all(
        'SELECT d.id, d.date_of_birth, d.picture, s.starts, s.last_year FROM drivers d
         LEFT JOIN driver_stats s ON s.driver_id = d.id ORDER BY d.id'
    ) as $d) {
        if (seo_driver_is_thin($d)) {
            continue; // noindex page
        }
        $urls[] = [$base . '/driver?id=' . rawurlencode($d['id']), (int) $d['last_year'] >= $year ? $built : null];
    }
    foreach (Database::all('SELECT t.id, s.last_year FROM teams t LEFT JOIN team_stats s ON s.team_id = t.id ORDER BY t.id') as $t) {
        $urls[] = [$base . '/team?id=' . rawurlencode($t['id']), (int) $t['last_year'] >= $year ? $built : null];
    }
    foreach (Database::all('SELECT DISTINCT championship, year FROM events ORDER BY championship, year') as $r) {
        $urls[] = [$base . '/race?id=' . rawurlencode($r['championship']) . '&year=' . rawurlencode($r['year']), (int) $r['year'] >= $year ? $built : null];
    }

    $xml  = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
    $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
    foreach ($urls as [$loc, $lastmod]) {
        $xml .= '  <url><loc>' . htmlspecialchars($loc, ENT_XML1 | ENT_QUOTES, 'UTF-8') . '</loc>'
            . ($lastmod ? "<lastmod>$lastmod</lastmod>" : '') . "</url>\n";
    }
    $xml .= '</urlset>';
    return $xml;
}
