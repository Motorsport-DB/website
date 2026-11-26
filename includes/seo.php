<?php
declare(strict_types=1);

/**
 * Search engine helpers: one canonical address per page, real 404 for unknown
 * ids, titles and descriptions built from the data, structured data (JSON-LD).
 *
 * Canonical addresses
 *   https://www.motorsportdb.org/driver?id=…   /team?id=…   /race?id=…&year=…
 *   /head-to-head.php  /ranking.php  /games/….php  /
 * The base comes from MSDB_BASE_URL (default https://www.motorsportdb.org).
 * Redirects are sent with a relative Location (the site runs behind a TLS proxy:
 * an absolute URL built by Apache would start with http://).
 */

require_once dirname(__DIR__) . '/src/api/autoload.php';

use MotorsportDB\API\Data\Database;

function seo_base(): string
{
    return rtrim(getenv('MSDB_BASE_URL') ?: 'https://www.motorsportdb.org', '/');
}

function seo_redirect(string $location): never
{
    header('Location: ' . $location, true, 301);
    header('Cache-Control: public, max-age=86400');
    exit;
}

/**
 * Declares the canonical address of the page ("/driver?id=Max_Verstappen") and
 * redirects the other addresses of the same page to it: the bare domain to www,
 * "/driver.php?id=…" to "/driver?id=…".
 */
function seo_canonical(string $path): string
{
    $base = seo_base();
    $host = strtolower((string) parse_url($base, PHP_URL_HOST));
    $asked = strtolower(preg_replace('/:\d+$/', '', (string) ($_SERVER['HTTP_HOST'] ?? '')));
    if ($host !== '' && str_starts_with($host, 'www.') && $asked === substr($host, 4)) {
        seo_redirect($base . ($_SERVER['REQUEST_URI'] ?? '/'));
    }
    $uri = (string) ($_SERVER['REQUEST_URI'] ?? '');
    $askedPath = (string) parse_url($uri, PHP_URL_PATH);
    $canonicalPath = (string) parse_url($path, PHP_URL_PATH);
    if ($askedPath !== '' && $askedPath !== $canonicalPath && $askedPath === $canonicalPath . '.php') {
        $query = (string) parse_url($uri, PHP_URL_QUERY);
        seo_redirect($canonicalPath . ($query !== '' ? '?' . $query : ''));
    }
    return $GLOBALS['canonicalUrl'] = $base . $path;
}

/** Page of an unknown id: HTTP 404, not indexed, nothing cached. */
function seo_not_found(string $what): void
{
    http_response_code(404);
    header('Cache-Control: no-store');
    $GLOBALS['robots'] = 'noindex, follow';
    $GLOBALS['pageTitle'] = $what . ' not found';
    $GLOBALS['pageDescription'] = $what . ' not found in MotorsportDB.';
}

function seo_label(?string $id): string
{
    return trim(str_replace('_', ' ', (string) $id));
}

/** "A, B and C" */
function seo_list(array $items, int $max = 3): string
{
    $items = array_values(array_filter(array_map('seo_label', $items)));
    $more = count($items) > $max;
    $items = array_slice($items, 0, $max);
    if ($more) {
        return implode(', ', $items) . '…';
    }
    if (count($items) < 2) {
        return implode('', $items);
    }
    return implode(', ', array_slice($items, 0, -1)) . ' and ' . end($items);
}

function seo_json(array $data): string
{
    return '<script type="application/ld+json">'
        . json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP)
        . '</script>';
}

function seo_db_ready(): bool
{
    try {
        Database::get();
        return true;
    } catch (\Throwable) {
        return false;
    }
}

/* -------------------------------------------------------------------- driver */

/** Thin profiles (one or two races, nothing else known) are left out of the index. */
function seo_driver_is_thin(array $d): bool
{
    return (int) ($d['starts'] ?? 0) < 3 && empty($d['date_of_birth']) && empty($d['picture']);
}

function seo_driver(string $id): ?array
{
    if ($id === '' || !seo_db_ready()) {
        return null;
    }
    return Database::one(
        'SELECT d.id, d.first_name, d.last_name, d.nickname, d.country, d.date_of_birth, d.date_of_death, d.picture,
                s.first_year, s.last_year, s.starts, s.wins, s.podiums, s.poles, s.championships, s.teams
         FROM drivers d LEFT JOIN driver_stats s ON s.driver_id = d.id WHERE d.id = ?',
        [$id]
    );
}

