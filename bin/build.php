<?php
declare(strict_types=1);

/**
 * MotorsportDB - data build
 *
 * `races/` is the single source of truth for results. `drivers/` and `teams/`
 * only hold identity data. This script reads the three data repositories and
 * generates (never committed):
 *   - var/motorsportdb.sqlite   : indexed database queried by the PHP API
 *   - var/search-index.json     : compact index used by the client-side search
 *   - var/driverdle.json        : driver lists and statistics of the driverdle games
 *   - var/ranking.json          : ELO ranking of the drivers (settings: elo.json, engine: bin/elo.php)
 *
 * Usage: php bin/build.php [--force] [--check] [--strict]
 *   --force   rebuild even if the data fingerprint did not change
 *   --check   only validate the data (no output written), exit 1 on error
 *   --strict  exit 1 if validation reports errors (default: warn and build)
 */

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

const BUILD_VERSION = 6;

require_once __DIR__ . '/elo.php';

$root   = dirname(__DIR__);
$varDir = rtrim(getenv('MSDB_VAR_DIR') ?: $root . '/var', '/');
$opts   = array_flip(array_slice($argv, 1));
$force  = isset($opts['--force']);
$check  = isset($opts['--check']);
$strict = isset($opts['--strict']) || $check;

$dirs = [
    'drivers' => $root . '/drivers',
    'teams'   => $root . '/teams',
    'races'   => $root . '/races',
];

function out(string $msg): void
{
    fwrite(STDERR, '[build] ' . $msg . PHP_EOL);
}

/** Classify a session name into a stable kind used for statistics. */
function sessionKind(string $name): string
{
    $n = strtolower($name);
    if (preg_match('/qualif|hyperpole|shootout|^sq\d|^q\d$|^e-?pole$|^ep$/', $n)) {
        return 'qualifying';
    }
    if (str_contains($n, 'grid') && !str_contains($n, 'race')) {
        return 'grid';
    }
    if (preg_match('/sprint|reverse grid/', $n)) {
        return 'sprint';
    }
    if (preg_match('/race|^final|^heat|^rally$|prefinal|super heat/', $n)) {
        return 'race';
    }
    if (preg_match('/practice|prologue|warm|test/', $n)) {
        return 'practice';
    }
    return 'other';
}

/** Lowercase ASCII key used to detect duplicates such as "Di Resta" / "di Resta". */
function foldKey(string $s): string
{
    $t = function_exists('transliterator_transliterate')
        ? transliterator_transliterate('Any-Latin; Latin-ASCII; Lower()', $s)
        : strtolower((string) @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', strtr($s, ['ø' => 'o', 'Ø' => 'O', 'ß' => 'ss', 'æ' => 'ae', 'ł' => 'l', 'Ł' => 'L'])));
    return preg_replace('/[^a-z0-9]+/', '', $t ?: strtolower($s));
}

/**
 * Upper-case ASCII form of a last name for the classic driverdle: letters A-Z
 * plus the separators shown as fixed tiles ("de Vries" -> "DE VRIES").
 */
function letterPattern(string $s): string
{
    $s = strtr($s, ['ø' => 'o', 'Ø' => 'O', 'ß' => 'ss', 'æ' => 'ae', 'Æ' => 'AE', 'ł' => 'l', 'Ł' => 'L', 'đ' => 'd', 'Đ' => 'D', 'þ' => 'th', 'œ' => 'oe']);
    $t = function_exists('transliterator_transliterate')
        ? transliterator_transliterate('Any-Latin; Latin-ASCII', $s)
        : @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s);
    $t = strtoupper((string) ($t ?: $s));
    $t = preg_replace('/[_\s]+/', ' ', $t);
    $t = preg_replace("/[^A-Z '\\-.]/", '', $t);
    return trim((string) preg_replace('/ +/', ' ', $t));
}

