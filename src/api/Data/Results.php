<?php
declare(strict_types=1);

namespace MotorsportDB\API\Data;

/**
 * Rebuilds the historical "seasons" structure of drivers and teams from the
 * results stored in races/ (single source of truth).
 *
 * Maps are built with stdClass so that json_encode always emits objects,
 * even when keys look like a sequential list (car numbers "0", "1"…).
 *
 * @package MotorsportDB\API\Data
 */
final class Results
{
    private const BASE = 'SELECT ev.year, ev.championship, ev.name AS event, s.name AS session,
            en.car, en.team, en.position, en.points, en.fastest_lap, en.other_info, en.drivers
        FROM entries en
        JOIN sessions s ON s.id = en.session_id
        JOIN events ev ON ev.id = s.event_id';

    /** seasons[year][championship][event][session] = {position, points, team, fastest_lap, other_info} */
    public static function forDriver(string $driverId): \stdClass
    {
        $rows = Database::all(
            self::BASE . ' JOIN entry_drivers ed ON ed.entry_id = en.id
             WHERE ed.driver_id = ?
             ORDER BY ev.year, ev.championship, ev.ord, s.ord',
            [$driverId]
        );
        $seasons = new \stdClass();
        foreach ($rows as $r) {
            $node = self::path($seasons, [$r['year'], $r['championship'], $r['event']]);
            [$position, $info] = self::classResult($r['position'], $r['other_info']);
            $node->{$r['session']} = [
                'position'    => $position,
                'points'      => json_decode($r['points']),
                'team'        => $r['team'],
                'fastest_lap' => $r['fastest_lap'],
                'other_info'  => $info,
            ];
        }
        return $seasons;
    }

    /**
     * Multi-class races (endurance): for a driver or a team the result is the
     * position in the class; the overall position stays in other_info.Overall.
     * @return array{0: string, 1: mixed}
     */
    private static function classResult(string $position, string $otherInfo): array
    {
        $info = json_decode($otherInfo);
        $cp = is_object($info) ? (string) ($info->Class_position ?? '') : '';
        if (isset($info->Class) && ctype_digit($cp) && ctype_digit($position)) {
            $info->Overall = $position;
            return [$cp, $info];
        }
        return [$position, $info];
    }

    /** seasons[year][championship][event][session][car] = {position, points, fastest_lap, drivers, other_info} */
    public static function forTeam(string $teamId): \stdClass
    {
        $rows = Database::all(
            self::BASE . ' WHERE en.team = ? ORDER BY ev.year, ev.championship, ev.ord, s.ord, en.ord',
            [$teamId]
        );
        $seasons = new \stdClass();
        foreach ($rows as $r) {
            $node = self::path($seasons, [$r['year'], $r['championship'], $r['event'], $r['session']]);
            [$position, $info] = self::classResult($r['position'], $r['other_info']);
            $node->{$r['car']} = [
                'position'    => $position,
                'points'      => json_decode($r['points']),
                'fastest_lap' => $r['fastest_lap'],
                'drivers'     => json_decode($r['drivers']),
                'other_info'  => $info,
            ];
        }
        return $seasons;
    }

    private static function path(\stdClass $root, array $keys): \stdClass
    {
        $node = $root;
        foreach ($keys as $k) {
            $node->{$k} ??= new \stdClass();
            $node = $node->{$k};
        }
        return $node;
    }
}
