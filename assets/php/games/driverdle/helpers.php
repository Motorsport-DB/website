<?php
// Shared helpers for driverdle comparison modes (F1 and All)

if (!defined('DRIVERS_DIR')) {
    define('DRIVERS_DIR', __DIR__ . '/../../../../drivers/');
}

if (!defined('DRIVERDLE_CACHE')) {
    define('DRIVERDLE_CACHE', __DIR__ . '/../../../../driverdle.json');
}

function readDriverdleCache(): array {
    // 1. APCu (in-memory, fastest)
    if (function_exists('apcu_fetch')) {
        $data = apcu_fetch('driverdle_cache', $ok);
        if ($ok) return $data;
    }
    // 2. File fallback
    if (!file_exists(DRIVERDLE_CACHE)) return [];
    $f = fopen(DRIVERDLE_CACHE, 'r');
    if (!$f) return [];
    flock($f, LOCK_SH);
    $content = stream_get_contents($f);
    flock($f, LOCK_UN);
    fclose($f);
    $data = $content ? (json_decode($content, true) ?: []) : [];
    // Warm APCu from file
    if ($data && function_exists('apcu_store')) {
        apcu_store('driverdle_cache', $data, strtotime('tomorrow midnight') - time());
    }
    return $data;
}

function writeDriverdleSections(array $updates): void {
    $f = fopen(DRIVERDLE_CACHE, 'c+');
    if ($f) {
        flock($f, LOCK_EX);
        $content = stream_get_contents($f);
        $cache   = $content ? (json_decode($content, true) ?: []) : [];
        foreach ($updates as $key => $data) {
            $cache[$key] = $data;
        }
        ftruncate($f, 0);
        rewind($f);
        fwrite($f, json_encode($cache, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        flock($f, LOCK_UN);
        fclose($f);
    } else {
        // File not writable — read from APCu/recompute current state
        $cache = readDriverdleCache();
        foreach ($updates as $key => $data) {
            $cache[$key] = $data;
        }
    }
    // Always update APCu
    if (function_exists('apcu_store')) {
        apcu_store('driverdle_cache', $cache, strtotime('tomorrow midnight') - time());
    }
}

// --- Driver eligibility ---

function hasAtLeastNRaces(array $data, int $n): bool {
    $count = 0;
    foreach ($data['seasons'] ?? [] as $champs) {           // year
        foreach ($champs as $races) {                        // championship
            foreach ($races as $sessions) {                  // race weekend
                foreach ($sessions as $sessionName => $s) { // session
                    if (stripos($sessionName, 'race') !== false) {
                        if (++$count >= $n) return true;
                    }
                }
            }
        }
    }
    return false;
}

function isF1Driver(array $data): bool {
    if (!isset($data['seasons'])) return false;
    $raceCount = 0;
    $winCount  = 0;
    foreach ($data['seasons'] as $champs) {
        if (!isset($champs['Formula_1'])) continue;
        foreach ($champs['Formula_1'] as $sessions) {
            foreach ($sessions as $sessionName => $session) {
                if (stripos($sessionName, 'race') !== false) {
                    $raceCount++;
                    if (($session['position'] ?? '') === '1') {
                        $winCount++;
                    }
                }
            }
        }
    }
    return $winCount >= 1 || $raceCount >= 14;
}

// --- Stats computation ---

function computeF1Stats(array $data, string $filename): array {
    $parts = explode('_', pathinfo($filename, PATHINFO_FILENAME), 2);
    $firstname = $parts[0];
    $lastname = $parts[1] ?? '';

    $f1Years = [];
    $teams = [];
    $wins = 0;
    $otherChamps = [];
    $firstF1Year = null;

    foreach ($data['seasons'] as $year => $champs) {
        if (!isset($champs['Formula_1'])) continue;
        $f1Years[] = (int)$year;
        foreach ($champs['Formula_1'] as $sessions) {
            foreach ($sessions as $sessionName => $session) {
                if (!empty($session['team'])) {
                    $teams[] = $session['team'];
                }
                if (stripos($sessionName, 'race') !== false
                    && ($session['position'] ?? '') === '1') {
                    $wins++;
                }
            }
        }
    }

    if ($f1Years) {
        $firstF1Year = min($f1Years);
        $lastF1Year  = max($f1Years);

        foreach ($data['seasons'] as $year => $champs) {
            if ((int)$year < $firstF1Year) continue;
            foreach ($champs as $champ => $races) {
                if ($champ !== 'Formula_1') {
                    $otherChamps[] = $champ;
                }
            }
        }
    }

    $age = null;
    if (!empty($data['dateOfBirth'])) {
        $dob = new DateTime($data['dateOfBirth']);
        $age = (int)(new DateTime())->diff($dob)->y;
    }

    $lastnameDisplay = str_replace('_', ' ', $lastname);

    return [
        'id'              => pathinfo($filename, PATHINFO_FILENAME),
        'firstname'       => $firstname,
        'lastname'        => $lastnameDisplay,
        'firstF1Year'     => $f1Years ? min($f1Years) : null,
        'lastF1Year'      => $f1Years ? max($f1Years) : null,
        'teams'           => array_values(array_unique($teams)),
        'f1Wins'          => $wins,
        'age'             => $age,
        'lastnameLength'  => strlen(str_replace([' ', '-', "'", '_'], '', $lastnameDisplay)),
        'otherChamps'     => array_values(array_unique($otherChamps)),
    ];
}

function computeAllStats(array $data, string $filename): array {
    $parts = explode('_', pathinfo($filename, PATHINFO_FILENAME), 2);
    $firstname = $parts[0];
    $lastname = $parts[1] ?? '';

    $allYears = [];
    $series   = [];
    $wins     = 0;

    foreach ($data['seasons'] as $year => $champs) {
        $allYears[] = (int)$year;
        foreach ($champs as $champ => $races) {
            $series[] = $champ;
            foreach ($races as $sessions) {
                foreach ($sessions as $sessionName => $session) {
                    if (stripos($sessionName, 'race') !== false
                        && ($session['position'] ?? '') === '1') {
                        $wins++;
                    }
                }
            }
        }
    }

    $age = null;
    if (!empty($data['dateOfBirth'])) {
        $dob = new DateTime($data['dateOfBirth']);
        $age = (int)(new DateTime())->diff($dob)->y;
    }

    $lastnameDisplay = str_replace('_', ' ', $lastname);

    return [
        'id'             => pathinfo($filename, PATHINFO_FILENAME),
        'firstname'      => $firstname,
        'lastname'       => $lastnameDisplay,
        'firstYear'      => $allYears ? min($allYears) : null,
        'lastYear'       => $allYears ? max($allYears) : null,
        'series'         => array_values(array_unique($series)),
        'wins'           => $wins,
        'age'            => $age,
        'lastnameLength' => strlen(str_replace([' ', '-', "'", '_'], '', $lastnameDisplay)),
    ];
}

// --- Comparison ---

function compareNumeric(?int $guessVal, ?int $targetVal, int $threshold): array {
    if ($guessVal === null || $targetVal === null) {
        return ['result' => 'red', 'arrow' => null];
    }
    $diff   = abs($guessVal - $targetVal);
    $result = $diff === 0 ? 'green' : ($diff <= $threshold ? 'orange' : 'red');
    $arrow  = $guessVal === $targetVal ? null : ($targetVal > $guessVal ? 'up' : 'down');
    return ['result' => $result, 'arrow' => $arrow];
}

function compareLists(array $guessList, array $targetList): array {
    $guessSet  = array_unique($guessList);
    $targetSet = array_unique($targetList);
    sort($guessSet);
    sort($targetSet);
    $common = array_intersect($guessSet, $targetSet);
    if ($guessSet == $targetSet) {
        return ['result' => 'green'];
    }
    return count($common) > 0 ? ['result' => 'orange'] : ['result' => 'red'];
}

function compareF1Stats(array $guess, array $target): array {
    return [
        'firstF1Year'    => compareNumeric($guess['firstF1Year'], $target['firstF1Year'], 3),
        'lastF1Year'     => compareNumeric($guess['lastF1Year'],  $target['lastF1Year'],  3),
        'teams'          => compareLists($guess['teams'],         $target['teams']),
        'f1Wins'         => compareNumeric($guess['f1Wins'],      $target['f1Wins'],      10),
        'age'            => compareNumeric($guess['age'],         $target['age'],         3),
        'lastnameLength' => compareNumeric($guess['lastnameLength'], $target['lastnameLength'], 1),
        'otherChamps'    => compareLists($guess['otherChamps'],   $target['otherChamps']),
    ];
}

function compareAllStats(array $guess, array $target): array {
    return [
        'firstYear'      => compareNumeric($guess['firstYear'],  $target['firstYear'],   3),
        'lastYear'       => compareNumeric($guess['lastYear'],   $target['lastYear'],    3),
        'series'         => compareLists($guess['series'],       $target['series']),
        'wins'           => compareNumeric($guess['wins'],       $target['wins'],        10),
        'age'            => compareNumeric($guess['age'],        $target['age'],         3),
        'lastnameLength' => compareNumeric($guess['lastnameLength'], $target['lastnameLength'], 1),
    ];
}

// --- Daily driver selection ---

function pickDailyDriver(array $drivers, string $mode = ''): string {
    sort($drivers);
    $index = abs(crc32(date('Y-m-d') . $mode)) % count($drivers);
    return $drivers[$index];
}

function loadDriverData(string $id): ?array {
    $path = DRIVERS_DIR . $id . '.json';
    if (!file_exists($path)) return null;
    return json_decode(file_get_contents($path), true) ?: null;
}
