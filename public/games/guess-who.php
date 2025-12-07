<?php
$pageTitle = 'Guess Who - Motorsport Edition';
$pageDescription = 'Play Guess Who with motorsport drivers! Challenge your opponents to guess the mystery driver.';
require_once __DIR__ . '/../../includes/header.php';
?>

<main class="flex-grow container mx-auto px-6 py-8">
    <div id="menu" class="space-y-4 flex flex-col items-center justify-center">
        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Guess Who - Motorsport-DB</h1>
        <button onclick="createGame()" class="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition">Create a game</button>
        <button onclick="joinGame()" class="px-6 py-2 bg-green-800 text-white rounded-lg shadow hover:bg-green-900 transition">Join a game</button>
        
        <!-- Championship selection -->
        <div id="list_drivers" class="hidden w-full max-w-2xl">
            <label for="championships" class="block text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Select Championships:</label>
            <select id="championships" multiple size="10" class="w-full">
                <!-- Options will be populated by JavaScript -->
            </select>
            <button onclick="startGame()" class="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700 transition">Start Game</button>
        </div>
        
        <p class="max-w-xl text-center text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg shadow-md p-4 bg-white dark:bg-gray-800">
            Welcome to "Guess Who? Motorsport Edition"!<br>
            The goal is to guess your opponent's driver before they guess yours.<br>
            Ask yes/no questions about their driver to narrow down the possibilities.<br>
            Good luck!
        </p>
    </div>

    <div id="game" class="hidden">
        <!-- Game interface will be inserted here -->
    </div>
</main>

<!-- Random Cards Section -->
<section id="section_randomCards" class="my-12 flex-grow container mx-auto px-6 py-8"></section>

<!-- Initialize Theme Service -->
<script type="module">
import { themeService } from '/assets/js/services/ThemeService.js';
themeService.initToggleButton();
</script>

<script src="/assets/js/games/guess-who.js"></script>

<?php require_once __DIR__ . '/../../includes/footer.php'; ?>