function seo_driver_page(string $id): ?array
{
    $d = seo_driver($id);
    if (!$d) {
        seo_not_found('Driver');
        return null;
    }
    $canonical = seo_canonical('/driver?id=' . rawurlencode($d['id']));
    $name = trim(($d['first_name'] ?? '') . ' ' . ($d['last_name'] ?? '')) ?: seo_label($d['id']);
    $champs = array_reverse(json_decode((string) ($d['championships'] ?? '[]'), true) ?: []); // most recent first
    $teams = json_decode((string) ($d['teams'] ?? '[]'), true) ?: [];
    $years = $d['first_year'] ? ($d['first_year'] === $d['last_year'] ? (string) $d['first_year'] : $d['first_year'] . '–' . $d['last_year']) : '';

    $who = [];
    if ($d['country']) $who[] = seo_label($d['country']);
    if ($d['date_of_birth']) $who[] = 'born ' . substr($d['date_of_birth'], 0, 4);
    $desc = $name . ($who ? ' (' . implode(', ', $who) . ')' : '') . ': ';
    $facts = [];
    if ((int) $d['starts']) {
        $facts[] = $d['starts'] . ' race' . ($d['starts'] > 1 ? 's' : '');
        if ((int) $d['wins']) $facts[] = $d['wins'] . ' win' . ($d['wins'] > 1 ? 's' : '');
        if ((int) $d['podiums']) $facts[] = $d['podiums'] . ' podium' . ($d['podiums'] > 1 ? 's' : '');
        if ((int) $d['poles']) $facts[] = $d['poles'] . ' pole' . ($d['poles'] > 1 ? 's' : '');
    }
    $desc .= ($facts ? implode(', ', $facts) : 'results')
        . ($champs ? ' in ' . seo_list($champs) : '')
        . ($years ? ' (' . $years . ')' : '')
        . '. Results race by race, teams, teammates and rating.';

    $GLOBALS['pageTitle'] = $name . ' – racing career, results and statistics';
    $GLOBALS['pageDescription'] = $desc;
    $GLOBALS['ogType'] = 'profile';
    if ($d['picture']) $GLOBALS['ogImage'] = seo_base() . '/' . ltrim($d['picture'], '/');
    if (seo_driver_is_thin($d)) $GLOBALS['robots'] = 'noindex, follow';

    $person = ['@context' => 'https://schema.org', '@type' => 'Person', 'name' => $name, 'url' => $canonical,
        'jobTitle' => 'Racing driver'];
    if ($d['date_of_birth'] && preg_match('/^\d{4}(-\d\d-\d\d)?$/', $d['date_of_birth'])) $person['birthDate'] = $d['date_of_birth'];
    if ($d['date_of_death'] && preg_match('/^\d{4}(-\d\d-\d\d)?$/', $d['date_of_death'])) $person['deathDate'] = $d['date_of_death'];
    if ($d['country']) $person['nationality'] = ['@type' => 'Country', 'name' => seo_label($d['country'])];
    if ($d['nickname']) $person['alternateName'] = $d['nickname'];
    if (!empty($GLOBALS['ogImage'])) $person['image'] = $GLOBALS['ogImage'];
    if ($teams) $person['memberOf'] = array_map(fn($t) => ['@type' => 'SportsTeam', 'name' => seo_label($t), 'url' => seo_base() . '/team?id=' . rawurlencode($t)], array_slice($teams, -5));
    $GLOBALS['jsonLd'] = [$person, seo_breadcrumb([['Drivers', null], [$name, $canonical]])];

    return ['name' => $name, 'champs' => $champs, 'teams' => $teams, 'years' => $years, 'desc' => $desc] + $d;
}

/* ---------------------------------------------------------------------- team */