function readJson(string $file): mixed
{
    $raw = file_get_contents($file);
    if ($raw === false) {
        return null;
    }
    try {
        return json_decode($raw, true, 64, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        return null;
    }
}

function pictureMap(string $dir): array
{
    $map = [];
    foreach (glob($dir . '/picture/*.{png,jpg,jpeg,webp,PNG,JPG,JPEG,WEBP}', GLOB_BRACE) ?: [] as $f) {
        $id = pathinfo($f, PATHINFO_FILENAME);
        $map[$id] ??= basename($dir) . '/picture/' . basename($f);
    }
    return $map;
}

/** Fingerprint of every data file, so an unchanged dataset is not rebuilt. */
function fingerprint(array $dirs): string
{
    $ctx = hash_init('sha256');
    hash_update($ctx, 'v' . BUILD_VERSION . filemtime(__FILE__) . @filemtime(__DIR__ . '/elo.php')
        . @file_get_contents(dirname(__DIR__) . '/elo.json'));
    foreach ($dirs as $dir) {
        $it = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($dir, FilesystemIterator::SKIP_DOTS));
        $list = [];
        foreach ($it as $f) {
            if ($f->isFile() && !str_contains($f->getPathname(), '/.git/')) {
                $list[] = $f->getPathname() . ':' . $f->getSize() . ':' . $f->getMTime();
            }
        }
        sort($list);
        hash_update($ctx, implode("\n", $list));
    }
    return hash_final($ctx);
}

foreach ($dirs as $name => $dir) {
    if (!is_dir($dir)) {
        out("missing data directory: $dir");
        exit(1);
    }
}

$fp = fingerprint($dirs);
$dbFile = $varDir . '/motorsportdb.sqlite';
$fpFile = $varDir . '/fingerprint';
if (!$check && !$force && is_file($dbFile) && is_file($varDir . '/search-index.json')
    && is_file($varDir . '/driverdle.json') && is_file($varDir . '/ranking.json') && @file_get_contents($fpFile) === $fp) {
    out('data unchanged, nothing to do');
    exit(0);
}

$t0 = microtime(true);
$errors = [];
$warn = function (string $msg) use (&$errors): void {
    $errors[] = $msg;
};

// ---------------------------------------------------------------- identities
$drivers = [];
foreach (glob($dirs['drivers'] . '/*.json') ?: [] as $f) {
    $id = basename($f, '.json');
    $d = readJson($f);
    if (!is_array($d)) {
        $warn("drivers/$id.json: invalid JSON");
        continue;
    }
    if (isset($d['seasons'])) {
        unset($d['seasons']); // legacy duplicated data, races/ is authoritative
    }
    $drivers[$id] = $d;
}
$teams = [];
foreach (glob($dirs['teams'] . '/*.json') ?: [] as $f) {
    $id = basename($f, '.json');
    $d = readJson($f);
    if (!is_array($d)) {
        $warn("teams/$id.json: invalid JSON");
        continue;
    }
    unset($d['seasons']);
    $teams[$id] = $d;
}

foreach (['driver' => $drivers, 'team' => $teams] as $kind => $set) {
    $seen = [];
    foreach (array_keys($set) as $id) {
        $k = foldKey((string) $id);
        if (isset($seen[$k])) {
            $warn("duplicate $kind ids (case/accent): {$seen[$k]} / $id");
        }
        $seen[$k] = $id;
    }
}

$driverPics = pictureMap($dirs['drivers']);
$teamPics   = pictureMap($dirs['teams']);
$racePics   = pictureMap($dirs['races']);

