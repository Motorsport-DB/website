<?php
require_once __DIR__ . '/../includes/seo.php';
$seo = seo_race_page((string) ($_GET['id'] ?? ''), (string) ($_GET['year'] ?? ''));
require_once __DIR__ . '/../includes/header.php';
?>

<main class="flex-grow container mx-auto px-6 py-8">
    <!-- Race Information Section -->
    <section class="mb-10">
        <p class="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mb-4">Race Details</p>
        
        <!-- Year Navigation -->
        <div id="year-navigation" class="flex justify-center items-center gap-4 mb-6">
            <button id="prev-year-btn" class="hidden px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                </svg>
                <span id="prev-year-text"></span>
            </button>
            
            <span id="current-year" class="text-2xl font-bold text-blue-600 dark:text-blue-400 px-6"></span>
            
            <button id="next-year-btn" class="hidden px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                <span id="next-year-text"></span>
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
            </button>
        </div>
        
        <div class="flex flex-col md:flex-row justify-between items-center">
            <div class="flex flex-col sm:flex-row items-center space-x-6">
                <div class="w-48 h-48 rounded-full border-4 border-blue-600 dark:border-blue-400 overflow-hidden bg-white dark:bg-gray-700 flex-shrink-0">
                    <img id="race-picture" src="/races/picture/default.png" alt="Race Picture"
                        class="w-full h-full object-contain p-3">
                </div>
                <div>
                    <h1 id="race-name" class="text-2xl font-bold text-blue-600 dark:text-blue-400"><?= htmlspecialchars($seo['name'] ?? 'Season not found') ?></h1>
                    <p class="text-lg text-gray-700 dark:text-gray-300">Date: <span id="race-date" class="font-semibold">Date</span></p>
                </div>
            </div>

            <!-- Race Stats -->
            <section class="driver-card p-6 mb-10 bg-gray-200 dark:bg-gray-700 rounded-lg shadow-md transition-shadow duration-300 hover:shadow-lg">
                <h3 class="text-xl font-bold text-blue-600 dark:text-blue-400 mb-4 text-center">Championship Stats</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="text-gray-800 dark:text-gray-200">
                        <p class="font-semibold">Total Laps:</p>
                        <p id="totalLaps" class="text-2xl font-bold">?</p>
                    </div>
                    <div class="text-gray-800 dark:text-gray-200">
                        <p class="font-semibold">Total Events:</p>
                        <p id="totalEvents" class="text-2xl font-bold">?</p>
                    </div>
                    <div class="text-gray-800 dark:text-gray-200">
                        <p class="font-semibold">Participants:</p>
                        <p id="totalParticipants" class="text-2xl font-bold">?</p>
                    </div>
                    <div class="text-gray-800 dark:text-gray-200">
                        <p class="font-semibold">Season:</p>
                        <p id="seasonInfo" class="text-2xl font-bold">?</p>
                    </div>
                </div>
            </section>
        </div>
    </section>

    <!-- Charts Section -->
    <section class="my-12">
        <h2 class="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-gray-100">
            Championship Analytics
        </h2>
        
        <!-- Row 1: Winners and Participants -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 class="text-xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">
                    Event Winners
                </h3>
                <div style="height: 400px;">
                    <canvas id="winnersChart"></canvas>
                </div>
            </div>
            
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 class="text-xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">
                    Top Participants
                </h3>
                <div style="height: 400px;">
                    <canvas id="participantsChart"></canvas>
                </div>
            </div>
        </div>
        
        <!-- Row 2: Qualifying vs Race Comparison and Race-by-Race Evolution -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 class="text-xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">
                    Qualifying vs Race Positions
                </h3>
                <div style="height: 400px;">
                    <canvas id="qualifyingVsRaceChart"></canvas>
                </div>
            </div>
            
            <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 class="text-xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">
                    Race-by-Race Evolution
                </h3>
                <div style="height: 400px;">
                    <canvas id="raceEvolutionChart"></canvas>
                </div>
            </div>
        </div>
    </section>

    <!-- Other Info Section -->
    <div id="otherInfoContainer" class="container mx-auto px-6 py-4" style="display: none;">
        <!-- Dynamic other info content will be inserted here -->
    </div>

    <!-- Championship standings -->
    <section id="standingsContainer" class="container mx-auto px-6 py-6" aria-live="polite"></section>

    <!-- Results Container -->
    <div id="resultsContainer" class="mt-8">
        <!-- Dynamic content will be inserted here -->
    </div>
    <?php if ($seo): ?>
    <!-- Winners of the season, rendered by the server (readable without JavaScript) -->
    <section id="seo-summary" class="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-2">Winners of the <?= htmlspecialchars($seo['name']) ?> season</h2>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-4"><?= htmlspecialchars($seo['desc']) ?></p>
        <ol class="space-y-1 text-sm list-disc list-inside">
            <?php foreach ($seo['rows'] as $r): ?>
            <li><span class="font-semibold text-gray-900 dark:text-gray-100"><?= htmlspecialchars($r['event']) ?></span><?php if ($r['drivers']): ?>:
                <?= implode(', ', array_map(fn($d) => '<a class="text-blue-600 dark:text-blue-400 hover:underline" href="/driver?id=' . htmlspecialchars(rawurlencode($d)) . '">' . htmlspecialchars(seo_label($d)) . '</a>', $r['drivers'])) ?><?php if ($r['team']): ?>
                (<a class="hover:underline" href="/team?id=<?= htmlspecialchars(rawurlencode($r['team'])) ?>"><?= htmlspecialchars(seo_label($r['team'])) ?></a>)<?php endif; ?><?php endif; ?></li>
            <?php endforeach; ?>
        </ol>
    </section>
    <?php endif; ?>
</main>

<!-- Random Cards Section -->
<section id="section_randomCards" class="my-12 flex-grow container mx-auto px-6 py-8"></section>

<script type="module" src="<?= asset('js/pages/RacePage.js') ?>"></script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
