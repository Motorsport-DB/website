<?php
declare(strict_types=1);

namespace MotorsportDB\API\Data;

/**
 * Honours of a driver or a team: world titles of the premier categories
 * (races/titles.json) and wins in the races of the Triple Crown of
 * motorsport (Monaco Grand Prix, 24 Hours of Le Mans, Indianapolis 500).
 */
final class Honours
{
    /** Triple Crown races: event names of the database (overall winner = position 1 of the race). */
    public const CROWN = [
        'monaco' => "e.championship = 'Formula_1' AND e.name = 'Monaco Grand Prix'",
        'lemans' => "e.name IN ('24 Hours of Le Mans', 'Le Mans 24 Hours')",
        'indy'   => "e.name IN ('Indianapolis 500', 'Indianapolis 500 Mile Race')",
    ];

    public static function forDriver(string $id): array
    {
        $crown = [];
        foreach (self::CROWN as $key => $where) {
            $crown[$key] = array_map('intval', Database::column(
                "SELECT DISTINCT e.year FROM entry_drivers ed
                 JOIN entries en ON en.id = ed.entry_id JOIN sessions s ON s.id = en.session_id
                 JOIN events e ON e.id = s.event_id
                 WHERE ed.driver_id = ? AND s.kind = 'race' AND en.pos_num = 1 AND $where ORDER BY e.year",
                [$id]
            ));
        }
        return ['titles' => self::titles($id, 'drivers'), 'crown' => $crown];
    }

    public static function forTeam(string $id): array
    {
        $crown = [];
        foreach (self::CROWN as $key => $where) {
            $crown[$key] = array_map('intval', Database::column(
                "SELECT DISTINCT e.year FROM entries en
                 JOIN sessions s ON s.id = en.session_id JOIN events e ON e.id = s.event_id
                 WHERE en.team = ? AND s.kind = 'race' AND en.pos_num = 1 AND $where ORDER BY e.year",
                [$id]
            ));
        }
        return ['titles' => self::titles($id, 'teams'), 'crown' => $crown];
    }

    /** [{championship, years: [..]}], most titles first. */
    private static function titles(string $id, string $kind): array
    {
        try {
            $rows = Database::all('SELECT championship, year FROM titles WHERE holder = ? AND kind = ? ORDER BY year', [$id, $kind]);
        } catch (\Throwable) {
            return []; // database built before the titles table existed
        }
        $by = [];
        foreach ($rows as $r) {
            $by[$r['championship']][] = (int) $r['year'];
        }
        $out = [];
        foreach ($by as $champ => $years) {
            $out[] = ['championship' => $champ, 'years' => $years];
        }
        usort($out, fn($a, $b) => count($b['years']) <=> count($a['years']));
        return $out;
    }
}