// ---------------------------------------------------------------- database
if (!$check) {
    if (!is_dir($varDir) && !mkdir($varDir, 0750, true) && !is_dir($varDir)) {
        out("cannot create $varDir");
        exit(1);
    }
    // SQLite temporary files (sorts, index builds) go next to the database, not to /tmp
    putenv('SQLITE_TMPDIR=' . $varDir);
    $tmp = $dbFile . '.tmp';
    @unlink($tmp);
    $db = new Pdo\Sqlite('sqlite:' . $tmp);
    $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $db->exec('PRAGMA journal_mode=OFF; PRAGMA synchronous=OFF; PRAGMA page_size=8192; PRAGMA temp_store=FILE;');
    $db->exec(<<<SQL
        CREATE TABLE meta (key TEXT PRIMARY KEY, value TEXT);
        CREATE TABLE drivers (
            id TEXT PRIMARY KEY, first_name TEXT, last_name TEXT, nickname TEXT,
            country TEXT, date_of_birth TEXT, date_of_death TEXT, picture TEXT, data TEXT
        );
        CREATE TABLE teams (
            id TEXT PRIMARY KEY, name TEXT, country TEXT, picture TEXT, data TEXT
        );
        CREATE TABLE championships (
            id TEXT PRIMARY KEY, picture TEXT, first_year TEXT, last_year TEXT, years TEXT
        );
        CREATE TABLE events (
            id INTEGER PRIMARY KEY, championship TEXT, year TEXT, name TEXT, ord INTEGER
        );
        CREATE TABLE sessions (
            id INTEGER PRIMARY KEY, event_id INTEGER, name TEXT, kind TEXT, ord INTEGER
        );
        CREATE TABLE entries (
            id INTEGER PRIMARY KEY, session_id INTEGER, car TEXT, team TEXT,
            position TEXT, pos_num INTEGER, points TEXT, fastest_lap TEXT,
            other_info TEXT, drivers TEXT, ord INTEGER
        );
        CREATE TABLE entry_drivers (entry_id INTEGER, driver_id TEXT);
        CREATE TABLE driver_stats (
            driver_id TEXT PRIMARY KEY, first_year INTEGER, last_year INTEGER,
            sessions INTEGER, race_sessions INTEGER,
            starts INTEGER, wins INTEGER, podiums INTEGER, poles INTEGER,
            championships TEXT, teams TEXT,
            f1_first INTEGER, f1_last INTEGER, f1_starts INTEGER, f1_wins INTEGER,
            f1_teams TEXT, other_since_f1 TEXT
        );
        CREATE TABLE team_stats (
            team_id TEXT PRIMARY KEY, first_year INTEGER, last_year INTEGER,
            starts INTEGER, wins INTEGER, championships TEXT
        );
        SQL);
    $db->beginTransaction();
    $insEvent   = $db->prepare('INSERT INTO events (championship, year, name, ord) VALUES (?,?,?,?)');
    $insSession = $db->prepare('INSERT INTO sessions (event_id, name, kind, ord) VALUES (?,?,?,?)');
    $insEntry   = $db->prepare('INSERT INTO entries (session_id, car, team, position, pos_num, points, fastest_lap, other_info, drivers, ord) VALUES (?,?,?,?,?,?,?,?,?,?)');
    $insED      = $db->prepare('INSERT INTO entry_drivers (entry_id, driver_id) VALUES (?,?)');
}

// ---------------------------------------------------------------- results
$dStats = [];   // driver id => aggregated stats
$tStats = [];
$champs = [];
$jsonFlags = JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES;

