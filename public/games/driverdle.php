<?php
$pageTitle = 'Driverdle - Choose Your Mode';
$pageDescription = 'Driverdle: three daily motorsport driver guessing games. F1 comparison, All-series comparison, or classic Wordle-style.';
require_once __DIR__ . '/../../includes/header.php';
?>

<main class="flex-grow container mx-auto px-4 py-12 flex flex-col items-center">

  <div class="max-w-2xl w-full text-center mb-10">
    <h2 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Driverdle 🏁</h2>
    <p class="text-gray-600 dark:text-gray-400">Choose a game mode. A new mystery driver is revealed every day.</p>
  </div>

  <div class="max-w-2xl w-full space-y-5">

    <!-- F1 Mode -->
    <a href="/games/driverdle-f1.php"
       class="flex items-start gap-5 p-6 bg-white dark:bg-gray-900 rounded-2xl shadow hover:shadow-md hover:ring-2 hover:ring-blue-500 transition-all group">
      <div class="flex-shrink-0 w-14 h-14 flex items-center justify-center rounded-xl bg-red-100 dark:bg-red-900/30 text-3xl">🏎️</div>
      <div>
        <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Driverdle F1</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Guess the mystery F1 driver by comparing career years, teams, wins, age and more.
        </p>
        <div class="flex flex-wrap gap-2 mt-3">
          <span class="text-xs bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 px-2 py-0.5 rounded-full">F1 only</span>
          <span class="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">Comparison</span>
          <span class="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">Unlimited guesses</span>
        </div>
      </div>
    </a>

    <!-- All Mode -->
    <a href="/games/driverdle-all.php"
       class="flex items-start gap-5 p-6 bg-white dark:bg-gray-900 rounded-2xl shadow hover:shadow-md hover:ring-2 hover:ring-blue-500 transition-all group">
      <div class="flex-shrink-0 w-14 h-14 flex items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30 text-3xl">🌍</div>
      <div>
        <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Driverdle All</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Same comparison mechanic as F1 mode, but the mystery driver can be from <em>any</em> series in the database — WRC, Indycar, MotoGP, and more.
          Unlimited tries.
        </p>
        <div class="flex flex-wrap gap-2 mt-3">
          <span class="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">All series</span>
          <span class="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">Comparison</span>
          <span class="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">Unlimited guesses</span>
        </div>
      </div>
    </a>

    <!-- Classic Mode -->
    <a href="/games/driverdle-classic.php"
       class="flex items-start gap-5 p-6 bg-white dark:bg-gray-900 rounded-2xl shadow hover:shadow-md hover:ring-2 hover:ring-blue-500 transition-all group">
      <div class="flex-shrink-0 w-14 h-14 flex items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/30 text-3xl">🟩</div>
      <div>
        <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Driverdle Classic</h3>
        <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">
          The original Wordle-style game: type the driver's last name letter by letter.
          Green = correct position, orange = wrong position, gray = not in name. 6 tries max.
        </p>
        <div class="flex flex-wrap gap-2 mt-3">
          <span class="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full">Wordle style</span>
          <span class="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">6 tries</span>
        </div>
      </div>
    </a>

  </div>

</main>

<script type="module">
  import { themeService } from '/assets/js/services/ThemeService.js';
  themeService.initToggleButton();
</script>

<?php require_once __DIR__ . '/../../includes/footer.php'; ?>
