<?php
$pageTitle = 'Team Details';
$pageDescription = 'Discover detailed information about motorsport teams, their stats, and history.';
require_once __DIR__ . '/../includes/header.php';
?>

<main class="flex-grow container mx-auto px-6 py-8">
    <!-- Team Information Section -->
    <section class="mb-10">
        <div class="flex justify-between items-center mb-6">
            <h2 class="text-3xl font-extrabold text-gray-900 dark:text-white mb-4">Team Profile</h2>
        </div>
        
        <div class="flex flex-col md:flex-row justify-between items-center">
            <div class="flex flex-col sm:flex-row items-center space-x-6">
                <img id="team-picture" src="/teams/picture/default.png" alt="Team Logo"
                    class="w-48 h-48 object-contain rounded-full border-4 border-blue-600 dark:border-blue-400">
                <div>
                    <h3 id="team-name" class="text-2xl font-bold text-blue-600 dark:text-blue-400">Team Name</h3>
                    <div class="flex h-12">
                        <img id="team-country-img" src="/assets/flags/default.png" alt="Team Country"
                            class="inline-block object-contain h-full aspect-[3/2] rounded p-2">
                        <p><span id="team-founded" class="font-semibold">Founded</span></p>
                    </div>
                    <div id="other_teams"></div>
                </div>
            </div>

            <!-- Team Stats -->
            <section class="driver-card p-6 mb-10 bg-gray-200 dark:bg-gray-700 rounded-lg shadow-md transition-shadow duration-300 hover:shadow-lg">
                <h3 class="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4 text-center">Team Stats</h3>
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
        <h2 class="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">Team Performance</h2>
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <section class="driver-card bg-gray-200 dark:bg-gray-800 rounded-lg p-6 shadow-md transition-shadow duration-300 hover:shadow-lg">
                <h3 class="text-xl font-bold text-center mb-6 text-blue-600 dark:text-blue-400">Wins by Season</h3>
                <div style="height: 400px;">
                    <canvas id="performanceChart" aria-label="Team Performance"></canvas>
                </div>
            </section>

            <section class="driver-card bg-gray-200 dark:bg-gray-800 rounded-lg p-6 shadow-md transition-shadow duration-300 hover:shadow-lg">
                <h3 class="text-xl font-bold text-center mb-6 text-blue-600 dark:text-blue-400">Results Distribution</h3>
                <div style="height: 400px;">
                    <canvas id="resultsDistributionChart" aria-label="Results Distribution"></canvas>
                </div>
            </section>
        </div>
    </div>

    <!-- Other Info Section -->
    <div id="otherInfoContainer" class="container mx-auto px-6 py-4" style="display: none;">
        <!-- Dynamic other info content will be inserted here -->
    </div>

    <!-- Detailed Results -->
    <div id="resultsContainer" class="mt-8">
        <!-- Dynamic content will be inserted here -->
    </div>
</main>

<!-- Random Cards Section -->
<section id="section_randomCards" class="my-12 flex-grow container mx-auto px-6 py-8"></section>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script type="module" src="/assets/js/pages/TeamPage.js"></script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
