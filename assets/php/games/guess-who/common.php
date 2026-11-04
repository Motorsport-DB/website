<?php
declare(strict_types=1);

// Shared bootstrap for the guess-who JSON endpoints.
ini_set('display_errors', '0');
error_reporting(E_ALL);
header('Content-Type: application/json; charset=UTF-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

require_once __DIR__ . '/../../../../src/api/autoload.php';

use MotorsportDB\API\Data\Database;

const GUESS_WHO_TTL = 300;          // seconds before an unjoined game expires
const GUESS_WHO_MAX_SESSIONS = 500; // hard cap against disk filling

function gwOut(array $data, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/** Directory holding game sessions, inside the writable var/ directory. */
function gwSessionDir(): string
{
    $dir = Database::varDir() . '/sessions/guess-who';
    if (!is_dir($dir) && !@mkdir($dir, 0770, true) && !is_dir($dir)) {
        gwOut(['success' => false, 'error' => 'Unable to create game session directory'], 500);
    }
    return $dir;
}

/** Session ids are 16 hex chars generated server-side: anything else is refused. */
function gwSessionFile(mixed $id): ?string
{
    if (!is_string($id) || !preg_match('/^[a-f0-9]{16}$/', $id)) {
        return null;
    }
    return gwSessionDir() . '/' . $id . '.json';
}

function gwClearExpired(): void
{
    foreach (glob(gwSessionDir() . '/*.json') ?: [] as $file) {
        if (time() - (int) @filemtime($file) > GUESS_WHO_TTL) {
            @unlink($file);
        }
    }
}