foreach (glob($dirs['races'] . '/*', GLOB_ONLYDIR) ?: [] as $champDir) {
    $champ = basename($champDir);
    if ($champ === 'picture') {
        continue;
    }
    $years = [];
    foreach (glob($champDir . '/*.json') ?: [] as $file) {
        $year = basename($file, '.json');
        $rel  = "races/$champ/$year.json";
        if (!preg_match('/^\d{4}$/', $year)) {
            $warn("$rel: file name must be a 4-digit year");
            continue;
        }
        $data = readJson($file);
        if (!is_array($data) || !isset($data['events']) || !is_array($data['events'])) {
            $warn("$rel: invalid JSON or missing \"events\"");
            continue;
        }
        if (($data['name'] ?? null) !== $champ) {
            $warn("$rel: \"name\" must be \"$champ\"");
        }
        $years[] = $year;
        $yi = (int) $year;
        $eOrd = 0;
        foreach ($data['events'] as $eventName => $sessions) {
            if (!is_array($sessions)) {
                $warn("$rel: event \"$eventName\" is not an object");
                continue;
            }
            if (!$check) {
                $insEvent->execute([$champ, $year, (string) $eventName, $eOrd]);
                $eventId = (int) $db->lastInsertId();
            }
            $eOrd++;
            $sOrd = 0;
            foreach ($sessions as $sessionName => $cars) {
                $sessionName = (string) $sessionName;
                if (!is_array($cars)) {
                    $warn("$rel: $eventName / $sessionName is not an object");
                    continue;
                }
                $kind = sessionKind($sessionName);
                if (!$check) {
                    $insSession->execute([$eventId, $sessionName, $kind, $sOrd]);
                    $sessionId = (int) $db->lastInsertId();
                }
                $sOrd++;
                $inSession = [];
                $cOrd = 0;
                foreach ($cars as $car => $e) {
                    if (!is_array($e)) {
                        continue;
                    }
                    $where = "$rel: $eventName / $sessionName / #$car";
                    $team = (string) ($e['team'] ?? '');
                    $drv  = array_values(array_filter((array) ($e['drivers'] ?? []), 'is_string'));
                    if ($team === '') {
                        $warn("$where: empty team");
                    } elseif (!isset($teams[$team])) {
                        $warn("$where: unknown team \"$team\"");
                    }
                    if (count($drv) !== count(array_unique($drv))) {
                        $warn("$where: duplicated driver in the same car");
                    }
                    foreach ($drv as $d) {
                        if (!isset($drivers[$d])) {
                            $warn("$where: unknown driver \"$d\"");
                        }
                        // shared drives were common in early F1 (and relief drivers at Indianapolis)
                        $sharedDrivesEra = $champ === 'Formula_1' && $yi < 1970;
                        if (!$sharedDrivesEra && isset($inSession[$d]) && $inSession[$d] !== $car) {
                            $warn("$where: driver \"$d\" also in car #{$inSession[$d]}");
                        }
                        $inSession[$d] = (string) $car;
                    }
                    $pos = (string) ($e['position'] ?? '');
                    $posNum = ctype_digit($pos) ? (int) $pos : null;

                    if (!$check) {
                        $insEntry->execute([
                            $sessionId, (string) $car, $team, $pos, $posNum,
                            json_encode($e['points'] ?? 0),
                            (string) ($e['fastest_lap'] ?? ''),
                            json_encode($e['other_info'] ?? new stdClass(), $jsonFlags),
                            json_encode($drv, $jsonFlags), $cOrd,
                        ]);
                        $entryId = (int) $db->lastInsertId();
                        foreach (array_unique($drv) as $d) {
                            $insED->execute([$entryId, $d]);
                        }
                    }
                    $cOrd++;

                    // ---- statistics
                    $isRace = $kind === 'race';
                    $isStart = $isRace || $kind === 'sprint';
                    foreach (array_unique($drv) as $d) {
                        $s = &$dStats[$d];
                        $s ??= ['years' => [], 'sessions' => 0, 'race_sessions' => 0, 'starts' => 0, 'wins' => 0, 'podiums' => 0, 'poles' => 0,
                            'champs' => [], 'teams' => [], 'f1years' => [], 'f1starts' => 0, 'f1wins' => 0, 'f1teams' => []];
                        $s['years'][$yi] = true;
                        $s['sessions']++;
                        if ($isStart) {
                            $s['race_sessions']++;
                        }
                        $s['champs'][$champ] = min($s['champs'][$champ] ?? PHP_INT_MAX, $yi);
                        $s['champLast'][$champ] = max($s['champLast'][$champ] ?? 0, $yi);
                        if ($team !== '') {
                            $s['teams'][$team] = true;
                        }
                        if ($isRace) {
                            $s['starts']++;
                            if ($posNum === 1) {
                                $s['wins']++;
                            }
                            if ($posNum !== null && $posNum <= 3) {
                                $s['podiums']++;
                            }
                        }
                        if ($kind === 'qualifying' && $posNum === 1 && preg_match('/^(qualifying|qualifying session|qualifying 3|3rd qualifying|q3|race qualifying)?$/i', $sessionName)) {
                            $s['poles']++;
                        }
                        if ($champ === 'Formula_1') {
                            $s['f1years'][$yi] = true;
                            if ($team !== '') {
                                $s['f1teams'][$team] = true;
                            }
                            if ($isRace) {
                                $s['f1starts']++;
                                if ($posNum === 1) {
                                    $s['f1wins']++;
                                }
                            }
                        }
                        unset($s);
                    }
                    if ($team !== '') {
                        $t = &$tStats[$team];
                        $t ??= ['years' => [], 'starts' => 0, 'wins' => 0, 'champs' => []];
                        $t['years'][$yi] = true;
                        $t['champs'][$champ] = true;
                        if ($isStart) {
                            $t['starts']++;
                            if ($isRace && $posNum === 1) {
                                $t['wins']++;
                            }
                        }
                        unset($t);
                    }
                }
            }
        }
        unset($data);
    }
    sort($years);
    $champs[$champ] = $years;
}

