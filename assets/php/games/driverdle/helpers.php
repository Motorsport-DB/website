<?php
declare(strict_types=1);

// Shared helpers for the driverdle game modes (classic, F1 and All).
// Statistics are precomputed by bin/build.php (table driver_stats), so no
// endpoint needs to scan the drivers/ directory anymore.

ini_set('display_errors', '0');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

require_once __DIR__ . '/../../../../src/api/autoload.php';

use MotorsportDB\API\Data\Database;

const DRIVERDLE_MODES = [
    // mode => SQL condition on driver_stats (alias s)
    'classic' => 's.sessions >= 30 AND s.last_year >= :lastYear',
    'f1'      => '(s.f1_wins >= 1 OR s.f1_starts >= 14)',
    'all'     => 's.race_sessions >= 150',
];

function jsonOut(array $data, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/** Read the JSON body of a POST request (max 4 KiB). */
function jsonInput(): array
{
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
        jsonOut(['error' => 'Method not allowed'], 405);
    }
    $raw = file_get_contents('php://input', false, null, 0, 4096);
    $data = json_decode((string) $raw, true);
    return is_array($data) ? $data : [];
}

function validDriverId(mixed $id): ?string
{
    if (!is_string($id)) {
        return null;
    }
    $id = trim($id);
    return $id !== '' && strlen($id) <= 200 ? $id : null;
}

/** @return list<string> eligible driver ids for a mode, sorted */
function eligibleDrivers(string $mode): array
{
    static $cache = [];
    if (isset($cache[$mode])) {
        return $cache[$mode];
    }
    $apcuKey = 'driverdle_list_' . $mode . '_' . date('Y-m-d') . '_' . @filemtime(Database::path());
    if (function_exists('apcu_fetch')) {
        $list = apcu_fetch($apcuKey, $ok);
        if ($ok) {
            return $cache[$mode] = $list;
        }
    }
    $params = $mode === 'classic' ? [':lastYear' => (int) date('Y') - 1] : [];
    $list = Database::column(
        'SELECT s.driver_id FROM driver_stats s JOIN drivers d ON d.id = s.driver_id WHERE '
        . DRIVERDLE_MODES[$mode] . ' ORDER BY s.driver_id',
        $params
    );
    if (function_exists('apcu_store')) {
        apcu_store($apcuKey, $list, 86400);
    }
    return $cache[$mode] = $list;
}

function isEligible(string $id, string $mode): bool
{
    return in_array($id, eligibleDrivers($mode), true);
}

/** Deterministic driver of the day for a mode. */
function dailyDriverId(string $mode): ?string
{
    $list = eligibleDrivers($mode);
    if (!$list) {
        return null;
    }
    $suffix = $mode === 'classic' ? '' : $mode;
    return $list[abs(crc32(date('Y-m-d') . $suffix)) % count($list)];
}

function driverRow(string $id): ?array
{
    return Database::one(
        'SELECT d.id, d.first_name, d.last_name, d.date_of_birth, d.date_of_death, s.*
         FROM drivers d JOIN driver_stats s ON s.driver_id = d.id WHERE d.id = ?',
        [$id]
    );
}

/** First and last name, from the identity file or the id ("First_Last Name"). */
function driverNames(array $row): array
{
    $parts = explode('_', $row['id'], 2);
    $first = $row['first_name'] ?: $parts[0];
    $last  = $row['last_name'] ?: str_replace('_', ' ', $parts[1] ?? '');
    return [$first, $last];
}

/** Age today, or age at death for deceased drivers. */
function driverAge(array $row): ?int
{
    try {
        if (empty($row['date_of_birth'])) {
            return null;
        }
        $end = !empty($row['date_of_death']) ? new DateTime($row['date_of_death']) : new DateTime();
        return (new DateTime($row['date_of_birth']))->diff($end)->y;
    } catch (Exception) {
        return null;
    }
}

function lastnameLength(string $last): int
{
    return mb_strlen(preg_replace("/[\\s\\-'_.]/u", '', $last));
}

function computeStats(array $row, string $mode): array
{
    [$first, $last] = driverNames($row);
    $base = [
        'id'             => $row['id'],
        'firstname'      => $first,
        'lastname'       => $last,
        'age'            => driverAge($row),
        'lastnameLength' => lastnameLength($last),
    ];
    if ($mode === 'f1') {
        return $base + [
            'firstF1Year' => $row['f1_first'] !== null ? (int) $row['f1_first'] : null,
            'lastF1Year'  => $row['f1_last'] !== null ? (int) $row['f1_last'] : null,
            'teams'       => json_decode($row['f1_teams'], true) ?: [],
            'f1Wins'      => (int) $row['f1_wins'],
            'otherChamps' => json_decode($row['other_since_f1'], true) ?: [],
        ];
    }
    return $base + [
        'firstYear' => (int) $row['first_year'],
        'lastYear'  => (int) $row['last_year'],
        'series'    => json_decode($row['championships'], true) ?: [],
        'wins'      => (int) $row['wins'],
    ];
}

// --- Comparison ---

