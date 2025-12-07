<?php
/**
 * Race Controller for MotorsportDB API
 * 
 * @package MotorsportDB\API\Controllers
 */

namespace MotorsportDB\API\Controllers;

use MotorsportDB\API\Models\Race;
use MotorsportDB\API\Utils\ResponseHandler;
use MotorsportDB\API\Middleware\SecurityMiddleware;

class RaceController
{
    private Race $raceModel;
    
    public function __construct()
    {
        $this->raceModel = new Race();
    }
    
    /**
     * Get race/championship by ID
     * Endpoint: GET /api/races.php?id=Formula_1&year=2024
     */
    public function getRace(): void
    {
        if (!isset($_GET['id'])) {
            ResponseHandler::badRequest('Championship ID is required');
        }
        
        $championshipId = SecurityMiddleware::validateId($_GET['id']);
        if ($championshipId === null) {
            ResponseHandler::badRequest('Invalid championship ID');
        }
        
        $year = null;
        if (isset($_GET['year'])) {
            // Special case for GP_Explorer year=0000
            if ($_GET['year'] === '0000') {
                $year = '0000';
            } else {
                $year = SecurityMiddleware::validateYear($_GET['year']);
                if ($year === null) {
                    ResponseHandler::badRequest('Invalid year');
                }
            }
        }
        
        $race = $this->raceModel->getById($championshipId, $year);
        
        if ($race === null) {
            ResponseHandler::notFound('Championship');
        }
        
        ResponseHandler::success([$race]);
    }
    
    /**
     * Get available years for a championship
     * Endpoint: GET /api/races.php?id=Formula_1&action=years
     */
    public function getAvailableYears(): void
    {
        if (!isset($_GET['id'])) {
            ResponseHandler::badRequest('Championship ID is required');
        }
        
        $championshipId = SecurityMiddleware::validateId($_GET['id']);
        if ($championshipId === null) {
            ResponseHandler::badRequest('Invalid championship ID');
        }
        
        $years = $this->raceModel->getAvailableYears($championshipId);
        ResponseHandler::success($years);
    }
    
    /**
     * Search championships
     * Endpoint: GET /api/search.php?q=formula&type=race
     */
    public function searchChampionships(string $query, int $limit = 10): array
    {
        $query = SecurityMiddleware::validateSearchQuery($query);
        if ($query === null) {
            return [];
        }
        
        return $this->raceModel->search($query, $limit);
    }
}
