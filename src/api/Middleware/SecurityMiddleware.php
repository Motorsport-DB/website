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
     * Validate and sanitize ID parameter
     * 
     * @param string $id The ID to validate
     * @return string|null Sanitized ID or null if invalid
     */
    public static function validateId(string $id): ?string
    {
        // Remove any whitespace
        $id = trim($id);
        
        // Check for invalid characters (path traversal, code injection, etc.)
        if (preg_match('/[\/\.\~\`\$<>\|\\\;\(\)\{\}\[\]\'\"]/', $id)) {
            return null;
        }
        
        // Check length
        if (strlen($id) > 255 || strlen($id) < 1) {
            return null;
        }
        
        // Sanitize the ID
        return htmlspecialchars($id, ENT_QUOTES, 'UTF-8');
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
        
        // Remove potentially dangerous characters
        $query = preg_replace('/[<>]/', '', $query);
        
        return htmlspecialchars($query, ENT_QUOTES, 'UTF-8');
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
     * Check rate limiting
     * 
     * @param string $identifier Client identifier (IP, user ID, etc.)
     * @return bool True if request is allowed, false if rate limit exceeded
     */
    public static function checkRateLimit(string $identifier): bool
    {
        if (!RATE_LIMIT_ENABLED) {
            return true;
        }
        
        // Simple file-based rate limiting (consider using Redis/Memcached in production)
        $cacheFile = sys_get_temp_dir() . '/motorsportdb_rate_' . md5($identifier) . '.txt';
        
        if (!file_exists($cacheFile)) {
            file_put_contents($cacheFile, '1:' . time());
            return true;
        }
        
        $data = explode(':', file_get_contents($cacheFile));
        $count = (int)($data[0] ?? 0);
        $timestamp = (int)($data[1] ?? 0);
        
        // Reset if window has passed
        if (time() - $timestamp > RATE_LIMIT_WINDOW) {
            file_put_contents($cacheFile, '1:' . time());
            return true;
        }
        
        // Check if limit exceeded
        if ($count >= RATE_LIMIT_MAX_REQUESTS) {
            return false;
        }
        
        // Increment counter
        file_put_contents($cacheFile, ($count + 1) . ':' . $timestamp);
        return true;
    }
    
    /**
     * Get client identifier for rate limiting
     * 
     * @return string Client identifier
     */
    public static function getClientIdentifier(): string
    {
        // Use X-Forwarded-For if behind a proxy, otherwise use REMOTE_ADDR
        $ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'unknown';
        
        // Take only the first IP if there are multiple
        if (strpos($ip, ',') !== false) {
            $ip = explode(',', $ip)[0];
        }
        
        return trim($ip);
    }
}
