<?php
$pageTitle = 'Head to Head Comparison';
$pageDescription = 'Compare up to 5 drivers head-to-head with comprehensive statistics, performance analysis, and direct battle results.';
require_once __DIR__ . '/../includes/header.php';
?>

<main class="flex-grow container mx-auto px-4 sm:px-6 py-6 sm:py-8">
    <!-- Page Header -->
    <section class="text-center mb-8 sm:mb-12">
        <h1 class="text-3xl sm:text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">
            🏁 Head to Head Comparison
        </h1>
        <p class="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto px-4">
            Compare up to 5 drivers with comprehensive statistics, performance radar, and detailed race results
        </p>
    </section>

    <!-- Driver Selection Section -->
    <section class="mb-8 sm:mb-12 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-8">
        <h2 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4 sm:mb-6">
            Select Drivers to Compare
        </h2>
        
        <!-- Search Component Container -->
        <div class="mb-4 sm:mb-6">
            <div id="driver-search-container" class="relative">
                <!-- SearchComponent will create the input and dropdown here -->
            </div>
        </div>

        <!-- Selected Drivers -->
        <div id="selected-drivers" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
            <p class="text-gray-500 dark:text-gray-400 col-span-full text-center py-4">No drivers selected</p>
        </div>

        <!-- Comparison Mode and Actions -->
        <div class="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
            <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 flex-1">
                <label class="text-gray-700 dark:text-gray-300 font-semibold text-sm sm:text-base whitespace-nowrap">
                    Comparison Mode:
                </label>
                <select id="comparison-mode" 
                    class="flex-1 sm:flex-initial p-2 sm:p-3 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 text-sm sm:text-base focus:ring-2 focus:ring-blue-500 transition">
                    <option value="all">All Races</option>
                    <option value="common-championships">Common Championships</option>
                    <option value="common-races">Common Races Only</option>
                    <option value="same-team">Same Team Only</option>
                </select>
            </div>
            <button id="compare-btn" 
                disabled
                class="w-full sm:w-auto px-6 sm:px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-bold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-105 disabled:transform-none">
                Compare Drivers
            </button>
        </div>
    </section>

    <!-- Loading Indicator -->
    <div id="loading-indicator" class="hidden mb-8 text-center py-12" role="status">
        <div class="inline-block w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p class="text-gray-600 dark:text-gray-400 text-lg">Loading comparison data...</p>
    </div>

    <!-- Comparison Results (filled by HeadToHeadPage.js) -->
    <div id="comparison-results" class="hidden space-y-8 sm:space-y-12">
        <p id="mode-note" class="text-sm text-gray-600 dark:text-gray-400 text-center"></p>

        <section id="h2h-summary">
            <h2 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6">📊 Side by side</h2>
            <div id="h2h-summary-body" class="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-x-auto"></div>
        </section>

        <section id="h2h-duels">
            <h2 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">⚔️ Direct duels</h2>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">Sessions both drivers took part in: who finished (or qualified) ahead of the other. A classified driver is ahead of a retired one.</p>
            <div id="h2h-duels-body" class="space-y-6"></div>
        </section>

        <section id="h2h-charts">
            <h2 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6">📈 Performance</h2>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 lg:col-span-2" id="rating-history-box">
                    <h3 class="font-bold text-gray-900 dark:text-white mb-1">Rating over the seasons</h3>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">End-of-season <a href="/ranking.php" class="underline">rating</a> of each driver.</p>
                    <div class="relative h-80"><canvas id="rating-history-chart"></canvas></div>
                </div>
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
                    <h3 class="font-bold text-gray-900 dark:text-white mb-1">How the races ended</h3>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">Share of the races of each driver.</p>
                    <div class="relative h-80"><canvas id="finish-types-chart"></canvas></div>
                </div>
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
                    <h3 class="font-bold text-gray-900 dark:text-white mb-1">Profile</h3>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-3">Rates in % of the races.</p>
                    <div class="relative h-80"><canvas id="radar-chart"></canvas></div>
                </div>
            </div>
        </section>

        <section id="h2h-races">
            <h2 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6">🏎️ Race by race</h2>
            <div id="h2h-races-body" class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6"></div>
        </section>
    </div>
</main>

<!-- Head to Head Page Module -->
<script type="module">
    import HeadToHeadPage from '/assets/js/pages/HeadToHeadPage.js';
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
