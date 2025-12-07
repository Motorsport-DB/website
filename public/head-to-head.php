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
    <div id="loading-indicator" class="hidden mb-8 text-center py-12">
        <div class="inline-block w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p class="text-gray-600 dark:text-gray-400 text-lg">Loading comparison data...</p>
    </div>

    <!-- Comparison Results -->
    <div id="comparison-results" class="space-y-8 sm:space-y-12">
        
        <!-- Global Statistics -->
        <section id="global-stats" class="hidden">
            <h2 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6">
                📊 Global Statistics
            </h2>
            <!-- Stats cards will be inserted here -->
        </section>

        <!-- Head-to-Head Battles -->
        <section id="head-to-head-battles" class="hidden">
            <h2 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6">
                ⚔️ Direct Battles
            </h2>
            <!-- Battle comparisons will be inserted here -->
        </section>

        <!-- Comparison Charts -->
        <section id="comparison-charts" class="hidden">
            <h2 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6">
                📈 Performance Comparison
            </h2>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
                    <canvas id="wins-chart" class="w-full" style="height: 300px;"></canvas>
                </div>
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
                    <canvas id="podiums-chart" class="w-full" style="height: 300px;"></canvas>
                </div>
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 lg:col-span-2">
                    <canvas id="finish-types-chart" class="w-full" style="height: 350px;"></canvas>
                </div>
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
                    <canvas id="dnf-rate-chart" class="w-full" style="height: 300px;"></canvas>
                </div>
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
                    <canvas id="avg-position-chart" class="w-full" style="height: 300px;"></canvas>
                </div>
            </div>
        </section>

        <!-- Performance Radar -->
        <section id="performance-radar" class="hidden">
            <h2 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6">
                🎯 Performance Radar
            </h2>
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-8">
                <div class="max-w-4xl mx-auto">
                    <canvas id="radar-chart" style="height: 400px;"></canvas>
                </div>
            </div>
        </section>

        <!-- Race Results Table -->
        <section id="race-results-table" class="hidden">
            <h2 class="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6">
                🏎️ Detailed Race Results
            </h2>
            <!-- Table will be inserted here -->
        </section>

    </div>
</main>

<!-- Chart.js -->
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>

<!-- Head to Head Page Module -->
<script type="module">
    import HeadToHeadPage from '/assets/js/pages/HeadToHeadPage.js';
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
