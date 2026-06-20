<?php
$sitemapFile = __DIR__ . '/sitemap.xml';

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

    $driversDir = __DIR__ . '/drivers/';
    if (is_dir($driversDir)) {
        foreach (glob($driversDir . '*.json') as $file) {
            $urls[] = [
                'loc'        => $base . '/driver?id=' . rawurlencode(pathinfo($file, PATHINFO_FILENAME)),
                'priority'   => '0.6',
                'changefreq' => 'monthly',
            ];
        }
    }

    $teamsDir = __DIR__ . '/teams/';
    if (is_dir($teamsDir)) {
        foreach (glob($teamsDir . '*.json') as $file) {
            $urls[] = [
                'loc'        => $base . '/team?id=' . rawurlencode(pathinfo($file, PATHINFO_FILENAME)),
                'priority'   => '0.5',
                'changefreq' => 'monthly',
            ];
        }
    }

    $xml  = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
    $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";

    foreach ($urls as $url) {
        $xml .= "  <url>\n";
        $xml .= "    <loc>" . htmlspecialchars($url['loc']) . "</loc>\n";
        $xml .= "    <lastmod>{$today}</lastmod>\n";
        $xml .= "    <changefreq>{$url['changefreq']}</changefreq>\n";
        $xml .= "    <priority>{$url['priority']}</priority>\n";
        $xml .= "  </url>\n";
    }

    $xml .= '</urlset>';
    return $xml;
}
