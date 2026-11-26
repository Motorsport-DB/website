<?php
require_once __DIR__ . '/../includes/seo.php';

use MotorsportDB\API\Data\Database;

$letter = seo_asked_letter('/teams-list');
$rows = [];
$counts = [];
if (seo_db_ready()) {
    foreach (Database::all(
        'SELECT t.id, t.name, t.country, s.first_year, s.last_year FROM teams t LEFT JOIN team_stats s ON s.team_id = t.id'
    ) as $t) {
        $l = seo_letter((string) ($t['name'] ?: $t['id']));
        $counts[$l] = ($counts[$l] ?? 0) + 1;
        if ($l === $letter) {
            $rows[] = $t;
        }
    }
}
usort($rows, fn($a, $b) => strcoll((string) ($a['name'] ?: $a['id']), (string) ($b['name'] ?: $b['id'])));
seo_canonical(seo_letter_path('/teams-list', $letter));
$pageTitle = "Racing teams – $letter";
$pageDescription = count($rows) . " racing teams whose name starts with $letter: history, drivers and results in MotorsportDB.";
if (!$rows) {
    http_response_code(404);
    $robots = 'noindex, follow';
}
require_once __DIR__ . '/../includes/header.php';
?>
<main class="flex-grow container mx-auto px-4 sm:px-6 py-8">
    <h1 class="text-3xl font-extrabold text-gray-900 dark:text-white mb-2">Teams – <?= htmlspecialchars($letter) ?></h1>
    <p class="text-gray-600 dark:text-gray-400 mb-6"><?= number_format(array_sum($counts)) ?> teams and entrants in the database.</p>
    <?= seo_letters_html('/teams-list', $letter, $counts) ?>
    <ul class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
        <?php foreach ($rows as $t): ?>
        <li><a class="text-blue-600 dark:text-blue-400 hover:underline" href="/team?id=<?= htmlspecialchars(rawurlencode($t['id'])) ?>"><?= htmlspecialchars($t['name'] ?: seo_label($t['id'])) ?></a>
            <span class="text-gray-500 dark:text-gray-400 text-xs"><?= htmlspecialchars(implode(' · ', array_filter([seo_label($t['country']), $t['first_year'] ? ($t['first_year'] == $t['last_year'] ? $t['first_year'] : $t['first_year'] . '–' . $t['last_year']) : '']))) ?></span></li>
        <?php endforeach; ?>
    </ul>
</main>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>