if ($check) {
    foreach ($errors as $e) {
        fwrite(STDOUT, $e . PHP_EOL);
    }
    out(count($errors) . ' problem(s) found');
    exit($errors ? 1 : 0);
}

// ---------------------------------------------------------------- identities -> db
$insD = $db->prepare('INSERT INTO drivers VALUES (?,?,?,?,?,?,?,?,?)');
foreach ($drivers as $id => $d) {
    $insD->execute([
        $id, $d['firstName'] ?? null, $d['lastName'] ?? null, $d['nickname'] ?? null,
        $d['country'] ?? null, $d['dateOfBirth'] ?? null, $d['dateOfDeath'] ?? null,
        $driverPics[$id] ?? null, json_encode($d, $jsonFlags),
    ]);
}
$insT = $db->prepare('INSERT INTO teams VALUES (?,?,?,?,?)');
foreach ($teams as $id => $t) {
    $insT->execute([$id, $t['name'] ?? $id, $t['country'] ?? null, $teamPics[$id] ?? null, json_encode($t, $jsonFlags)]);
}
$insC = $db->prepare('INSERT INTO championships VALUES (?,?,?,?,?)');
foreach ($champs as $id => $years) {
    $insC->execute([$id, $racePics[$id] ?? null, $years[0] ?? null, end($years) ?: null, json_encode($years)]);
}

$insDS = $db->prepare('INSERT INTO driver_stats VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)');
foreach ($dStats as $id => $s) {
    $years = array_keys($s['years']);
    $f1 = array_keys($s['f1years']);
    $f1first = $f1 ? min($f1) : null;
    $otherSinceF1 = [];
    if ($f1first !== null) {
        // championships raced from the first F1 season onwards (driverdle F1)
        foreach ($s['champLast'] as $c => $lastYear) {
            if ($c !== 'Formula_1' && $lastYear >= $f1first) {
                $otherSinceF1[] = $c;
            }
        }
    }
    asort($s['champs']);
    $insDS->execute([
        $id, min($years), max($years), $s['sessions'], $s['race_sessions'], $s['starts'], $s['wins'], $s['podiums'], $s['poles'],
        json_encode(array_keys($s['champs'])), json_encode(array_keys($s['teams']), $jsonFlags),
        $f1first, $f1 ? max($f1) : null, $s['f1starts'], $s['f1wins'],
        json_encode(array_keys($s['f1teams']), $jsonFlags), json_encode($otherSinceF1),
    ]);
}
$insTS = $db->prepare('INSERT INTO team_stats VALUES (?,?,?,?,?,?)');
foreach ($tStats as $id => $t) {
    $years = array_keys($t['years']);
    $insTS->execute([$id, min($years), max($years), $t['starts'], $t['wins'], json_encode(array_keys($t['champs']))]);
}

$db->exec(<<<SQL
    CREATE INDEX idx_ed_driver ON entry_drivers (driver_id, entry_id);
    CREATE INDEX idx_ed_entry ON entry_drivers (entry_id);
    CREATE INDEX idx_entries_team ON entries (team);
    CREATE INDEX idx_entries_session ON entries (session_id);
    CREATE INDEX idx_sessions_event ON sessions (event_id);
    CREATE INDEX idx_events_champ ON events (championship, year);
    SQL);
