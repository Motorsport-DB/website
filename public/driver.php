<?php
$pageTitle = 'Driver Details';
$pageDescription = 'Discover detailed information about motorsport drivers, their stats, and career achievements.';
require_once __DIR__ . '/../includes/header.php';
?>

<main class="flex-grow container mx-auto px-6 py-8">
    <!-- Driver Information Section -->
    <section class="mb-10">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-3xl font-extrabold text-gray-900 dark:text-white mb-4">Driver Profile</h2>
        </div>
        
        <div class="flex flex-col md:flex-row justify-between items-center space-y-6 md:space-y-0 md:space-x-8">
            <div class="flex flex-col sm:flex-row items-center space-x-6">
                <img id="driver-picture" src="/drivers/picture/default.png" alt="Driver Picture"
                    class="w-48 h-48 object-contain rounded-full border-4 border-blue-600 dark:border-blue-400">
                <div>
                    <h3 id="driver-name" class="text-2xl font-bold text-blue-600 dark:text-blue-400">Driver Name</h3>
                    <div class="flex flex-col">
                        <img id="driver-country-img" src="/assets/flags/default.png" alt="Driver Country"
                            class="inline-block h-6 w-6 m-2 object-contain">
                        <span id="driver-dob" class="font-semibold text-gray-700 dark:text-gray-300">Date of birth: N/A</span>
                        <span id="driver-dod" class="font-semibold text-gray-700 dark:text-gray-300 hidden">Date of death: N/A</span>
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

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script type="module" src="/assets/js/pages/DriverPage.js"></script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
