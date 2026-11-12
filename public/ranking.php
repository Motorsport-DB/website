<?php
$pageTitle = 'Driver Ranking - ELO of every driver';
$pageDescription = 'ELO ranking of every driver and rider: active drivers by current rating, all-time ranking by peak rating, filtered by discipline.';
require_once __DIR__ . '/../includes/header.php';
?>

<main class="flex-grow container mx-auto px-4 sm:px-6 py-6 sm:py-8">
    <section class="text-center mb-6">
        <h1 class="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-100 mb-2">🏆 Driver Ranking</h1>
        <p class="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            An ELO rating built from every race of the database: beating strong drivers counts more than beating weak ones.
            Different cars are only compared with the teammate, similar cars with the drivers ranked around, identical cars with the whole field.
        </p>
    </section>

    <details class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4 text-sm text-gray-700 dark:text-gray-300">
        <summary class="cursor-pointer font-semibold text-gray-900 dark:text-gray-100">How the rating works</summary>
        <ul class="list-disc list-inside space-y-1 mt-3">
            <li>Every race, sprint and qualifying session of the database is replayed in chronological order.
                A driver gains points when he finishes ahead of a driver he is compared with, and loses points when behind:
                beating a highly rated driver brings more than beating a rookie (ELO, as in chess).</li>
            <li><strong>Different cars</strong> (Formula 1, Grand Prix motorcycles): compared with the teammate only.
                <strong>Similar cars</strong> (endurance, rally, Formula E…): with the 4 cars ranked just above and the 4 just below.
                <strong>Identical cars</strong> (F2, F3, F1 Academy…): with the whole field.</li>
            <li>Endurance: cars are only compared within their class, and the crew shares the result of the car.
                The lower classes (LMP2, GT, Am) weigh less.</li>
            <li>A race counts fully, a sprint 60 %, a qualifying session 10 %. A retirement counts as a defeat with half the weight.</li>
            <li>A newcomer starts at the level of his championship (Formula 1 higher than Formula 4), then only his results matter.</li>
            <li><strong>Active drivers</strong>: raced this season or the last one, ranked by current rating.
                <strong>All time</strong>: ranked by the best rating reached in the career. Every driver is rated from the first race, but only ranked after 50 races (sprints included, qualifying sessions not counted): a few good results are not a career.</li>
            <li>The ranking is recomputed every time the database is updated. Eras that never met are hard to compare: the all-time ranking is indicative.</li>
        </ul>
    </details>

    <section class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-4">
        <div class="flex flex-wrap gap-2 items-center">
            <div class="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600" role="tablist">
                <button type="button" data-tab="active" class="ranking-tab px-4 py-2 text-sm font-medium">Active drivers</button>
                <button type="button" data-tab="all" class="ranking-tab px-4 py-2 text-sm font-medium">All time</button>
            </div>
            <select id="ranking-discipline" class="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm">
                <option value="">Every discipline</option>
                <option value="circuit">Circuit (single-seaters, endurance, touring)</option>
                <option value="bike">Motorcycles</option>
                <option value="rally">Rally</option>
                <option value="karting">Karting</option>
            </select>
            <input id="ranking-search" type="search" placeholder="Find a driver…" autocomplete="off"
                class="flex-1 min-w-[10rem] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm">
        </div>
        <p id="ranking-note" class="mt-2 text-xs text-gray-500 dark:text-gray-400"></p>
    </section>

    <section class="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto">
        <table class="w-full text-sm">
            <thead class="bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs uppercase">
                <tr>
                    <th class="px-3 py-2 text-right w-14">#</th>
                    <th class="px-3 py-2 text-left">Driver</th>
                    <th class="px-3 py-2 text-right" id="ranking-col-main">ELO</th>
                    <th class="px-3 py-2 text-right hidden sm:table-cell" id="ranking-col-other">Peak</th>
                    <th class="px-3 py-2 text-right hidden md:table-cell">Seasons</th>
                </tr>
            </thead>
            <tbody id="ranking-body" class="divide-y divide-gray-100 dark:divide-gray-700"></tbody>
        </table>
        <div class="p-4 text-center">
            <button type="button" id="ranking-more" class="hidden px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700">Show more</button>
        </div>
    </section>
</main>

<script type="module" src="<?= asset('js/pages/RankingPage.js') ?>"></script>
<script type="module">
  import { themeService } from '/assets/js/services/ThemeService.js';
  themeService.initToggleButton();
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