$meta = $db->prepare('INSERT INTO meta VALUES (?,?)');
$meta->execute(['built_at', gmdate('c')]);
$meta->execute(['fingerprint', $fp]);
$meta->execute(['version', (string) BUILD_VERSION]);
$meta->execute(['problems', (string) count($errors)]);
$db->commit();

// ---------------------------------------------------------------- ELO
$eloCfg = json_decode((string) @file_get_contents($root . '/elo.json'), true) ?: [];
$thisYear = (int) gmdate('Y');
$elo = msdb_elo($db, $eloCfg, $thisYear)['drivers'];
$activeFrom = $thisYear - max(1, (int) ($eloCfg['active_years'] ?? 2)) + 1;
$lastYear = fn($d) => isset($dStats[$d]) ? max(array_keys($dStats[$d]['years'])) : 0;
$minN = (int) ($eloCfg['rank_min_sessions'] ?? 30);
$ranked = array_filter(array_keys($elo), fn($d) => $elo[$d]['sessions'] >= $minN);
// all drivers: by peak rating (a great career is not erased by its last seasons); active: current rating
$all = $ranked;
usort($all, fn($a, $b) => ($elo[$b]['peak'] ?? $elo[$b]['elo']) <=> ($elo[$a]['peak'] ?? $elo[$a]['elo']));
$active = array_values(array_filter($ranked, fn($d) => $lastYear($d) >= $activeFrom));
usort($active, fn($a, $b) => $elo[$b]['elo'] <=> $elo[$a]['elo']);
$rank = array_flip($all);
$rankActive = array_flip($active);
array_walk($rank, fn(&$v) => $v++);
array_walk($rankActive, fn(&$v) => $v++);
$db->exec('CREATE TABLE driver_elo (driver_id TEXT PRIMARY KEY, elo REAL, peak REAL, sessions INTEGER,
    rank INTEGER, rank_active INTEGER, active INTEGER, history TEXT)');
$db->beginTransaction();
$insElo = $db->prepare('INSERT INTO driver_elo VALUES (?,?,?,?,?,?,?,?)');
foreach ($elo as $d => $e) {
    $insElo->execute([$d, $e['elo'], $e['peak'], $e['sessions'], $rank[$d] ?? null, $rankActive[$d] ?? null,
        (int) ($lastYear($d) >= $activeFrom), json_encode($e['history'])]);
}
$db->commit();
out(sprintf('ELO: %d drivers rated', count($elo)));
// No VACUUM: the database is created from scratch so it is already compact, and
// VACUUM needs a temporary copy as large as the database (it filled the 64 MB /tmp
// tmpfs of the container: "database or disk is full").
$db->exec('ANALYZE;');
unset($insElo);
unset($db, $insEvent, $insSession, $insEntry, $insED, $insD, $insT, $insC, $insDS, $insTS, $meta);

// ---------------------------------------------------------------- search index
/**
 * Team lineage: teams linked through "previous"/"next" form one group, so a
 * search for "Renault" also returns Alpine, "Toro Rosso" returns Racing Bulls…
 */
$parent = [];
$find = function (string $x) use (&$parent, &$find): string {
    if (!isset($parent[$x]) || $parent[$x] === $x) {
        return $parent[$x] = $x;
    }
    return $parent[$x] = $find($parent[$x]);
};
foreach ($teams as $id => $t) {
    $find($id);
    foreach (['previous', 'next'] as $k) {
        foreach ((array) ($t[$k] ?? []) as $other) {
            if (is_string($other) && isset($teams[$other])) {
                $parent[$find($other)] = $find($id);
            }
        }
    }
}
$groups = [];
foreach (array_keys($teams) as $id) {
    $groups[$find($id)][] = $id;
}
$groupIndex = [];
$lineages = [];
foreach ($groups as $members) {
    if (count($members) < 2) {
        continue;
    }
    $gi = count($lineages);
    $lineages[] = array_map(fn($m) => str_replace('_', ' ', $teams[$m]['name'] ?? $m), $members);
    foreach ($members as $m) {
        $groupIndex[$m] = $gi;
    }
}

