<?php
/**
 * Security Middleware for MotorsportDB API
 * Handles input validation, XSS protection, and security checks
 * 
 * @package MotorsportDB\API\Middleware
 */

namespace MotorsportDB\API\Middleware;

class SecurityMiddleware
{
    /**
     * Validate an ID parameter (driver, team or championship).
     *
     * IDs are looked up with prepared statements, so legitimate characters
     * such as apostrophes ("Pato_O'Ward") or dots ("Jr.") are allowed; only
     * path separators, control characters and parent references are refused.
     *
     * @param string $id The ID to validate
     * @return string|null The ID or null if invalid
     */
    public static function validateId(string $id): ?string
    {
        $id = trim($id);
        if ($id === '' || strlen($id) > 200 || !preg_match('//u', $id)) {
            return null;
        }
        if (preg_match('~[/\\\\\x00-\x1F\x7F<>]~u', $id) || str_contains($id, '..')) {
            return null;
        }
        return $id;
    }

    /**
     * Validate a championship ID, which maps to a directory name.
     */
    public static function validateChampionshipId(string $id): ?string
    {
        $id = trim($id);
        return preg_match('/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/', $id) ? $id : null;
    }

    /**
     * Validate search query
     * 
     * @param string $query The search query to validate
     * @return string|null Sanitized query or null if invalid
     */
    public static function validateSearchQuery(string $query): ?string
    {
        $query = trim($query);
        
        // Check length
        if (strlen($query) > 100 || strlen($query) < 1) {
            return null;
        }
        
        if (!preg_match('//u', $query)) {
            return null;
        }

        // Output is JSON-encoded, the query is only used in prepared statements
        return preg_replace('/[\x00-\x1F\x7F<>]/', '', $query);
    }
    
    /**
     * Validate year parameter
     * 
     * @param string $year The year to validate
     * @return int|null Valid year or null if invalid
     */
    public static function validateYear(string $year): ?int
    {
        if (!is_numeric($year)) {
            return null;
        }
        
        $year = (int)$year;
        
        // Allow 0 as "no specific year" - will return null
        if ($year === 0) {
            return null;
        }
        
        // Check reasonable year range (1900-2100)
        if ($year < 1900 || $year > 2100) {
            return null;
        }
        
        return $year;
    }
    
    /**
     * Validate file path to prevent directory traversal
     * 
     * @param string $filePath The file path to validate
     * @param string $baseDir The base directory
     * @return string|null Valid path or null if invalid
     */
    public static function validateFilePath(string $filePath, string $baseDir): ?string
    {
        $realPath = realpath($filePath);
        $realBase = realpath($baseDir);
        
        if ($realPath === false || $realBase === false) {
            return null;
        }
        
        // Ensure the file is within the base directory
        if (!str_starts_with($realPath, $realBase)) {
            return null;
        }
        
        return $realPath;
    }
    
    /**
     * Check rate limiting (fixed window). Uses APCu when available, falls back
     * to a small file in the system temp directory.
     *
     * @param string $identifier Client identifier (IP)
     * @return bool True if request is allowed, false if rate limit exceeded
     */
    public static function checkRateLimit(string $identifier): bool
    {
        if (!RATE_LIMIT_ENABLED) {
            return true;
        }
        $window = intdiv(time(), RATE_LIMIT_WINDOW);
        $key = 'msdb_rl_' . hash('xxh128', $identifier) . '_' . $window;

        if (function_exists('apcu_enabled') && apcu_enabled()) {
            apcu_add($key, 0, RATE_LIMIT_WINDOW * 2);
            $count = apcu_inc($key);
            return $count === false || $count <= RATE_LIMIT_MAX_REQUESTS;
        }

        $file = sys_get_temp_dir() . '/msdb_rl_' . hash('xxh128', $identifier);
        $fh = @fopen($file, 'c+');
        if ($fh === false) {
            return true;
        }
        flock($fh, LOCK_EX);
        [$w, $count] = array_map('intval', explode(':', (string) stream_get_contents($fh)) + [0, 0]);
        $count = $w === $window ? $count + 1 : 1;
        ftruncate($fh, 0);
        rewind($fh);
        fwrite($fh, $window . ':' . $count);
        flock($fh, LOCK_UN);
        fclose($fh);
        return $count <= RATE_LIMIT_MAX_REQUESTS;
    }

    /**
     * Get client identifier for rate limiting.
     *
     * X-Forwarded-For is only trusted when the direct peer is listed in the
     * MSDB_TRUSTED_PROXIES environment variable (comma separated), otherwise
     * anyone could bypass the rate limit by forging the header.
     *
     * @return string Client identifier
     */
    public static function getClientIdentifier(): string
    {
        $remote = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        $trusted = array_filter(array_map('trim', explode(',', (string) getenv('MSDB_TRUSTED_PROXIES'))));
        if ($trusted && in_array($remote, $trusted, true) && !empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
            $hops = array_map('trim', explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']));
            $client = end($hops);
            if (filter_var($client, FILTER_VALIDATE_IP)) {
                return $client;
            }
        }
        return $remote;
    }
}
