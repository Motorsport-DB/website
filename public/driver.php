<?php
require_once __DIR__ . '/../includes/seo.php';
$seo = seo_driver_page((string) ($_GET['id'] ?? ''));
require_once __DIR__ . '/../includes/header.php';
?>

<main class="flex-grow container mx-auto px-6 py-8">
    <!-- Driver Information Section -->
    <section class="mb-10">
        <div class="flex justify-between items-center mb-6">
            <p class="text-3xl font-extrabold text-gray-900 dark:text-white mb-4">Driver Profile</p>
        </div>
        
        <div class="flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0 md:space-x-8">
            <div class="flex flex-col sm:flex-row items-center space-x-6">
                <div class="relative flex-shrink-0">
                <span id="driver-rank-badge" class="hidden absolute -top-1 -right-1 z-10 px-2 py-1 rounded-full bg-yellow-400 text-gray-900 text-sm font-extrabold shadow ring-2 ring-white dark:ring-gray-900" title="World rank of the active drivers (rating)"></span>
                <div class="w-48 h-48 rounded-full border-4 border-blue-600 dark:border-blue-400 overflow-hidden flex-shrink-0">
                    <img id="driver-picture" src="/drivers/picture/default.png" alt="Driver Picture"
                        class="w-full h-full object-cover">
                </div>
                </div>
                <p id="driver-picture-credit" class="hidden mt-2 max-w-[12rem] text-[10px] leading-tight text-gray-500 dark:text-gray-400 text-center sm:order-last"></p>
                <div>
                    <h1 id="driver-name" class="text-2xl font-bold text-blue-600 dark:text-blue-400"><?= htmlspecialchars($seo['name'] ?? 'Driver not found') ?></h1>
                    <p id="driver-nickname" class="hidden text-sm italic text-gray-600 dark:text-gray-400"></p>
                    <p id="driver-aliases" class="hidden text-xs text-gray-500 dark:text-gray-400 max-w-sm"></p>
                    <div class="flex flex-col">
                        <img id="driver-country-img" src="/assets/flags/default.png" alt="Driver Country"
                            class="inline-block h-6 w-6 m-2 object-contain">
                        <span id="driver-dob" class="font-semibold text-gray-700 dark:text-gray-300">Date of birth: N/A</span>
                        <span id="driver-dod" class="font-semibold text-gray-700 dark:text-gray-300 hidden">Date of death: N/A</span>
                        <a id="driver-wikidata" href="#" target="_blank" rel="noopener noreferrer" class="hidden mt-1 text-xs text-blue-600 dark:text-blue-400 underline">Wikidata</a>
                    </div>
                </div>
            </div>

            <!-- Driver Stats -->
            <section class="driver-card p-6 mb-10 bg-gray-200 dark:bg-gray-700 rounded-lg shadow-md transition-shadow duration-300 hover:shadow-lg">
                <h3 class="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4 text-center">Career Stats</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <p class="font-semibold text-gray-800 dark:text-gray-300">Total Races:</p>
                        <p id="totalRaces" class="text-2xl font-bold">?</p>
                    </div>
                    <div>
                        <p class="font-semibold text-gray-800 dark:text-gray-300">Wins:</p>
                        <p id="totalWins" class="text-2xl font-bold">?</p>
                    </div>
                    <div>
                        <p class="font-semibold text-gray-800 dark:text-gray-300">Podiums:</p>
                        <p id="totalPodiums" class="text-2xl font-bold">?</p>
                    </div>
                    <div>
                        <p class="font-semibold text-gray-800 dark:text-gray-300">Championships:</p>
                        <p id="totalChampionships" class="text-2xl font-bold">?</p>
                    </div>
                </div>
            </section>
        </div>
    </section>

    <!-- ELO (rating built from every race, see /ranking) -->
    <section id="driver-elo" class="hidden container mx-auto px-6 mt-8">
        <div class="w-full md:w-4/5 mx-auto driver-card bg-gray-200 dark:bg-gray-800 rounded-lg p-4 shadow-md flex flex-col sm:flex-row items-center gap-4">
            <div class="text-center sm:text-left min-w-[12rem]">
                <p class="text-sm font-semibold text-gray-700 dark:text-gray-300">Rating <a href="/ranking.php" class="text-xs text-blue-600 dark:text-blue-400 underline">how it works</a></p>
                <p class="text-sm text-gray-600 dark:text-gray-400"><span id="elo-rating" class="text-lg font-bold text-gray-900 dark:text-gray-100">?</span> now · peak <span id="elo-peak" class="font-semibold">?</span></p>
                <p id="elo-rank-active" class="text-xs text-gray-500 dark:text-gray-400"></p>
                <p id="elo-rank" class="text-xs text-gray-500 dark:text-gray-400"></p>
            </div>
            <div class="flex-1 w-full h-24"><canvas id="eloChart"></canvas></div>
        </div>
    </section>

    <!-- Charts Grid -->
    <div class="container mx-auto px-6 my-12">
        <h2 class="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">Performance Analytics</h2>
        
        <!-- Row 1: Performance Overview -->
        <section class="w-full md:w-4/5 mx-auto mb-8 driver-card bg-gray-200 dark:bg-gray-800 rounded-lg p-6 shadow-md transition-shadow duration-300 hover:shadow-lg">
            <h3 class="text-2xl font-bold text-center mb-6 text-blue-600 dark:text-blue-400">Average Position by Season</h3>
            <div style="height: 400px;">
                <canvas id="performanceChart" aria-label="Driver Performance Overview"></canvas>
            </div>
        </section>

        <!-- Row 2: Results Distribution (mobile: combined, desktop: separate) -->
        <section class="lg:hidden w-full md:w-4/5 mx-auto mb-8 driver-card bg-gray-200 dark:bg-gray-800 rounded-lg p-6 shadow-md transition-shadow duration-300 hover:shadow-lg">
            <h3 class="text-2xl font-bold text-center mb-6 text-blue-600 dark:text-blue-400">Results Distribution</h3>
            <div style="height: 400px;">
                <canvas id="resultsDistributionChartMobile" aria-label="Results Distribution"></canvas>
            </div>
        </section>

        <div class="hidden lg:grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <section class="driver-card bg-gray-200 dark:bg-gray-800 rounded-lg p-6 shadow-md transition-shadow duration-300 hover:shadow-lg">
                <h3 class="text-xl font-bold text-center mb-6 text-blue-600 dark:text-blue-400">Race Results Distribution</h3>
                <div style="height: 350px;">
                    <canvas id="raceDistributionChart" aria-label="Race Results Distribution"></canvas>
                </div>
            </section>

            <section class="driver-card bg-gray-200 dark:bg-gray-800 rounded-lg p-6 shadow-md transition-shadow duration-300 hover:shadow-lg">
                <h3 class="text-xl font-bold text-center mb-6 text-blue-600 dark:text-blue-400">Qualifying Distribution</h3>
                <div style="height: 350px;">
                    <canvas id="qualifyingDistributionChart" aria-label="Qualifying Distribution"></canvas>
                </div>
            </section>
        </div>

        <!-- Row 3: Performance Radar and Top 10 Finish Rate -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <section class="driver-card bg-gray-200 dark:bg-gray-800 rounded-lg p-6 shadow-md transition-shadow duration-300 hover:shadow-lg">
                <h3 class="text-xl font-bold text-center mb-6 text-blue-600 dark:text-blue-400">Performance Radar</h3>
                <div style="height: 350px;">
                    <canvas id="performanceRadarChart" aria-label="Performance Radar"></canvas>
                </div>
            </section>

            <section class="driver-card bg-gray-200 dark:bg-gray-800 rounded-lg p-6 shadow-md transition-shadow duration-300 hover:shadow-lg">
                <h3 class="text-xl font-bold text-center mb-6 text-blue-600 dark:text-blue-400">Top 10 Finish Rate</h3>
                <div style="height: 350px;">
                    <canvas id="finishRateChart" aria-label="Top 10 Finish Rate"></canvas>
                </div>
            </section>
        </div>
    </div>
    <?php if ($seo): ?>
    <!-- Career summary and seasons, rendered by the server (readable without JavaScript) -->
    <section id="seo-summary" class="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Seasons of <?= htmlspecialchars($seo['name']) ?></h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4"><?= htmlspecialchars($seo['desc']) ?></p>
        <?= seo_seasons_html(seo_driver_seasons($seo['id'])) ?>
    </section>
    <?php endif; ?>
</main>

<!-- Other Info Section -->
<div id="otherInfoContainer" class="container mx-auto px-6 py-4" style="display: none;">
    <!-- Dynamic other info content will be inserted here -->
</div>

<!-- All results Section -->
<div id="resultsContainer" class="mt-4">
    <!-- Dynamic content will be inserted here -->
</div>

<!-- Random Cards Section -->
<section id="section_randomCards" class="my-12 flex-grow container mx-auto px-6 py-8"></section>

<script type="module" src="<?= asset('js/pages/DriverPage.js') ?>"></script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
