<?php
/**
 * Search Controller for MotorsportDB API
 * Unified search across drivers, teams, and championships
 * 
 * @package MotorsportDB\API\Controllers
 */

namespace MotorsportDB\API\Controllers;

use MotorsportDB\API\Utils\ResponseHandler;
use MotorsportDB\API\Middleware\SecurityMiddleware;

class SearchController
{
    private DriverController $driverController;
    private TeamController $teamController;
    private RaceController $raceController;
    
    public function __construct()
    {
        $this->driverController = new DriverController();
        $this->teamController = new TeamController();
        $this->raceController = new RaceController();
    }
    
    /**
     * Unified search endpoint
     * Endpoint: GET /api/search.php?q=ferrari
     */
    public function search(): void
    {
        if (!isset($_GET['search']) && !isset($_GET['q'])) {
            ResponseHandler::badRequest('Search query is required');
        }
        
        $query = $_GET['search'] ?? $_GET['q'];
        $query = SecurityMiddleware::validateSearchQuery($query);
        
        if ($query === null || strlen($query) < 2) {
            ResponseHandler::success([]);
        }
        
        $limit = isset($_GET['limit']) ? min((int)$_GET['limit'], MAX_SEARCH_RESULTS) : MAX_SEARCH_RESULTS;
        
        // Search across all categories
        $drivers = $this->driverController->searchDrivers($query, $limit);
        $teams = $this->teamController->searchTeams($query, $limit);
        $championships = $this->raceController->searchChampionships($query, $limit);
        
        // Format results
        $results = [];
        
        foreach ($drivers as $driver) {
            $results[] = [
                'type' => 'driver',
                'id' => $driver['id'],
                'name' => $driver['name'],
                'image' => $driver['picture'] ?? 'drivers/picture/default.png',
                'url' => '/driver?id=' . urlencode($driver['id']),
                'metadata' => [
                    'country' => $driver['country'] ?? null
                ]
            ];
        }
        
        foreach ($teams as $team) {
            $results[] = [
                'type' => 'team',
                'id' => $team['id'],
                'name' => $team['name'],
                'image' => $team['picture'] ?? 'teams/picture/default.png',
                'url' => '/team?id=' . urlencode($team['id']),
                'metadata' => [
                    'country' => $team['country'] ?? null
                ]
            ];
        }
        
        foreach ($championships as $championship) {
            // Use 0000 for special championships like GP_Explorer
            $year = $championship['latestYear'];
            if ($year == 0) {
                $year = '0000';
            }
            
            $results[] = [
                'type' => 'championship',
                'id' => $championship['id'],
                'name' => $championship['name'] . ' (' . $year . ')',
                'image' => $championship['picture'] ?? 'races/picture/default.png',
                'url' => '/race?id=' . urlencode($championship['id']) . '&year=' . $year,
                'metadata' => [
                    'latestYear' => $year
                ]
            ];
        }
        
        // Limit total results
        $results = array_slice($results, 0, $limit);
        
        ResponseHandler::success($results);
    }
}
