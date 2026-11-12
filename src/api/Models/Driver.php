<?php
declare(strict_types=1);

/**
 * Driver Model for MotorsportDB API
 *
 * Identity comes from drivers/<id>.json, results are rebuilt from races/
 * through the generated database (bin/build.php).
 *
 * @package MotorsportDB\API\Models
 */

namespace MotorsportDB\API\Models;

use MotorsportDB\API\Data\Database;
use MotorsportDB\API\Data\Results;

class Driver
{
    /**
     * Get driver by ID
     *
     * @param string $driverId Driver ID (e.g., "Lewis_Hamilton")
     * @return array|null Driver data or null if not found
     */
    public function getById(string $driverId): ?array
    {
        $row = Database::one('SELECT data, picture FROM drivers WHERE id = ?', [$driverId]);
        if ($row === null) {
            return null;
        }
        $data = json_decode($row['data'], true) ?: [];
        $data['seasons'] = Results::forDriver($driverId);
        $data['picture'] = $row['picture'];
        $data['id'] = $driverId;
        // ELO (bin/build.php + elo.json): ratings, world ranks, rating at the end of each season
        $elo = Database::one('SELECT elo, peak, sessions, races, rank, rank_active, active, history FROM driver_elo WHERE driver_id = ?', [$driverId]);
        if ($elo !== null) {
            $data['elo'] = [
                'rating' => (float) $elo['elo'], 'peak' => $elo['peak'] !== null ? (float) $elo['peak'] : null,
                'sessions' => (int) $elo['sessions'], 'races' => (int) $elo['races'],
                'minRaces' => (int) (Database::one("SELECT value FROM meta WHERE key = 'elo_min_races'")['value'] ?? 50),
                'rank' => $elo['rank'] !== null ? (int) $elo['rank'] : null,
                'rankActive' => $elo['rank_active'] !== null ? (int) $elo['rank_active'] : null,
                'history' => json_decode((string) $elo['history'], true) ?: [],
            ];
        }
        // titles of the premier categories and Triple Crown wins
        $data['honours'] = \MotorsportDB\API\Data\Honours::forDriver($driverId);
        return $data;
    }

    /**
     * Get all drivers
     *
     * @return array List of driver IDs
     */
    public function getAll(): array
    {
        return Database::column('SELECT id FROM drivers ORDER BY id');
    }

    /**
     * Search drivers by name (server-side fallback, the site searches client-side)
     */
    public function search(string $query, int $limit = 10): array
    {
        $like = '%' . str_replace(['\\', '%', '_', ' '], ['\\\\', '\\%', '\\_', '%'], $query) . '%';
        $rows = Database::all(
            "SELECT id, first_name, last_name, country, picture FROM drivers
             WHERE (first_name || ' ' || last_name) LIKE :q ESCAPE '\\'
                OR replace(id, '_', ' ') LIKE :q ESCAPE '\\'
                OR nickname LIKE :q ESCAPE '\\'
             ORDER BY last_name LIMIT :l",
            [':q' => $like, ':l' => $limit]
        );
        return array_map(fn(array $r) => [
            'id'        => $r['id'],
            'name'      => trim(($r['first_name'] ?? '') . ' ' . ($r['last_name'] ?? '')) ?: str_replace('_', ' ', $r['id']),
            'firstName' => $r['first_name'] ?? '',
            'lastName'  => $r['last_name'] ?? '',
            'country'   => $r['country'],
            'picture'   => $r['picture'],
        ], $rows);
    }
}
