<?php
declare(strict_types=1);

// Classic driverdle (wordle-like): the client needs the last name to colour
// the letters, so the daily answer is returned here by design.
require_once __DIR__ . '/helpers.php';

$id = dailyDriverId('classic');
$row = $id !== null ? driverRow($id) : null;
if ($row === null) {
    jsonOut(['error' => 'No drivers found'], 404);
}
[$first, $last] = driverNames($row);
jsonOut([
    'date'      => date('Y-m-d'),
    'firstname' => $first,
    'lastname'  => $last,
    'raw'       => $row['id'],
]);
