<?php
/**
 * Race Model for MotorsportDB API
 * 
 * @package MotorsportDB\API\Models
 */

namespace MotorsportDB\API\Models;

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
        $data['picture'] = $this->getPicturePath($championshipId);
        
        return $data;
    }
    
    /**
     * Get latest year for a championship
     * 
     * @param string $championshipDir Championship directory
     * @return int|null Latest year or null if no years found
     */
    private function getLatestYear(string $championshipDir): ?int
    {
        $files = glob($championshipDir . '*.json');
        $years = [];
        
        foreach ($files as $file) {
            $year = basename($file, '.json');
            if (is_numeric($year)) {
                $years[] = (int)$year;
            }
        }
        
        return empty($years) ? null : max($years);
    }
    
    /**
     * Get all available years for a championship
     * 
     * @param string $championshipId Championship ID
     * @return array Array of available years
     */
    public function getAvailableYears(string $championshipId): array
    {
        $championshipDir = $this->racesDir . $championshipId . '/';
        
        if (!is_dir($championshipDir)) {
            return [];
        }
        
        $files = glob($championshipDir . '*.json');
        $years = [];
        
        foreach ($files as $file) {
            $year = basename($file, '.json');
            if (is_numeric($year)) {
                $years[] = (int)$year;
            }
        }
        
        rsort($years); // Sort descending
        return $years;
    }
    
    /**
     * Get all championships
     * 
     * @return array List of championship IDs
     */
    public function getAllChampionships(): array
    {
        $championships = [];
        $dirs = glob($this->racesDir . '*', GLOB_ONLYDIR);
        
        foreach ($dirs as $dir) {
            $championshipId = basename($dir);
            
            // Skip .git and picture directories
            if ($championshipId !== '.git' && $championshipId !== 'picture') {
                $championships[] = $championshipId;
            }
        }
        
        sort($championships);
        return $championships;
    }
    
    /**
     * Search championships by name
     * 
     * @param string $query Search query
     * @param int $limit Maximum number of results
     * @return array Array of matching championships
     */
    public function search(string $query, int $limit = 10): array
    {
        $query = strtolower($query);
        $results = [];
        
        $dirs = glob($this->racesDir . '*', GLOB_ONLYDIR);
        
        foreach ($dirs as $dir) {
            if (count($results) >= $limit) {
                break;
            }
            
            $championshipId = basename($dir);
            
            // Skip .git and picture directories
            if ($championshipId === '.git' || $championshipId === 'picture') {
                continue;
            }
            
            $name = $this->normalizeString($championshipId);
            
            // Check if query matches
            if ($this->isSimilar($name, $query)) {
                $latestYear = $this->getLatestYear($dir . '/');
                
                if ($latestYear !== null) {
                    $results[] = [
                        'id' => $championshipId,
                        'name' => $this->formatName($championshipId),
                        'latestYear' => $latestYear,
                        'picture' => $this->getPicturePath($championshipId)
                    ];
                }
            }
        }
        
        return $results;
    }
    
    /**
     * Get picture path for a championship
     * 
     * @param string $championshipId Championship ID
     * @return string|null Picture path or null if not found
     */
    private function getPicturePath(string $championshipId): ?string
    {
        $extensions = ['png', 'jpg', 'jpeg', 'webp', 'svg'];
        
        foreach ($extensions as $ext) {
            $picturePath = $this->picturesDir . $championshipId . '.' . $ext;
            if (file_exists($picturePath)) {
                return 'races/picture/' . $championshipId . '.' . $ext;
            }
        }
        
        return null;
    }
    
    /**
     * Normalize string for comparison
     * 
     * @param string $string String to normalize
     * @return string Normalized string
     */
    private function normalizeString(string $string): string
    {
        return strtolower(str_replace(['_', '-'], ' ', $string));
    }
    
    /**
     * Check if text is similar to query
     * 
     * @param string $text Text to check
     * @param string $query Query string
     * @return bool True if similar
     */
    private function isSimilar(string $text, string $query): bool
    {
        // Exact match
        if (strpos($text, $query) !== false) {
            return true;
        }
        
        // Approximate match (70% similarity)
        similar_text($text, $query, $percent);
        return $percent > 70;
    }
    
    /**
     * Format championship name for display
     * 
     * @param string $championshipId Championship ID
     * @return string Formatted name
     */
    private function formatName(string $championshipId): string
    {
        return ucwords(str_replace('_', ' ', $championshipId));
    }
}
