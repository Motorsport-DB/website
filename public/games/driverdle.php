<?php
$pageTitle = 'Driverdle - Daily Driver Guessing Game';
$pageDescription = 'Guess the driver in 6 tries – daily motorsport wordle-style game.';
require_once __DIR__ . '/../../includes/header.php';
?>

<main class="flex-grow container mx-auto px-6 py-8 flex flex-col items-center space-y-8">
    <div class="max-w-xl w-full mx-auto mt-6 p-2 sm:p-4 bg-white dark:bg-gray-900 rounded-xl shadow">
        <h2 class="text-2xl font-bold text-center mb-4 sm:mb-6">Driverdle 🏁</h2>

        <!-- Game grid (dynamically generated via JS) -->
        <div id="driverdle-board" class="space-y-2 mb-4 sm:mb-6"></div>

        <!-- Hidden input for form submission -->
        <form id="guess-form" class="mb-6">
            <!-- Error message container -->
            <div id="error-message" class="hidden text-center text-red-600 dark:text-red-400 font-semibold mb-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                Error message will appear here
            </div>
            
            <div class="flex justify-center mb-2">
                <button type="submit"
                    class="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                    Submit Guess
                </button>
            </div>
        </form>

        <!-- Game stats -->
        <div id="game-stats" class="text-center space-y-2 hidden">
            <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100">Game Over!</h3>
            <p id="result-message" class="text-lg text-gray-700 dark:text-gray-300"></p>
            <button onclick="location.reload()" 
                class="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition">
                Play Again Tomorrow
            </button>
        </div>

        <!-- Result display -->
        <div id="driverdle-result" class="hidden text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 text-gray-900 dark:text-gray-100">
            <!-- Result message will appear here -->
        </div>

        <!-- Virtual Keyboard -->
        <div id="virtual-keyboard" class="mt-6">
            <div class="flex flex-wrap justify-center gap-1 mb-2">
                <button class="key px-3 py-4 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded font-semibold hover:bg-gray-400 dark:hover:bg-gray-500 transition" data-key="Q">Q</button>
                <button class="key px-3 py-4 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded font-semibold hover:bg-gray-400 dark:hover:bg-gray-500 transition" data-key="W">W</button>
                <button class="key px-3 py-4 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded font-semibold hover:bg-gray-400 dark:hover:bg-gray-500 transition" data-key="E">E</button>
                <button class="key px-3 py-4 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded font-semibold hover:bg-gray-400 dark:hover:bg-gray-500 transition" data-key="R">R</button>
                <button class="key px-3 py-4 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded font-semibold hover:bg-gray-400 dark:hover:bg-gray-500 transition" data-key="T">T</button>
                <button class="key px-3 py-4 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded font-semibold hover:bg-gray-400 dark:hover:bg-gray-500 transition" data-key="Y">Y</button>
                <button class="key px-3 py-4 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded font-semibold hover:bg-gray-400 dark:hover:bg-gray-500 transition" data-key="U">U</button>
                <button class="key px-3 py-4 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded font-semibold hover:bg-gray-400 dark:hover:bg-gray-500 transition" data-key="I">I</button>
                <button class="key px-3 py-4 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded font-semibold hover:bg-gray-400 dark:hover:bg-gray-500 transition" data-key="O">O</button>
                <button class="key px-3 py-4 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded font-semibold hover:bg-gray-400 dark:hover:bg-gray-500 transition" data-key="P">P</button>
            </div>
            <div class="flex flex-wrap justify-center gap-1 mb-2">
                <button class="key px-3 py-4 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded font-semibold hover:bg-gray-400 dark:hover:bg-gray-500 transition" data-key="A">A</button>
                <button class="key px-3 py-4 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded font-semibold hover:bg-gray-400 dark:hover:bg-gray-500 transition" data-key="S">S</button>
                <button class="key px-3 py-4 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded font-semibold hover:bg-gray-400 dark:hover:bg-gray-500 transition" data-key="D">D</button>
                <button class="key px-3 py-4 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded font-semibold hover:bg-gray-400 dark:hover:bg-gray-500 transition" data-key="F">F</button>
                <button class="key px-3 py-4 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded font-semibold hover:bg-gray-400 dark:hover:bg-gray-500 transition" data-key="G">G</button>
                <button class="key px-3 py-4 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded font-semibold hover:bg-gray-400 dark:hover:bg-gray-500 transition" data-key="H">H</button>
                <button class="key px-3 py-4 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded font-semibold hover:bg-gray-400 dark:hover:bg-gray-500 transition" data-key="J">J</button>
                <button class="key px-3 py-4 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded font-semibold hover:bg-gray-400 dark:hover:bg-gray-500 transition" data-key="K">K</button>
                <button class="key px-3 py-4 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded font-semibold hover:bg-gray-400 dark:hover:bg-gray-500 transition" data-key="L">L</button>
            </div>
            <div class="flex flex-wrap justify-center gap-1">
                <button class="key px-6 py-4 bg-orange-500 dark:bg-orange-600 text-white rounded font-semibold hover:bg-orange-600 dark:hover:bg-orange-500 transition" data-key="ENTER">ENTER</button>
                <button class="key px-3 py-4 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded font-semibold hover:bg-gray-400 dark:hover:bg-gray-500 transition" data-key="Z">Z</button>
                <button class="key px-3 py-4 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded font-semibold hover:bg-gray-400 dark:hover:bg-gray-500 transition" data-key="X">X</button>
                <button class="key px-3 py-4 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded font-semibold hover:bg-gray-400 dark:hover:bg-gray-500 transition" data-key="C">C</button>
                <button class="key px-3 py-4 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded font-semibold hover:bg-gray-400 dark:hover:bg-gray-500 transition" data-key="V">V</button>
                <button class="key px-3 py-4 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded font-semibold hover:bg-gray-400 dark:hover:bg-gray-500 transition" data-key="B">B</button>
                <button class="key px-3 py-4 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded font-semibold hover:bg-gray-400 dark:hover:bg-gray-500 transition" data-key="N">N</button>
                <button class="key px-3 py-4 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded font-semibold hover:bg-gray-400 dark:hover:bg-gray-500 transition" data-key="M">M</button>
                <button class="key px-6 py-4 bg-red-500 dark:bg-red-600 text-white rounded font-semibold hover:bg-red-600 dark:hover:bg-red-500 transition" data-key="BACKSPACE">⌫</button>
            </div>
        </div>

        <!-- How to play -->
        <div class="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <h3 class="font-bold mb-2 text-gray-900 dark:text-gray-100">How to Play</h3>
            <ul class="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
                <li>Guess the motorsport driver in 6 tries</li>
                <li>Each guess must be a valid driver name</li>
                <li>The color of the tiles will change to show how close your guess was</li>
                <li>🟩 Green: Correct attribute</li>
                <li>🟨 Yellow: Close but not exact</li>
                <li>⬜ Gray: Wrong attribute</li>
                <li>A new driver is available each day at midnight</li>
            </ul>
        </div>
    </div>

    <!-- Leaderboard/Stats -->
    <div class="max-w-xl w-full mx-auto p-4 bg-white dark:bg-gray-900 rounded-xl shadow">
        <h3 class="text-xl font-bold text-center mb-4 text-gray-900 dark:text-gray-100">Your Stats</h3>
        <div class="grid grid-cols-3 gap-4 text-center">
            <div class="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <p class="text-2xl font-bold text-blue-600 dark:text-blue-400" id="played-count">0</p>
                <p class="text-sm text-gray-600 dark:text-gray-400">Played</p>
            </div>
            <div class="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <p class="text-2xl font-bold text-green-600 dark:text-green-400" id="win-count">0</p>
                <p class="text-sm text-gray-600 dark:text-gray-400">Wins</p>
            </div>
            <div class="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                <p class="text-2xl font-bold text-purple-600 dark:text-purple-400" id="streak-count">0</p>
                <p class="text-sm text-gray-600 dark:text-gray-400">Streak</p>
            </div>
        </div>
    </div>
</main>

<!-- Initialize Theme Service -->
<script type="module">
import { themeService } from '/assets/js/services/ThemeService.js';
themeService.initToggleButton();
</script>

<script src="/assets/js/games/driverdle.js"></script>

<?php require_once __DIR__ . '/../../includes/footer.php'; ?>
