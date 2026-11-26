<?php
require_once __DIR__ . '/../includes/seo.php';

use MotorsportDB\API\Data\Database;

$letter = seo_asked_letter('/drivers-list');
$rows = [];
$counts = [];
if (seo_db_ready()) {
    foreach (Database::all(
        'SELECT d.id, d.first_name, d.last_name, d.country, s.first_year, s.last_year, s.starts
         FROM drivers d LEFT JOIN driver_stats s ON s.driver_id = d.id'
    ) as $d) {
        $l = seo_letter((string) ($d['last_name'] ?: $d['first_name'] ?: $d['id']));
        $counts[$l] = ($counts[$l] ?? 0) + 1;
        if ($l === $letter) {
            $rows[] = $d;
        }
    }
}
usort($rows, fn($a, $b) => strcoll(($a['last_name'] ?: $a['first_name']) . ' ' . $a['first_name'], ($b['last_name'] ?: $b['first_name']) . ' ' . $b['first_name']));
seo_canonical(seo_letter_path('/drivers-list', $letter));
$pageTitle = "Racing drivers – $letter";
$pageDescription = count($rows) . " racing drivers whose name starts with $letter: careers, results and statistics in MotorsportDB.";
if (!$rows) {
    http_response_code(404);
    $robots = 'noindex, follow';
}
require_once __DIR__ . '/../includes/header.php';
?>
<main class="flex-grow container mx-auto px-4 sm:px-6 py-8">
    <h1 class="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">Drivers – <?= htmlspecialchars($letter) ?></h1>
    <p class="text-gray-600 dark:text-gray-400 mb-6"><?= number_format(array_sum($counts)) ?> drivers in the database, by last name.</p>
    <?= seo_letters_html('/drivers-list', $letter, $counts) ?>
    <ul class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
        <?php foreach ($rows as $d):
            $name = trim(($d['last_name'] ? $d['last_name'] . ', ' : '') . $d['first_name'], ', ') ?: seo_label($d['id']); ?>
        <li><a class="text-blue-600 dark:text-blue-400 hover:underline" href="/driver?id=<?= htmlspecialchars(rawurlencode($d['id'])) ?>"><?= htmlspecialchars($name) ?></a>
            <span class="text-gray-500 dark:text-gray-400 text-xs"><?= htmlspecialchars(implode(' · ', array_filter([seo_label($d['country']), $d['first_year'] ? ($d['first_year'] == $d['last_year'] ? $d['first_year'] : $d['first_year'] . '–' . $d['last_year']) : '']))) ?></span></li>
        <?php endforeach; ?>
    </ul>
</main>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>
