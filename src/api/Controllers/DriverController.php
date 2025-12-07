<?php
/**
 * Driver Controller for MotorsportDB API
 * 
 * @package MotorsportDB\API\Controllers
 */

namespace MotorsportDB\API\Controllers;

use MotorsportDB\API\Models\Driver;
use MotorsportDB\API\Utils\ResponseHandler;
use MotorsportDB\API\Middleware\SecurityMiddleware;

class DriverController
{
    private Driver $driverModel;
    
    public function __construct()
    {
        $this->driverModel = new Driver();
    }
    
    /**
     * Get driver by ID
     * Endpoint: GET /api/drivers.php?id=Lewis_Hamilton
     */
    public function getDriver(): void
    {
        if (!isset($_GET['id'])) {
            ResponseHandler::badRequest('Driver ID is required');
        }
        
        $driverId = SecurityMiddleware::validateId($_GET['id']);
        if ($driverId === null) {
            ResponseHandler::badRequest('Invalid driver ID');
        }
        
        $driver = $this->driverModel->getById($driverId);
        
        if ($driver === null) {
            ResponseHandler::notFound('Driver');
        }
        
        ResponseHandler::success([$driver]);
    }
    
    /**
     * Get all drivers
     * Endpoint: GET /api/drivers-list.php
     */
    public function getAllDrivers(): void
    {
        $drivers = $this->driverModel->getAll();
        ResponseHandler::success($drivers);
    }
    
    /**
     * Search drivers
     * Endpoint: GET /api/search.php?q=hamilton&type=driver
     */
    public function searchDrivers(string $query, int $limit = 10): array
    {
        $query = SecurityMiddleware::validateSearchQuery($query);
        if ($query === null) {
            return [];
        }
        
        return $this->driverModel->search($query, $limit);
    }
}
