<?php
declare(strict_types=1);

/**
 * MotorsportDB - Card Generator Utility
 * Random cards and global statistics for the homepage, served from the
 * generated database and cached in APCu (or var/cards.json).
 */

namespace MotorsportDB\API\Utils;

use MotorsportDB\API\Data\Database;

class CardGenerator
{
    private string $cacheFile;
    private int $cacheDuration;

    public function __construct(?string $rootPath = null)
    {
        $rootPath ??= dirname(__DIR__, 3);
        $this->cacheFile = Database::varDir() . '/cards.json';
        $config = is_file($rootPath . '/config.json')
            ? json_decode((string) file_get_contents($rootPath . '/config.json'), true)
            : null;
        $this->cacheDuration = max(10, (int) ($config['REFRESH_TIME_PROPOSAL'][0] ?? 120));
    }

    /**
     * Get cards data (from cache or regenerate)
     */
    public function getCards(): array
    {
        $key = 'msdb_cards_' . @filemtime(Database::path());
        if (function_exists('apcu_fetch')) {
            $data = apcu_fetch($key, $ok);
            if ($ok) {
                return $data;
            }
        } elseif (is_file($this->cacheFile) && time() - (int) filemtime($this->cacheFile) < $this->cacheDuration) {
            $data = json_decode((string) file_get_contents($this->cacheFile), true);
            if (is_array($data)) {
                return $data;
            }
        }

        $data = $this->generateCards();
        if (function_exists('apcu_store')) {
            apcu_store($key, $data, $this->cacheDuration);
        } else {
            @file_put_contents($this->cacheFile, json_encode($data), LOCK_EX);
        }
        return $data;
    }

    private function generateCards(): array
    {
        $statistics = [
            'numbers_of_drivers'      => (int) Database::one('SELECT count(*) n FROM drivers')['n'],
            'numbers_of_teams'        => (int) Database::one('SELECT count(*) n FROM teams')['n'],
            'numbers_of_championship' => (int) Database::one('SELECT count(*) n FROM championships')['n'],
            'numbers_of_races'        => (int) Database::one("SELECT count(*) n FROM sessions WHERE kind IN ('race','sprint')")['n'],
        ];

        $cards = [];
        // Drivers with a picture and some results make better cards.
        foreach (Database::all(
            'SELECT d.id, d.first_name, d.last_name, d.picture FROM drivers d
             JOIN driver_stats s ON s.driver_id = d.id
             WHERE d.picture IS NOT NULL ORDER BY random() LIMIT 4'
        ) as $d) {
            [$first, $last] = array_pad(explode('_', $d['id'], 2), 2, '');
            $first = $d['first_name'] ?: $first;
            $last  = $d['last_name'] ?: str_replace('_', ' ', $last);
            $cards[] = [
                'type'      => 'driver',
                'name'      => trim("$first $last"),
                'firstName' => $first,
                'lastName'  => $last,
                'image'     => '/' . $d['picture'],
                'url'       => '/driver?id=' . rawurlencode($d['id']),
            ];
        }
        foreach (Database::all(
            'SELECT t.id, t.name, t.picture FROM teams t JOIN team_stats s ON s.team_id = t.id
             WHERE t.picture IS NOT NULL ORDER BY random() LIMIT 2'
        ) as $t) {
            $cards[] = [
                'type'  => 'team',
                'name'  => str_replace('_', ' ', (string) $t['name']),
                'image' => '/' . $t['picture'],
                'url'   => '/team?id=' . rawurlencode($t['id']),
            ];
        }
        foreach (Database::all(
            'SELECT ev.championship AS id, ev.year, c.picture FROM events ev
             JOIN championships c ON c.id = ev.championship
             GROUP BY ev.championship, ev.year ORDER BY random() LIMIT 2'
        ) as $c) {
            $cards[] = [
                'type'  => 'championship',
                'name'  => str_replace('_', ' ', $c['id']),
                'year'  => $c['year'],
                'image' => $c['picture'] ? '/' . $c['picture'] : null,
                'url'   => '/race?id=' . rawurlencode($c['id']) . '&year=' . rawurlencode((string) $c['year']),
            ];
        }

        return [
            'cards'        => $cards,
            'statistics'   => $statistics,
            'generated_at' => date('Y-m-d H:i:s'),
        ];
    }
}
