<?php
/**
 * Race Model for MotorsportDB API
 * 
 * @package MotorsportDB\API\Models
 */

namespace MotorsportDB\API\Models;

use MotorsportDB\API\Data\Database;

class Race
{
    private string $racesDir;
    private string $picturesDir;
    
    public function __construct()
    {
        $this->racesDir = RACES_DIR;
        $this->picturesDir = RACES_DIR . 'picture/';
    }
    
    /**
     * Get race/championship by ID and year
     * 
     * @param string $championshipId Championship ID (e.g., "Formula_1")
     * @param int|string|null $year Year (optional, can be string '0000' for special cases)
     * @return array|null Race data or null if not found
     */
    public function getById(string $championshipId, int|string|null $year = null): ?array
    {
        $championshipDir = $this->racesDir . $championshipId . '/';
        
        if (!is_dir($championshipDir)) {
            return null;
        }
        
        // If year is specified, get that specific year
        if ($year !== null) {
            $raceFile = $championshipDir . $year . '.json';
            
            if (!file_exists($raceFile)) {
                return null;
            }
            
            return $this->loadRaceFile($raceFile, $championshipId, $year);
        }
        
        // Otherwise, get the latest year
        $latestYear = $this->getLatestYear($championshipDir);
        if ($latestYear === null) {
            return null;
        }
        
        $raceFile = $championshipDir . $latestYear . '.json';
        return $this->loadRaceFile($raceFile, $championshipId, $latestYear);
    }
    
    /**
     * Load race file data
     * 
     * @param string $filePath File path
     * @param string $championshipId Championship ID
     * @param int|string $year Year (can be string '0000' for special cases)
     * @return array|null Race data or null if invalid
     */
    private function loadRaceFile(string $filePath, string $championshipId, int|string $year): ?array
    {
        $realPath = realpath($filePath);
        if (!$realPath || !str_starts_with($realPath, realpath($this->racesDir))) {
            return null;
        }
        
        $content = file_get_contents($filePath);
        if ($content === false) {
            return null;
        }
        
        $data = json_decode($content, true);
        if ($data === null) {
            return null;
        }
        
        $data['id'] = $championshipId;
        $data['year'] = $year;
        $data['picture'] = Database::one('SELECT picture FROM championships WHERE id = ?', [$championshipId])['picture'] ?? null;
        
        return $data;
    }
    
    /**
     * Get latest year for a championship
     */
    private function getLatestYear(string $championshipDir): ?string
    {
        $row = Database::one('SELECT last_year FROM championships WHERE id = ?', [basename(rtrim($championshipDir, '/'))]);
        return $row['last_year'] ?? null;
    }

    /**
     * Get all available years for a championship (most recent first)
     *
     * @return list<string>
     */
    public function getAvailableYears(string $championshipId): array
    {
        $row = Database::one('SELECT years FROM championships WHERE id = ?', [$championshipId]);
        $years = $row ? (json_decode($row['years'], true) ?: []) : [];
        $years = array_map('intval', $years);
        rsort($years);
        return $years;
    }

    /**
     * Get all championships
     *
     * @return array List of championship IDs
     */
    public function getAllChampionships(): array
    {
        return Database::column('SELECT id FROM championships ORDER BY id');
    }

    /**
     * Search championships by name (server-side fallback, the site searches client-side)
     */
    public function search(string $query, int $limit = 10): array
    {
        $like = '%' . str_replace(['\\', '%', '_', ' '], ['\\\\', '\\%', '\\_', '%'], $query) . '%';
        $rows = Database::all(
            "SELECT id, picture, last_year FROM championships
             WHERE replace(id, '_', ' ') LIKE :q ESCAPE '\\' ORDER BY id LIMIT :l",
            [':q' => $like, ':l' => $limit]
        );
        return array_map(fn(array $r) => [
            'id'         => $r['id'],
            'name'       => str_replace('_', ' ', $r['id']),
            'latestYear' => $r['last_year'],
            'picture'    => $r['picture'],
        ], $rows);
    }
}
