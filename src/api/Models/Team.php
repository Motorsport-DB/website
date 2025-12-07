<?php
/**
 * Team Model for MotorsportDB API
 * 
 * @package MotorsportDB\API\Models
 */

namespace MotorsportDB\API\Models;

class Team
{
    private string $teamsDir;
    private string $picturesDir;
    
    public function __construct()
    {
        $this->teamsDir = TEAMS_DIR;
        $this->picturesDir = TEAMS_DIR . 'picture/';
    }
    
    /**
     * Get team by ID
     * 
     * @param string $teamId Team ID (e.g., "Ferrari")
     * @return array|null Team data or null if not found
     */
    public function getById(string $teamId): ?array
    {
        $teamFile = $this->teamsDir . $teamId . '.json';
        
        // Validate file path
        if (!file_exists($teamFile)) {
            return null;
        }
        
        $realPath = realpath($teamFile);
        if (!$realPath || !str_starts_with($realPath, realpath($this->teamsDir))) {
            return null;
        }
        
        // Read and decode JSON
        $content = file_get_contents($teamFile);
        if ($content === false) {
            return null;
        }
        
        $data = json_decode($content, true);
        if ($data === null) {
            return null;
        }
        
        // Add picture path
        $data['picture'] = $this->getPicturePath($teamId);
        $data['id'] = $teamId;
        
        return $data;
    }
    
    /**
     * Get picture path for a team
     * 
     * @param string $teamId Team ID
     * @return string|null Picture path or null if not found
     */
    private function getPicturePath(string $teamId): ?string
    {
        $extensions = ['png', 'jpg', 'jpeg', 'webp', 'svg'];
        
        foreach ($extensions as $ext) {
            $picturePath = $this->picturesDir . $teamId . '.' . $ext;
            if (file_exists($picturePath)) {
                return 'teams/picture/' . $teamId . '.' . $ext;
            }
        }
        
        return null;
    }
    
    /**
     * Get all teams
     * 
     * @return array List of team IDs
     */
    public function getAll(): array
    {
        $teams = [];
        $files = glob($this->teamsDir . '*.json');
        
        foreach ($files as $file) {
            $teamId = basename($file, '.json');
            $teams[] = $teamId;
        }
        
        sort($teams);
        return $teams;
    }
    
    /**
     * Search teams by name
     * 
     * @param string $query Search query
     * @param int $limit Maximum number of results
     * @return array Array of matching teams
     */
    public function search(string $query, int $limit = 10): array
    {
        $query = strtolower($query);
        $results = [];
        
        $files = glob($this->teamsDir . '*.json');
        
        foreach ($files as $file) {
            if (count($results) >= $limit) {
                break;
            }
            
            $teamId = basename($file, '.json');
            $name = $this->normalizeString($teamId);
            
            // Check if query matches
            if ($this->isSimilar($name, $query)) {
                $team = $this->getById($teamId);
                if ($team) {
                    $results[] = [
                        'id' => $teamId,
                        'name' => $team['name'] ?? $this->formatName($teamId),
                        'country' => $team['country'] ?? null,
                        'picture' => $team['picture']
                    ];
                }
            }
        }
        
        return $results;
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
     * Format team name for display
     * 
     * @param string $teamId Team ID
     * @return string Formatted name
     */
    private function formatName(string $teamId): string
    {
        return ucwords(str_replace('_', ' ', $teamId));
    }
}