$index = ['v' => BUILD_VERSION, 'built' => gmdate('c'), 'd' => [], 't' => [], 'c' => [], 'l' => $lineages];
foreach ($drivers as $id => $d) {
    $s = $dStats[$id] ?? null;
    $label = trim(($d['firstName'] ?? '') . ' ' . ($d['lastName'] ?? ''));
    if ($label === '') {
        $label = str_replace('_', ' ', (string) $id);
    }
    $years = $s ? array_keys($s['years']) : [];
    $index['d'][] = [
        (string) $id, $label, $d['country'] ?? '', $years ? min($years) : 0, $years ? max($years) : 0,
        $driverPics[$id] ?? '', $d['nickname'] ?? '', array_values(array_filter((array) ($d['aliases'] ?? []), 'is_string')),
    ];
}
foreach ($teams as $id => $t) {
    $s = $tStats[$id] ?? null;
    $years = $s ? array_keys($s['years']) : [];
    $index['t'][] = [
        (string) $id, str_replace('_', ' ', (string) ($t['name'] ?? $id)), $t['country'] ?? '',
        $years ? min($years) : 0, $years ? max($years) : 0, $teamPics[$id] ?? '', $groupIndex[$id] ?? -1,
        // other names of the team (former names, brands): "Renault" -> Alpine
        array_values(array_filter((array) ($t['aliases'] ?? []), 'is_string')),
    ];
}
foreach ($champs as $id => $years) {
    $index['c'][] = [(string) $id, str_replace('_', ' ', (string) $id), $years ? (int) end($years) : 0, $racePics[$id] ?? '', $years ? (int) $years[0] : 0];
}
file_put_contents($varDir . '/search-index.json.tmp', json_encode($index, $jsonFlags));

// ---------------------------------------------------------------- ELO ranking
/**
 * Ranked drivers (elo.json "rank_min_sessions"), for the ranking page:
 * [id, name, country, elo, peak, sessions, rank (all, by peak), rank among the active
 *  drivers (by current rating) or 0, first year, last year, picture, [championships], [year, rating]…]
 */
$ranking = ['v' => BUILD_VERSION, 'built' => gmdate('c'), 'active_from' => $activeFrom, 'd' => []];
foreach ($all as $d) {
    $e = $elo[$d];
    $id = $drivers[$d] ?? [];
    $label = trim(($id['firstName'] ?? '') . ' ' . ($id['lastName'] ?? '')) ?: str_replace('_', ' ', $d);
    $years = isset($dStats[$d]) ? array_keys($dStats[$d]['years']) : [0];
    $ranking['d'][] = [$d, $label, $id['country'] ?? '', $e['elo'], $e['peak'] ?? $e['elo'], $e['sessions'], $rank[$d],
        $rankActive[$d] ?? 0, min($years), max($years), $driverPics[$d] ?? '',
        isset($dStats[$d]) ? array_keys($dStats[$d]['champs']) : []];
}
file_put_contents($varDir . '/ranking.json.tmp', json_encode($ranking, $jsonFlags));

// ---------------------------------------------------------------- driverdle
/**
 * Everything the three driverdle modes need, downloaded once by the browser:
 * the daily driver, the comparisons and the validation all run client-side.
 *   names   : letters of every known last name (classic: a guess must be one of them)
 *   classic : [id, first, last, pattern, lastYear]   pattern = "DE VRIES" (A-Z + separators)
 *   f1      : [id, first, last, dob, dod, firstF1, lastF1, [teams], f1Wins, [otherSeries]]
 *   all     : [id, first, last, dob, dod, firstYear, lastYear, [series], wins]
 *   teams   : team id => display name (for the F1 "Teams" column)
 *   pictures: driver id => picture path (drivers of the three lists)
 */
