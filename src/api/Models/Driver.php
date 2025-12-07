<?php
/**
 * Driver Model for MotorsportDB API
 * 
 * @package MotorsportDB\API\Models
 */

namespace MotorsportDB\API\Models;

class Driver
{
    private string $driversDir;
    private string $picturesDir;
    
    public function __construct()
    {
        $this->driversDir = DRIVERS_DIR;
        $this->picturesDir = DRIVERS_DIR . 'picture/';
    }
    
    /**
     * Get driver by ID
     * 
     * @param string $driverId Driver ID (e.g., "Lewis_Hamilton")
     * @return array|null Driver data or null if not found
     */
    public function getById(string $driverId): ?array
    {
        $driverFile = $this->driversDir . $driverId . '.json';
        
        // Validate file path
        if (!file_exists($driverFile)) {
            return null;
        }
        
        $realPath = realpath($driverFile);
        if (!$realPath || !str_starts_with($realPath, realpath($this->driversDir))) {
            return null;
        }
        
        // Read and decode JSON
        $content = file_get_contents($driverFile);
        if ($content === false) {
            return null;
        }
        
        $data = json_decode($content, true);
        if ($data === null) {
            return null;
        }
        
        // Add picture path
        $data['picture'] = $this->getPicturePath($driverId);
        $data['id'] = $driverId;
        
        return $data;
    }
    
    /**
     * Get picture path for a driver
     * 
     * @param string $driverId Driver ID
     * @return string|null Picture path or null if not found
     */
    private function getPicturePath(string $driverId): ?string
    {
        $extensions = ['png', 'jpg', 'jpeg', 'webp'];
        
        foreach ($extensions as $ext) {
            $picturePath = $this->picturesDir . $driverId . '.' . $ext;
            if (file_exists($picturePath)) {
                return 'drivers/picture/' . $driverId . '.' . $ext;
            }
        }
        
        return null;
    }
    
    /**
     * Get all drivers
     * 
     * @return array List of driver IDs
     */
    public function getAll(): array
    {
        $drivers = [];
        $files = glob($this->driversDir . '*.json');
        
        foreach ($files as $file) {
            $driverId = basename($file, '.json');
            $drivers[] = $driverId;
        }
        
        sort($drivers);
        return $drivers;
    }
    
    /**
     * Search drivers by name
     * 
     * @param string $query Search query
     * @param int $limit Maximum number of results
     * @return array Array of matching drivers
     */
    public function search(string $query, int $limit = 10): array
    {
        $query = strtolower($query);
        $results = [];
        
        $files = glob($this->driversDir . '*.json');
        
        foreach ($files as $file) {
            if (count($results) >= $limit) {
                break;
            }
            
            $driverId = basename($file, '.json');
            $name = $this->normalizeString($driverId);
            
            // Check if query matches
            if ($this->isSimilar($name, $query)) {
                $driver = $this->getById($driverId);
                if ($driver) {
                    $results[] = [
                        'id' => $driverId,
                        'name' => $this->formatName($driverId),
                        'firstName' => $driver['firstName'] ?? '',
                        'lastName' => $driver['lastName'] ?? '',
                        'country' => $driver['country'] ?? null,
                        'picture' => $driver['picture']
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
     * Format driver name for display
     * 
     * @param string $driverId Driver ID
     * @return string Formatted name
     */
    private function formatName(string $driverId): string
    {
        return ucwords(str_replace('_', ' ', $driverId));
    }
}
