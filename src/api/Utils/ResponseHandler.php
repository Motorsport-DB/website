<?php
/**
 * Response Handler for MotorsportDB API
 * Provides consistent JSON responses
 * 
 * @package MotorsportDB\API\Utils
 */

namespace MotorsportDB\API\Utils;

class ResponseHandler
{
    /**
     * Send success response
     * 
     * @param mixed $data The data to return
     * @param int $statusCode HTTP status code (default: 200)
     * @return never
     */
    public static function success($data, int $statusCode = 200): never
    {
        http_response_code($statusCode);
        echo json_encode([
            'success' => true,
            'data' => $data,
            'timestamp' => time()
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
    
    /**
     * Send error response
     * 
     * @param string $message Error message
     * @param int $statusCode HTTP status code (default: 400)
     * @param string|null $errorCode Optional error code
     * @return never
     */
    public static function error(string $message, int $statusCode = 400, ?string $errorCode = null): never
    {
        http_response_code($statusCode);
        
        $response = [
            'success' => false,
            'error' => [
                'message' => $message,
                'code' => $errorCode ?? 'ERROR_' . $statusCode
            ],
            'timestamp' => time()
        ];
        
        echo json_encode($response, JSON_UNESCAPED_UNICODE);
        exit;
    }
    
    /**
     * Send not found response
     * 
     * @param string $resource Resource type (driver, team, race, etc.)
     * @return never
     */
    public static function notFound(string $resource = 'Resource'): never
    {
        self::error("$resource not found", 404, 'NOT_FOUND');
    }
    
    /**
     * Send invalid request response
     * 
     * @param string $message Error message
     * @return never
     */
    public static function badRequest(string $message = 'Invalid request'): never
    {
        self::error($message, 400, 'BAD_REQUEST');
    }
    
    /**
     * Send unauthorized response
     * 
     * @param string $message Error message
     * @return never
     */
    public static function unauthorized(string $message = 'Unauthorized access'): never
    {
        self::error($message, 401, 'UNAUTHORIZED');
    }
    
    /**
     * Send rate limit exceeded response
     * 
     * @return never
     */
    public static function rateLimitExceeded(): never
    {
        self::error('Rate limit exceeded. Please try again later.', 429, 'RATE_LIMIT_EXCEEDED');
    }
    
    /**
     * Send server error response
     * 
     * @param string $message Error message (default for production)
     * @return never
     */
    public static function serverError(string $message = 'Internal server error'): never
    {
        // In production, don't expose internal error details
        if (!DEBUG_MODE) {
            $message = 'An internal error occurred. Please try again later.';
        }
        
        self::error($message, 500, 'INTERNAL_ERROR');
    }
}
