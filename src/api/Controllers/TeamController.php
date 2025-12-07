<?php
/**
 * Team Controller for MotorsportDB API
 * 
 * @package MotorsportDB\API\Controllers
 */

namespace MotorsportDB\API\Controllers;

use MotorsportDB\API\Models\Team;
use MotorsportDB\API\Utils\ResponseHandler;
use MotorsportDB\API\Middleware\SecurityMiddleware;

class TeamController
{
    private Team $teamModel;
    
    public function __construct()
    {
        $this->teamModel = new Team();
    }
    
    /**
     * Get team by ID
     * Endpoint: GET /api/teams.php?id=Ferrari
     */
    public function getTeam(): void
    {
        if (!isset($_GET['id'])) {
            ResponseHandler::badRequest('Team ID is required');
        }
        
        $teamId = SecurityMiddleware::validateId($_GET['id']);
        if ($teamId === null) {
            ResponseHandler::badRequest('Invalid team ID');
        }
        
        $team = $this->teamModel->getById($teamId);
        
        if ($team === null) {
            ResponseHandler::notFound('Team');
        }
        
        ResponseHandler::success([$team]);
    }
    
    /**
     * Get all teams
     * Endpoint: GET /api/teams-list.php
     */
    public function getAllTeams(): void
    {
        $teams = $this->teamModel->getAll();
        ResponseHandler::success($teams);
    }
    
    /**
     * Search teams
     * Endpoint: GET /api/search.php?q=ferrari&type=team
     */
    public function searchTeams(string $query, int $limit = 10): array
    {
        $query = SecurityMiddleware::validateSearchQuery($query);
        if ($query === null) {
            return [];
        }
        
        return $this->teamModel->search($query, $limit);
    }
}
