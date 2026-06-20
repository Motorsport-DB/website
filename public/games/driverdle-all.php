<?php
$pageTitle = 'Driverdle All - Daily Driver Comparison (All Series)';
$pageDescription = 'Guess today\'s motorsport driver from any series by comparing career years, championships, wins, age and more. Unlimited tries.';
require_once __DIR__ . '/../../includes/header.php';
?>

<main class="flex-grow container mx-auto px-4 py-8 flex flex-col items-center space-y-6">

  <!-- Back link -->
  <div class="w-full max-w-5xl">
    <a href="/games/driverdle.php" class="text-sm text-blue-600 dark:text-blue-400 hover:underline">&larr; Back to Driverdle modes</a>
  </div>

  <!-- Header -->
  <div class="max-w-5xl w-full bg-white dark:bg-gray-900 rounded-xl shadow p-4 sm:p-6">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
      <h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Driverdle All 🌍</h2>
      <span class="text-sm text-gray-500 dark:text-gray-400">Unlimited guesses · New driver every day</span>
    </div>
    <p class="text-sm text-gray-600 dark:text-gray-400">Guess today's driver from the full MotorsportDB database — any series, any era.</p>
  </div>

  <!-- Game area -->
  <div id="comparison-game" data-mode="all" class="max-w-5xl w-full space-y-4">

    <!-- Search -->
    <div id="search-container" class="bg-white dark:bg-gray-900 rounded-xl shadow p-4 relative">
      <label for="driver-search" class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Search any driver</label>
      <div class="relative">
        <input id="driver-search" type="text" autocomplete="off" spellcheck="false"
          placeholder="e.g. Senna, Loeb, Rossi…"
          class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm">
        <div id="search-dropdown"
          class="hidden absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
        </div>
      </div>
      <div id="error-msg" class="hidden mt-2 text-sm text-red-600 dark:text-red-400 font-semibold"></div>
      <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">Guesses: <span id="current-guess-count">0</span></p>
    </div>

    <!-- Win banner -->
    <div id="win-banner" class="hidden bg-green-50 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-xl p-4 text-center">
      <p class="text-lg font-bold text-green-800 dark:text-green-300">🎉 Correct! Found in <span id="guess-count">0</span> guess(es).</p>
      <p class="text-sm text-green-700 dark:text-green-400 mt-1">Come back tomorrow for a new driver!</p>
    </div>

    <!-- Guesses table -->
    <div class="bg-white dark:bg-gray-900 rounded-xl shadow overflow-x-auto">
      <table id="guesses-table" class="hidden w-full border-collapse text-sm">
        <thead class="bg-gray-50 dark:bg-gray-800">
          <tr id="header-row"></tr>
        </thead>
        <tbody id="guesses-body"></tbody>
      </table>
    </div>

  </div>

  <!-- Rules -->
  <div class="max-w-5xl w-full bg-white dark:bg-gray-900 rounded-xl shadow p-4 sm:p-6">
    <h3 class="font-bold text-gray-900 dark:text-gray-100 mb-3">How to Play</h3>
    <ul class="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
      <li>Search and select any driver from the MotorsportDB database.</li>
      <li>Each guess reveals how close you are to the mystery driver.</li>
      <li>You have <strong>unlimited tries</strong> — a new driver is revealed each day at midnight.</li>
    </ul>
    <h4 class="font-semibold text-gray-900 dark:text-gray-100 mt-4 mb-2">Color legend</h4>
    <div class="flex flex-wrap gap-3 text-xs">
      <span class="flex items-center gap-1"><span class="inline-block w-5 h-5 rounded bg-green-500"></span> Exact match</span>
      <span class="flex items-center gap-1"><span class="inline-block w-5 h-5 rounded bg-orange-400"></span> Partial match (list: ≥1 in common; number: within range)</span>
      <span class="flex items-center gap-1"><span class="inline-block w-5 h-5 rounded bg-red-500"></span> No match</span>
      <span class="flex items-center gap-1"><strong>↑</strong>&nbsp;Target is higher &nbsp;<strong>↓</strong>&nbsp;Target is lower</span>
    </div>
    <h4 class="font-semibold text-gray-900 dark:text-gray-100 mt-4 mb-2">Properties compared</h4>
    <ul class="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
      <li><strong>1st Year</strong> — year of first race entry in any championship. Orange if within ±3 years.</li>
      <li><strong>Last Year</strong> — year of most recent race entry. Orange if within ±3 years.</li>
      <li><strong>Series</strong> — all championships raced in. Orange if ≥1 in common.</li>
      <li><strong>Wins</strong> — total Race victories across all series. Orange if within ±10 wins.</li>
      <li><strong>Age</strong> — current age (from date of birth). Orange if within ±3 years.</li>
      <li><strong>Name Length</strong> — number of letters in last name. Orange if within ±1.</li>
    </ul>
  </div>

  <!-- Stats -->
  <div class="max-w-5xl w-full bg-white dark:bg-gray-900 rounded-xl shadow p-4 sm:p-6">
    <h3 class="text-lg font-bold text-center mb-4 text-gray-900 dark:text-gray-100">Your Stats</h3>
    <div class="grid grid-cols-3 gap-4 text-center">
      <div class="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <p class="text-2xl font-bold text-blue-600 dark:text-blue-400" id="stats-played">0</p>
        <p class="text-sm text-gray-600 dark:text-gray-400">Played</p>
      </div>
      <div class="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <p class="text-2xl font-bold text-green-600 dark:text-green-400" id="stats-wins">0</p>
        <p class="text-sm text-gray-600 dark:text-gray-400">Wins</p>
      </div>
      <div class="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <p class="text-2xl font-bold text-purple-600 dark:text-purple-400" id="stats-streak">0</p>
        <p class="text-sm text-gray-600 dark:text-gray-400">Streak</p>
      </div>
    </div>
  </div>

</main>

<script type="module">
  import { themeService } from '/assets/js/services/ThemeService.js';
  themeService.initToggleButton();
</script>
<script src="/assets/js/games/driverdle-comparison.js"></script>

<?php require_once __DIR__ . '/../../includes/footer.php'; ?>
