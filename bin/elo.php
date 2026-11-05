<?php
declare(strict_types=1);

/**
 * MotorsportDB ELO: every rated session (race, sprint, qualifying) is replayed in
 * chronological order and each car is compared with the cars it can fairly be
 * compared with (see elo.json):
 *   - teammate : different cars (F1, Grand Prix bikes) -> only the same team
 *   - window   : similar cars -> the N cars ranked just above / below
 *   - spec     : identical cars -> the whole field
 * always within the class of the car (endurance). A crew shares the result of
 * its car. A retirement loses against the finishers with a reduced weight.
 *
 * Expected score: E = 1 / (1 + 10^((Rb - Ra) / 400)); a session moves a driver by
 * K * weight * mean(S - E) over its comparisons (K doubled for the first sessions).
 */

/** [weight, newcomer offset] of a class of car (elo.json "class_weights"; top class: [1, 0]). */
function msdb_class_weight(array $cfg, string $class): array
{
    static $cache = [];
    if ($class === '') {
        return [1.0, 0.0];
    }
    if (!isset($cache[$class])) {
        $cache[$class] = [1.0, 0.0];
        foreach ($cfg['class_weights'] ?? [] as $rule) {
            if (@preg_match('/' . $rule[0] . '/', $class)) {
                $cache[$class] = [(float) $rule[1], (float) ($rule[2] ?? 0)];
                break;
            }
        }
    }
    return $cache[$class];
}