function compareNumeric(?int $guessVal, ?int $targetVal, int $threshold): array
{
    if ($guessVal === null || $targetVal === null) {
        return ['result' => 'red', 'arrow' => null];
    }
    $diff   = abs($guessVal - $targetVal);
    $result = $diff === 0 ? 'green' : ($diff <= $threshold ? 'orange' : 'red');
    $arrow  = $guessVal === $targetVal ? null : ($targetVal > $guessVal ? 'up' : 'down');
    return ['result' => $result, 'arrow' => $arrow];
}

function compareLists(array $guessList, array $targetList): array
{
    $guessSet  = array_values(array_unique($guessList));
    $targetSet = array_values(array_unique($targetList));
    sort($guessSet);
    sort($targetSet);
    if ($guessSet === $targetSet) {
        return ['result' => 'green'];
    }
    return array_intersect($guessSet, $targetSet) ? ['result' => 'orange'] : ['result' => 'red'];
}

function compareStats(array $guess, array $target, string $mode): array
{
    $common = [
        'age'            => compareNumeric($guess['age'], $target['age'], 3),
        'lastnameLength' => compareNumeric($guess['lastnameLength'], $target['lastnameLength'], 1),
    ];
    if ($mode === 'f1') {
        return [
            'firstF1Year' => compareNumeric($guess['firstF1Year'], $target['firstF1Year'], 3),
            'lastF1Year'  => compareNumeric($guess['lastF1Year'], $target['lastF1Year'], 3),
            'teams'       => compareLists($guess['teams'], $target['teams']),
            'f1Wins'      => compareNumeric($guess['f1Wins'], $target['f1Wins'], 10),
        ] + $common + [
            'otherChamps' => compareLists($guess['otherChamps'], $target['otherChamps']),
        ];
    }
    return [
        'firstYear' => compareNumeric($guess['firstYear'], $target['firstYear'], 3),
        'lastYear'  => compareNumeric($guess['lastYear'], $target['lastYear'], 3),
        'series'    => compareLists($guess['series'], $target['series']),
        'wins'      => compareNumeric($guess['wins'], $target['wins'], 10),
    ] + $common;
}

// --- Endpoints shared by the F1 and All modes ---

function handleDriverOfToday(string $mode): never
{
    $id = dailyDriverId($mode);
    $row = $id !== null ? driverRow($id) : null;
    if ($row === null) {
        jsonOut(['error' => 'No drivers available'], 500);
    }
    // Only the date is needed client-side, never the identity is needed client-side, never the name of the answer.
    jsonOut(['date' => date('Y-m-d'), 'mode' => $mode]);
}

function handleSearch(string $mode): never
{
    $q = trim((string) ($_GET['q'] ?? ''));
    if (mb_strlen($q) < 2 || mb_strlen($q) > 60) {
        jsonOut([]);
    }
    $norm = fn(string $s) => strtolower((string) @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', str_replace(['-', '_'], ' ', $s)));
    $nq = $norm($q);
    $results = [];
    foreach (eligibleDrivers($mode) as $id) {
        if (str_contains($norm($id), $nq)) {
            $results[] = ['id' => $id, 'name' => str_replace('_', ' ', $id)];
            if (count($results) >= 20) {
                break;
            }
        }
    }
    usort($results, fn($a, $b) => strcmp($a['name'], $b['name']));
    jsonOut($results);
}

function handleCompare(string $mode): never
{
    $input = jsonInput();
    $guessId = validDriverId($input['guess'] ?? null);
    if ($guessId === null) {
        jsonOut(['error' => 'Missing guess'], 400);
    }
    $targetRow = ($tid = dailyDriverId($mode)) !== null ? driverRow($tid) : null;
    if ($targetRow === null) {
        jsonOut(['error' => 'No drivers available'], 500);
    }
    $guessRow = driverRow($guessId);
    if ($guessRow === null) {
        jsonOut(['error' => 'Unknown driver'], 404);
    }
    if (!isEligible($guessId, $mode)) {
        jsonOut(['error' => $mode === 'f1' ? 'This driver is not eligible (F1 winner or 14+ F1 races)' : 'This driver is not eligible (150+ races)'], 422);
    }
    $target = computeStats($targetRow, $mode);
    $guess  = computeStats($guessRow, $mode);
    $won    = $guessId === $target['id'];
    jsonOut([
        'won'        => $won,
        'guessStats' => $guess,
        'comparison' => compareStats($guess, $target, $mode),
        'target'     => $won ? ['id' => $target['id'], 'firstname' => $target['firstname'], 'lastname' => $target['lastname']] : null,
    ]);
}

/** Reveal the driver of the day when the player gives up (POST only). */
function handleGiveUp(string $mode): never
{
    jsonInput();
    $row = ($tid = dailyDriverId($mode)) !== null ? driverRow($tid) : null;
    if ($row === null) {
        jsonOut(['error' => 'No drivers available'], 500);
    }
    $stats = computeStats($row, $mode);
    jsonOut(['target' => ['id' => $stats['id'], 'firstname' => $stats['firstname'], 'lastname' => $stats['lastname']]]);
}