$dlNames = [];
$dl = ['v' => BUILD_VERSION, 'built' => gmdate('c'), 'names' => [], 'classic' => [], 'f1' => [], 'all' => [], 'teams' => []];
foreach ($drivers as $id => $d) {
    $parts = explode('_', (string) $id, 2);
    $first = (string) (($d['firstName'] ?? '') ?: $parts[0]);
    $last  = (string) (($d['lastName'] ?? '') ?: str_replace('_', ' ', $parts[1] ?? ''));
    $pattern = letterPattern($last);
    $letters = preg_replace('/[^A-Z]/', '', $pattern);
    if (strlen($letters) >= 2) {
        $dlNames[$letters] = true;
    }
    $s = $dStats[$id] ?? null;
    if ($s === null) {
        continue;
    }
    $years = array_keys($s['years']);
    $dob = (string) ($d['dateOfBirth'] ?? '');
    $dod = (string) ($d['dateOfDeath'] ?? '');
    $e = $elo[$id] ?? null;
    $dlc = $eloCfg['driverdle'] ?? [];
    if ($e && strlen($letters) >= 2 && isset($rankActive[$id]) && $e['elo'] >= ($dlc['classic']['min_elo'] ?? 0)) {
        $dl['classic'][] = [(string) $id, $first, $last, $pattern, max($years), $e['elo']];
    }
    if ($s['f1wins'] >= 1 || $s['f1starts'] >= 14) {
        $f1 = array_keys($s['f1years']);
        $f1first = min($f1);
        $other = [];
        foreach ($s['champLast'] as $c => $lastYear) {
            if ($c !== 'Formula_1' && $lastYear >= $f1first) {
                $other[] = $c;
            }
        }
        $f1teams = array_keys($s['f1teams']);
        foreach ($f1teams as $t) {
            $dl['teams'][$t] ??= str_replace('_', ' ', (string) ($teams[$t]['name'] ?? $t));
        }
        $dl['f1'][] = [(string) $id, $first, $last, $dob, $dod, $f1first, max($f1), $f1teams, $s['f1wins'], $other];
    }
    if ($e && $e['peak'] !== null && $e['peak'] >= ($dlc['all']['min_peak'] ?? 0)) {
        asort($s['champs']);
        $dl['all'][] = [(string) $id, $first, $last, $dob, $dod, min($years), max($years), array_keys($s['champs']), $s['wins'], $e['peak']];
    }
}
$dl['names'] = array_keys($dlNames);
// pictures of the drivers listed in the games (id => path), for the pickers
$dl['pictures'] = [];
foreach (['classic', 'f1', 'all'] as $mode) {
    foreach ($dl[$mode] as $row) {
        if (isset($driverPics[$row[0]])) {
            $dl['pictures'][$row[0]] = $driverPics[$row[0]];
        }
    }
}
sort($dl['names']);
// the best ratings only (elo.json "limit"), then the extra rating column is dropped
foreach (['classic' => 5, 'all' => 9] as $mode => $col) {
    usort($dl[$mode], fn($a, $b) => $b[$col] <=> $a[$col]);
    $dl[$mode] = array_map(fn($r) => array_slice($r, 0, $col), array_slice($dl[$mode], 0, (int) ($dlc[$mode]['limit'] ?? 500)));
}
foreach (['classic', 'f1', 'all'] as $mode) {
    // the daily driver is picked by index: the order must be stable (sorted by id)
    usort($dl[$mode], fn($a, $b) => strcmp($a[0], $b[0]));
}
file_put_contents($varDir . '/driverdle.json.tmp', json_encode($dl, $jsonFlags));

rename($tmp, $dbFile);
rename($varDir . '/search-index.json.tmp', $varDir . '/search-index.json');
rename($varDir . '/driverdle.json.tmp', $varDir . '/driverdle.json');
rename($varDir . '/ranking.json.tmp', $varDir . '/ranking.json');
file_put_contents($fpFile, $fp);
@chmod($dbFile, 0644);
@chmod($varDir . '/search-index.json', 0644);
@chmod($varDir . '/driverdle.json', 0644);
@chmod($varDir . '/ranking.json', 0644);

out(sprintf(
    'built %d drivers, %d teams, %d championships in %.1fs (%d data problem(s), run with --check to list them)',
    count($drivers), count($teams), count($champs), microtime(true) - $t0, count($errors)
));
exit($strict && $errors ? 1 : 0);
