<?php
declare(strict_types=1);

require_once __DIR__ . '/common.php';

use MotorsportDB\API\Data\Database;

$result = [];
foreach (Database::all('SELECT id, years FROM championships ORDER BY id') as $row) {
    $years = json_decode($row['years'], true) ?: [];
    if ($years) {
        $result[$row['id']] = $years;
    }
}
gwOut(['success' => (bool) $result, 'championships' => $result]);