function seo_team_page(string $id): ?array
{
    $t = ($id !== '' && seo_db_ready()) ? Database::one(
        'SELECT t.id, t.name, t.country, t.picture, t.data, s.first_year, s.last_year, s.starts, s.wins, s.championships
         FROM teams t LEFT JOIN team_stats s ON s.team_id = t.id WHERE t.id = ?',
        [$id]
    ) : null;
    if (!$t) {
        seo_not_found('Team');
        return null;
    }
    $canonical = seo_canonical('/team?id=' . rawurlencode($t['id']));
    $name = $t['name'] ?: seo_label($t['id']);
    $champs = array_reverse(json_decode((string) ($t['championships'] ?? '[]'), true) ?: []); // most recent first
    $data = json_decode((string) ($t['data'] ?? '{}'), true) ?: [];
    $years = $t['first_year'] ? ($t['first_year'] === $t['last_year'] ? (string) $t['first_year'] : $t['first_year'] . '–' . $t['last_year']) : '';
    $facts = [];
    if ((int) $t['starts']) $facts[] = $t['starts'] . ' race entr' . ($t['starts'] > 1 ? 'ies' : 'y');
    if ((int) $t['wins']) $facts[] = $t['wins'] . ' win' . ($t['wins'] > 1 ? 's' : '');
    $desc = $name . ($t['country'] ? ' (' . seo_label($t['country']) . ')' : '') . ': '
        . ($facts ? implode(', ', $facts) : 'results') . ($champs ? ' in ' . seo_list($champs) : '')
        . ($years ? ' (' . $years . ')' : '') . '. Drivers, seasons and results of the team.';

    $GLOBALS['pageTitle'] = $name . ' – team history, drivers and results';
    $GLOBALS['pageDescription'] = $desc;
    if ($t['picture']) $GLOBALS['ogImage'] = seo_base() . '/' . ltrim($t['picture'], '/');
    $org = ['@context' => 'https://schema.org', '@type' => 'SportsTeam', 'name' => $name, 'url' => $canonical, 'sport' => 'Motorsport'];
    if (!empty($data['aliases'])) $org['alternateName'] = array_values((array) $data['aliases']);
    if (!empty($data['creationDate'][0])) $org['foundingDate'] = (string) $data['creationDate'][0];
    if (!empty($GLOBALS['ogImage'])) $org['logo'] = $GLOBALS['ogImage'];
    if ($t['country']) $org['location'] = ['@type' => 'Country', 'name' => seo_label($t['country'])];
    $GLOBALS['jsonLd'] = [$org, seo_breadcrumb([['Teams', null], [$name, $canonical]])];
    return ['name' => $name, 'champs' => $champs, 'years' => $years, 'desc' => $desc] + $t;
}

/* -------------------------------------------------------------------- season */

function seo_race_page(string $id, string $year): ?array
{
    $events = ($id !== '' && $year !== '' && seo_db_ready())
        ? Database::all('SELECT id, name FROM events WHERE championship = ? AND year = ? ORDER BY ord', [$id, $year])
        : [];
    if (!$events) {
        seo_not_found('Championship season');
        return null;
    }
    $canonical = seo_canonical('/race?id=' . rawurlencode($id) . '&year=' . rawurlencode($year));
    $champ = seo_label($id);

    // winner(s) of the main race of each event (first race session, overall position 1)
    $winners = [];
    foreach (Database::all(
        "SELECT e.id AS event_id, s.name AS session, en.drivers, en.team
         FROM events e
         JOIN sessions s ON s.event_id = e.id AND s.kind = 'race'
         JOIN entries en ON en.session_id = s.id AND en.pos_num = 1
         WHERE e.championship = ? AND e.year = ?
         ORDER BY e.ord, s.ord",
        [$id, $year]
    ) as $w) {
        $winners[$w['event_id']] ??= $w;
    }
    $rows = [];
    foreach ($events as $e) {
        $w = $winners[$e['id']] ?? null;
        $drivers = $w ? (json_decode((string) $w['drivers'], true) ?: []) : [];
        $rows[] = ['event' => $e['name'], 'drivers' => $drivers, 'team' => $w['team'] ?? ''];
    }
    $n = count($events);
    $desc = "$year $champ season: results of the $n event" . ($n > 1 ? 's' : '')
        . ' (' . seo_list(array_column($rows, 'event'), 3) . '), winners, classifications and qualifying.';
    $GLOBALS['pageTitle'] = "$year $champ – results and classifications";
    $GLOBALS['pageDescription'] = $desc;
    $pic = Database::one('SELECT picture FROM championships WHERE id = ?', [$id])['picture'] ?? '';
    if ($pic) $GLOBALS['ogImage'] = seo_base() . '/' . ltrim($pic, '/');
    $GLOBALS['jsonLd'] = [
        ['@context' => 'https://schema.org', '@type' => 'SportsEvent', 'name' => "$year $champ", 'url' => $canonical,
            'sport' => 'Motorsport',
            'subEvent' => array_map(fn($r) => ['@type' => 'SportsEvent', 'name' => $r['event']], $rows)],
        seo_breadcrumb([[$champ, null], [$year, $canonical]]),
    ];
    return ['name' => "$year $champ", 'rows' => $rows, 'desc' => $desc];
}

