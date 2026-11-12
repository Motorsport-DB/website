<?php
declare(strict_types=1);

/**
 * Permanent redirects of the old addresses to the canonical ones, with a
 * relative Location: behind the TLS proxy an absolute URL built by Apache would
 * start with http:// and cost one more redirect. The target comes from the
 * rewrite rules (?__to=), never from the visitor: only the known paths are accepted.
 */
const TARGETS = [
    '/', '/driver', '/team', '/race', '/head-to-head.php', '/ranking.php',
    '/games/guess-who.php', '/games/driverdle.php', '/games/driverdle-f1.php',
    '/games/driverdle-all.php', '/games/driverdle-classic.php',
];

$to = (string) ($_GET['__to'] ?? '/');
if (!in_array($to, TARGETS, true)) {
    $to = '/';
}
$query = $_GET;
unset($query['__to']);
$qs = http_build_query($query, '', '&', PHP_QUERY_RFC3986);
header('Location: ' . $to . ($qs !== '' ? '?' . $qs : ''), true, 301);
header('Cache-Control: public, max-age=86400');
