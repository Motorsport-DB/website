<?php
/**
 * MotorsportDB - Card Generator Utility
 * Generates random cards for homepage with caching
 */

namespace MotorsportDB\API\Utils;

class CardGenerator
{
    private string $rootPath;
    private string $cacheFile;
    private int $cacheDuration;

    public function __construct(string $rootPath = null)
    {
        $this->rootPath = $rootPath ?? realpath(__DIR__ . '/../../../');
        $this->cacheFile = $this->rootPath . '/cards.json';
        
        // Load cache duration from config
        $configFile = $this->rootPath . '/config.json';
        if (file_exists($configFile)) {
            $config = json_decode(file_get_contents($configFile), true);
            $this->cacheDuration = $config['REFRESH_TIME_PROPOSAL'][0] ?? 3600;
        } else {
            $this->cacheDuration = 3600; // 1 hour default
        }
    }

    /**
     * Get cards data (from cache or regenerate)
     */
    public function getCards(): array
    {
        // Check cache
        if ($this->isCacheValid()) {
            return $this->loadCache();
        }

        // Generate new cards
        return $this->generateCards();
    }

    /**
     * Check if cache is still valid
     */
    private function isCacheValid(): bool
    {
        if (!file_exists($this->cacheFile)) {
            return false;
        }

        $data = json_decode(file_get_contents($this->cacheFile), true);
        if (!isset($data['generated_at'])) {
            return false;
        }

        $generatedTimestamp = strtotime($data['generated_at']);
        $currentTimestamp = time();

        return ($currentTimestamp - $generatedTimestamp) < $this->cacheDuration;
    }

    /**
     * Load data from cache
     */
    private function loadCache(): array
    {
        return json_decode(file_get_contents($this->cacheFile), true);
    }

    /**
     * Generate new cards data
     */
    private function generateCards(): array
    {
        $drivers = $this->loadDrivers();
        $teams = $this->loadTeams();
        $racesData = $this->loadRaces();

        $statistics = [
            'numbers_of_drivers' => count($drivers),
            'numbers_of_teams' => count($teams),
            'numbers_of_championship' => count($racesData['championships']),
            'numbers_of_races' => $racesData['totalRaces'],
        ];

        // Generate random cards (8 cards total: mix of drivers, teams, championships)
        $cards = [];
        
        // Add 4 random drivers
        for ($i = 0; $i < 4; $i++) {
            $driver = $this->getRandomElement($drivers);
            if ($driver) {
                $cards[] = $this->formatDriverCard($driver);
            }
        }
        
        // Add 2 random teams
        for ($i = 0; $i < 2; $i++) {
            $team = $this->getRandomElement($teams);
            if ($team) {
                $cards[] = $this->formatTeamCard($team);
            }
        }
        
        // Add 2 random championships
        for ($i = 0; $i < 2; $i++) {
            $championship = $this->getRandomElement($racesData['championships']);
            if ($championship) {
                $cards[] = $this->formatChampionshipCard($championship);
            }
        }

        $response = [
            'cards' => $cards,
            'statistics' => $statistics,
            'generated_at' => date('Y-m-d H:i:s'),
        ];

        // Save to cache
        file_put_contents($this->cacheFile, json_encode($response, JSON_PRETTY_PRINT));

        return $response;
    }

    /**
     * Load all drivers
     */
    private function loadDrivers(): array
    {
        $driversDir = $this->rootPath . '/drivers';
        $files = glob($driversDir . '/*.json');
        $drivers = [];

        foreach ($files as $file) {
            $filename = basename($file, '.json');
            if (strpos($filename, '_') !== false) {
                list($firstName, $lastName) = explode('_', $filename, 2);
                $drivers[] = [
                    'firstName' => $firstName,
                    'lastName' => $lastName,
                    'id' => $filename,
                ];
            }
        }

        return $drivers;
    }

    /**
     * Load all teams
     */
    private function loadTeams(): array
    {
        $teamsDir = $this->rootPath . '/teams';
        $files = glob($teamsDir . '/*.json');
        $teams = [];

        foreach ($files as $file) {
            $filename = basename($file, '.json');
            $teams[] = [
                'name' => $filename,
                'id' => $filename,
            ];
        }

        return $teams;
    }

    /**
     * Load all races/championships
     */
    private function loadRaces(): array
    {
        $racesDir = $this->rootPath . '/races';
        $championships = [];
        $totalRaces = 0;

        $championshipDirs = glob($racesDir . '/*', GLOB_ONLYDIR);

        foreach ($championshipDirs as $championshipDir) {
            $championshipName = basename($championshipDir);
            $yearFiles = glob($championshipDir . '/*.json');

            foreach ($yearFiles as $yearFile) {
                $year = basename($yearFile, '.json');
                $championships[] = [
                    'name' => $championshipName,
                    'year' => $year,
                    'id' => $championshipName,
                ];

                // Count races in this year
                $raceData = json_decode(file_get_contents($yearFile), true);
                if ($raceData && isset($raceData['events'])) {
                    foreach ($raceData['events'] as $event => $sessions) {
                        foreach ($sessions as $session => $sessionData) {
                            if (stripos($session, 'race') !== false) {
                                $totalRaces++;
                            }
                        }
                    }
                }
            }
        }

        return [
            'championships' => $championships,
            'totalRaces' => $totalRaces,
        ];
    }

    /**
     * Format driver card
     */
    private function formatDriverCard(array $driver): array
    {
        $picture = $this->findPicture('drivers/picture', $driver['id']);
        
        return [
            'type' => 'driver',
            'name' => $driver['firstName'] . ' ' . $driver['lastName'],
            'firstName' => $driver['firstName'],
            'lastName' => $driver['lastName'],
            'image' => $picture,
            'url' => '/driver?id=' . urlencode($driver['id']),
        ];
    }

    /**
     * Format team card
     */
    private function formatTeamCard(array $team): array
    {
        $picture = $this->findPicture('teams/picture', $team['id']);
        
        return [
            'type' => 'team',
            'name' => str_replace('_', ' ', $team['name']),
            'image' => $picture,
            'url' => '/team?id=' . urlencode($team['id']),
        ];
    }

    /**
     * Format championship card
     */
    private function formatChampionshipCard(array $championship): array
    {
        $picture = $this->findPicture('races/picture', $championship['id']);
        
        return [
            'type' => 'championship',
            'name' => str_replace('_', ' ', $championship['name']),
            'year' => $championship['year'],
            'image' => $picture,
            'url' => '/race?id=' . urlencode($championship['id']) . '&year=' . urlencode($championship['year']),
        ];
    }

    /**
     * Find picture for entity
     */
    private function findPicture(string $directory, string $baseName): ?string
    {
        $dir = $this->rootPath . '/' . $directory;
        $extensions = ['jpg', 'jpeg', 'png', 'webp', 'svg'];

        foreach ($extensions as $ext) {
            $file = $dir . '/' . $baseName . '.' . $ext;
            if (file_exists($file)) {
                // Return relative path from root
                return '/' . $directory . '/' . $baseName . '.' . $ext;
            }
        }

        return null;
    }

    /**
     * Get random element from array
     */
    private function getRandomElement(array $array)
    {
        if (empty($array)) {
            return null;
        }
        return $array[array_rand($array)];
    }
}