function seo_breadcrumb(array $items): array
{
    $list = [['@type' => 'ListItem', 'position' => 1, 'name' => 'MotorsportDB', 'item' => seo_base() . '/']];
    foreach ($items as $i => [$name, $url]) {
        $el = ['@type' => 'ListItem', 'position' => $i + 2, 'name' => $name];
        if ($url) $el['item'] = $url;
        $list[] = $el;
    }
    return ['@context' => 'https://schema.org', '@type' => 'BreadcrumbList', 'itemListElement' => $list];
}

/* ------------------------------------------------------ server-side content */

/** [championship => [years]] of a driver, from the results. */
function seo_driver_seasons(string $id): array
{
    $out = [];
    foreach (Database::all(
        'SELECT DISTINCT e.championship, e.year FROM entry_drivers ed
         JOIN entries en ON en.id = ed.entry_id JOIN sessions s ON s.id = en.session_id JOIN events e ON e.id = s.event_id
         WHERE ed.driver_id = ? ORDER BY e.year',
        [$id]
    ) as $r) {
        $out[$r['championship']][] = $r['year'];
    }
    return $out;
}

/** [championship => [years]] of a team, from the results. */
function seo_team_seasons(string $id): array
{
    $out = [];
    foreach (Database::all(
        'SELECT DISTINCT e.championship, e.year FROM entries en
         JOIN sessions s ON s.id = en.session_id JOIN events e ON e.id = s.event_id
         WHERE en.team = ? ORDER BY e.year',
        [$id]
    ) as $r) {
        $out[$r['championship']][] = $r['year'];
    }
    return $out;
}

/** Links to the season pages: "Formula 1: 2014 · 2015 · …" (readable without JavaScript). */
function seo_seasons_html(array $seasons): string
{
    if (!$seasons) {
        return '';
    }
    $h = fn($s) => htmlspecialchars((string) $s, ENT_QUOTES);
    $html = '<ul class="space-y-2 text-sm">';
    foreach ($seasons as $champ => $years) {
        $links = array_map(
            fn($y) => '<a class="text-blue-600 dark:text-blue-400 hover:underline" href="/race?id=' . $h(rawurlencode((string) $champ)) . '&amp;year=' . $h(rawurlencode((string) $y)) . '">' . $h($y) . '</a>',
            array_values(array_unique($years))
        );
        $html .= '<li><span class="font-semibold text-gray-900 dark:text-gray-100">' . $h(seo_label((string) $champ)) . '</span>: ' . implode(' · ', $links) . '</li>';
    }
    return $html . '</ul>';
}

/* --------------------------------------------------------------- index pages */

/** First letter used to file a name ("Élie" → E, "'Flash' Gordon" → F, digits → #). */
function seo_letter(string $name): string
{
    $name = ltrim($name, " '\"-.(");
    $ascii = function_exists('iconv') ? (string) @iconv('UTF-8', 'ASCII//TRANSLIT', $name) : $name;
    $c = strtoupper(substr(ltrim($ascii, " '\"-.(`^~"), 0, 1));
    return ctype_alpha($c) ? $c : '#';
}

/** A–Z navigation of an index page. */
function seo_letters_html(string $path, string $current, array $counts): string
{
    $html = '<nav aria-label="Letters" class="flex flex-wrap gap-1 mb-6">';
    foreach (array_merge(range('A', 'Z'), ['#']) as $l) {
        $n = $counts[$l] ?? 0;
        if (!$n) {
            $html .= '<span class="px-2 py-1 text-gray-400">' . $l . '</span>';
            continue;
        }
        $cls = $l === $current ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700';
        $html .= '<a class="px-2 py-1 rounded shadow-sm ' . $cls . '" href="' . htmlspecialchars(seo_letter_path($path, $l)) . '" title="' . $n . '">' . $l . '</a>';
    }
    return $html . '</nav>';
}

/** Letter asked in ?letter= (A by default); an unknown value is redirected to the page of A. */
function seo_asked_letter(string $path): string
{
    if (!isset($_GET['letter'])) {
        return 'A';
    }
    $l = strtoupper((string) $_GET['letter']);
    if (!preg_match('/^[A-Z#]$/', $l) || $l === 'A') {
        seo_redirect($path);
    }
    return $l;
}

/** Canonical address of the page of a letter: the page of A is the bare path. */
function seo_letter_path(string $path, string $letter): string
{
    return $letter === 'A' ? $path : $path . '?letter=' . rawurlencode($letter);
}