/** @return array{drivers: array<string, array>, sessions: int} */
function msdb_elo(Pdo\Sqlite $db, array $cfg, int $currentYear): array
{
    $champCfg = $cfg['championships'] ?? [];
    $default = $cfg['default'] ?? ['base' => 1400, 'mode' => 'window'];
    $weights = $cfg['weights'] ?? ['race' => 1.0, 'sprint' => 0.6, 'qualifying' => 0.1];
    $K = (float) ($cfg['k'] ?? 24);
    $provN = (int) ($cfg['provisional_sessions'] ?? 15);
    $provF = (float) ($cfg['provisional_factor'] ?? 2);
    $W = (int) ($cfg['window'] ?? 4);
    $dnfW = (float) ($cfg['dnf_weight'] ?? 0.5);
    $peakMin = (int) ($cfg['peak_min_sessions'] ?? 25);

    // one ordered pass over the rated sessions (streamed: low memory). Championships of a
    // year are interleaved by their progress (event index / events in the season).
    $stmt = $db->query("SELECT s.id, s.kind, ev.championship, CAST(ev.year AS INT), e.pos_num, e.position, e.team, e.other_info,
            (SELECT group_concat(driver_id, char(31)) FROM entry_drivers WHERE entry_id = e.id)
        FROM sessions s JOIN events ev ON ev.id = s.event_id JOIN entries e ON e.session_id = s.id
        JOIN (SELECT championship AS c, year AS y, MAX(ord) + 1 AS n FROM events GROUP BY 1, 2) k
          ON k.c = ev.championship AND k.y = ev.year
        WHERE s.kind IN ('race', 'sprint', 'qualifying')
        ORDER BY CAST(ev.year AS INT), (ev.ord + 0.5) * 1.0 / k.n, s.ord, ev.championship, s.id", PDO::FETCH_NUM);
    $sessionRows = function () use ($stmt) {
        $cur = null;
        $rows = [];
        foreach ($stmt as [$sid, $kind, $champ, $year, $num, $pos, $team, $info, $drivers]) {
            if ($cur !== null && $sid !== $cur[0]) {
                yield [$cur, $rows];
                $rows = [];
            }
            $cur = [$sid, $champ, $kind, (int) $year];
            $class = '';
            if ($info !== '{}' && preg_match('/"(?:Class|class)"\s*:\s*"([^"]*)"/', (string) $info, $m)) {
                $class = $m[1];
            }
            $rows[] = [$drivers ? explode("\x1f", $drivers) : [], $num === null ? null : (int) $num, strtoupper((string) $pos), (string) $team, $class];
        }
        if ($cur !== null) {
            yield [$cur, $rows];
        }
    };

    $R = [];      // driver => rating
    $N = [];      // driver => rated sessions
    $peak = [];
    $hist = [];   // driver => [year => rating]
    $rated = 0;
    foreach ($sessionRows() as [[$sid, $champ, $kind, $year], $rows]) {
        if (count($rows) < 2) {
            continue;
        }
        $cc = $champCfg[$champ] ?? $default;
        $base = (float) ($cc['base'] ?? $default['base']);
        $mode = (string) ($cc['mode'] ?? $default['mode']);
        $sw = (float) ($weights[$kind] ?? 0) * (float) ($cc['weight'] ?? 1);
        if ($sw <= 0) {
            continue;
        }
        // crews only partly known (old rallies: co-drivers listed on the podium only) would rate the
        // co-drivers on their good days only: then only the first member (the driver) is rated
        $crews = count(array_filter($rows, fn($r) => count($r[0]) > 1));
        $partialCrews = $crews > 0 && $crews < 0.8 * count($rows);
        // cars of the session, grouped by class
        $groups = [];
        foreach ($rows as [$members, $num, $pos, $team, $class]) {
            if ($partialCrews) {
                $members = array_slice($members, 0, 1);
            }
            if (!$members || in_array($pos, ['DNS', 'DNQ', 'DNPQ', 'WIT', 'WD', 'EXC', 'DSQ'], true)) {
                continue; // did not take part (or excluded): no comparison
            }
            [, $offset] = msdb_class_weight($cfg, $class);
            foreach ($members as $d) {
                $R[$d] ??= $base + $offset;
                $N[$d] ??= 0;
            }
            $rating = array_sum(array_map(fn($d) => $R[$d], $members)) / count($members);
            $groups[$class][] = ['m' => $members, 'r' => $rating, 'n' => $num, 'team' => $team, 's' => 0.0, 'w' => 0.0];
        }
        $any = false;
        foreach ($groups as $cls => &$cars) {
            [$classW] = msdb_class_weight($cfg, (string) $cls);
            usort($cars, fn($a, $b) => [$a['n'] === null, $a['n']] <=> [$b['n'] === null, $b['n']]);
            $fin = array_values(array_filter(array_keys($cars), fn($i) => $cars[$i]['n'] !== null));
            $dnf = array_values(array_filter(array_keys($cars), fn($i) => $cars[$i]['n'] === null));
            $pairs = []; // [winner index, loser index, weight]
            if ($mode === 'teammate') {
                $byTeam = [];
                foreach (array_keys($cars) as $i) {
                    if ($cars[$i]['team'] !== '') {
                        $byTeam[$cars[$i]['team']][] = $i;
                    }
                }
                foreach ($byTeam as $idx) {
                    for ($a = 0; $a < count($idx); $a++) {
                        for ($b = $a + 1; $b < count($idx); $b++) {
                            [$i, $j] = [$idx[$a], $idx[$b]]; // $i ranked before $j (sorted)
                            if ($cars[$i]['n'] === null) {
                                continue; // two retirements
                            }
                            $pairs[] = [$i, $j, $cars[$j]['n'] === null ? $dnfW : 1.0];
                        }
                    }
                }
            } else {
                $nf = count($fin);
                for ($a = 0; $a < $nf; $a++) {
                    $hi = $mode === 'spec' ? $nf - 1 : min($nf - 1, $a + $W);
                    for ($b = $a + 1; $b <= $hi; $b++) {
                        $pairs[] = [$fin[$a], $fin[$b], 1.0];
                    }
                }
                $last = $mode === 'spec' ? $fin : array_slice($fin, -$W);
                foreach ($dnf as $j) {
                    foreach ($last as $i) {
                        $pairs[] = [$i, $j, $dnfW];
                    }
                }
            }
            foreach ($pairs as [$i, $j, $w]) {
                $e = 1 / (1 + 10 ** (($cars[$j]['r'] - $cars[$i]['r']) / 400));
                $cars[$i]['s'] += $w * (1 - $e);
                $cars[$i]['w'] += $w;
                $cars[$j]['s'] += $w * (0 - (1 - $e));
                $cars[$j]['w'] += $w;
            }
            foreach ($cars as $car) {
                if ($car['w'] <= 0) {
                    continue;
                }
                $any = true;
                $avg = $car['s'] / $car['w'];
                foreach ($car['m'] as $d) {
                    $k = $K * ($N[$d] < $provN ? $provF : 1);
                    $R[$d] += $k * $sw * $classW * $avg;
                    $N[$d]++;
                    if ($N[$d] >= $peakMin && $R[$d] > ($peak[$d] ?? 0)) {
                        $peak[$d] = $R[$d];
                    }
                    $hist[$d][$year] = $R[$d];
                }
            }
        }
        unset($cars);
        if ($any) {
            $rated++;
        }
    }

    $out = [];
    foreach ($R as $d => $r) {
        $out[$d] = [
            'elo' => round($r, 1),
            'peak' => isset($peak[$d]) ? round($peak[$d], 1) : null,
            'sessions' => $N[$d],
            'history' => array_map(fn($v) => (int) round($v), $hist[$d] ?? []),
        ];
    }
    return ['drivers' => $out, 'sessions' => $rated];
}
