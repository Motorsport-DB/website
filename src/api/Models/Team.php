<?php
declare(strict_types=1);

/**
 * Team Model for MotorsportDB API
 *
 * Identity comes from teams/<id>.json, results are rebuilt from races/
 * through the generated database (bin/build.php).
 *
 * @package MotorsportDB\API\Models
 */

namespace MotorsportDB\API\Models;

use MotorsportDB\API\Data\Database;
use MotorsportDB\API\Data\Results;

class Team
{
    /**
     * Get team by ID
     *
     * @param string $teamId Team ID (e.g., "Ferrari")
     * @return array|null Team data or null if not found
     */
    public function getById(string $teamId): ?array
    {
        $row = Database::one('SELECT data, picture FROM teams WHERE id = ?', [$teamId]);
        if ($row === null) {
            return null;
        }
        $data = json_decode($row['data'], true) ?: [];
        $data['seasons'] = Results::forTeam($teamId);
        $data['picture'] = $row['picture'];
        $data['id'] = $teamId;
        // titles of the premier categories and Triple Crown wins
        $data['honours'] = \MotorsportDB\API\Data\Honours::forTeam($teamId);
        return $data;
    }

    /**
     * Get all teams
     *
     * @return array List of team IDs
     */
    public function getAll(): array
    {
        return Database::column('SELECT id FROM teams ORDER BY id');
    }

    /**
     * Search teams by name (server-side fallback, the site searches client-side)
     */
    public function search(string $query, int $limit = 10): array
    {
        $like = '%' . str_replace(['\\', '%', '_', ' '], ['\\\\', '\\%', '\\_', '%'], $query) . '%';
        $rows = Database::all(
            "SELECT id, name, country, picture FROM teams
             WHERE replace(name, '_', ' ') LIKE :q ESCAPE '\\' OR replace(id, '_', ' ') LIKE :q ESCAPE '\\'
             ORDER BY name LIMIT :l",
            [':q' => $like, ':l' => $limit]
        );
        return array_map(fn(array $r) => [
            'id'      => $r['id'],
            'name'    => str_replace('_', ' ', (string) $r['name']),
            'country' => $r['country'],
            'picture' => $r['picture'],
        ], $rows);
    }
}
