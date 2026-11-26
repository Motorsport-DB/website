<?php
require_once __DIR__ . '/../includes/seo.php';

use MotorsportDB\API\Data\Database;

$champs = seo_db_ready() ? Database::all('SELECT id, picture, first_year, last_year, years FROM championships') : [];
usort($champs, fn($a, $b) => strcoll(seo_label($a['id']), seo_label($b['id'])));
seo_canonical('/championships');
$pageTitle = 'Championships and seasons';
$pageDescription = count($champs) . ' motorsport championships – Formula 1, endurance, rally, single-seaters… – with the results of every season in MotorsportDB.';
require_once __DIR__ . '/../includes/header.php';
?>
<main class="flex-grow container mx-auto px-4 sm:px-6 py-8">
    <h1 class="text-3xl font-extrabold text-gray-900 dark:text-white mb-6">Championships</h1>
    <div class="space-y-4">
        <?php foreach ($champs as $c):
            $years = array_reverse(json_decode((string) $c['years'], true) ?: []); ?>
        <section class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 class="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
                <?php if ($c['picture']): ?><img src="/<?= htmlspecialchars(ltrim($c['picture'], '/')) ?>" alt="" loading="lazy" class="h-8 w-24 object-contain"><?php endif; ?>
                <?= htmlspecialchars(seo_label($c['id'])) ?>
                <span class="text-sm font-normal text-gray-500"><?= htmlspecialchars($c['first_year'] == $c['last_year'] ? (string) $c['first_year'] : $c['first_year'] . '–' . $c['last_year']) ?></span>
            </h2>
            <p class="text-sm" style="line-height:1.9">
                <?= implode(' · ', array_map(fn($y) => '<a class="text-blue-600 dark:text-blue-400 hover:underline" href="/race?id=' . htmlspecialchars(rawurlencode($c['id'])) . '&amp;year=' . htmlspecialchars(rawurlencode((string) $y)) . '">' . htmlspecialchars((string) $y) . '</a>', $years)) ?>
            </p>
        </section>
        <?php endforeach; ?>
    </div>
</main>
<?php require_once __DIR__ . '/../includes/footer.php'; ?>
