<?php
$pageTitle = 'Home';
$pageDescription = 'Explore detailed information about motorsport drivers, teams, and championships worldwide.';
require_once __DIR__ . '/../includes/header.php';
?>

<!-- Main Content -->
<div class="container mx-auto px-4 py-8">
    
    <!-- Hero Section -->
    <section class="text-center mb-12">
        <h1 class="text-3xl md:text-5xl font-extrabold text-gray-900 dark:text-gray-100 mb-4 animate-fade-in">
            Find Your Favorite Motorsport Stars
        </h1>
        <p class="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            Search through our comprehensive database of drivers, teams, and championships.
        </p>
        
        <!-- Search Component Container -->
        <div id="searchContainer" class="max-w-2xl mx-auto"></div>
    </section>
    
    <!-- Search Results -->
    <section id="searchResults" class="mb-16"></section>
    
    <!-- Head to Head Section -->
    <section class="my-16">
        <h2 class="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-gray-100">
            Compare Drivers
        </h2>
        <div class="max-w-2xl mx-auto">
            <a href="/head-to-head.php" 
               class="block bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 
                      text-white text-center py-16 rounded-xl shadow-lg hover:shadow-2xl 
                      transition-all duration-300 hover:scale-105 group">
                <span class="text-7xl mb-6 block group-hover:scale-110 transition-transform">⚔️</span>
                <span class="block font-bold text-4xl mb-3">Head to Head</span>
                <span class="block text-lg px-8 opacity-90">
                    Compare 2-5 drivers side by side with detailed statistics
                </span>
            </a>
        </div>
    </section>
    
    <!-- Global Statistics Section -->
    <section id="globalStats" class="my-16">
        <h2 class="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-gray-100">
            Database Overview
        </h2>
        
        <!-- Stats Grid -->
        <div id="statsText" class="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
            <!-- Filled by HomePage.js -->
            <div class="skeleton h-32 rounded-lg"></div>
            <div class="skeleton h-32 rounded-lg"></div>
            <div class="skeleton h-32 rounded-lg"></div>
            <div class="skeleton h-32 rounded-lg"></div>
        </div>
        
        <!-- Chart -->
        <div class="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
            <h3 class="text-xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">
                Distribution
            </h3>
            <div class="relative h-64">
                <canvas id="statsDonut"></canvas>
            </div>
        </div>
    </section>
    
    <!-- Games Section -->
    <section class="my-16">
        <h2 class="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-gray-100">
            Motorsport Games
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <!-- Guess Who Card -->
            <a href="/games/guess-who.php" 
               class="card hover-lift group cursor-pointer">
                <div class="relative h-48 bg-gradient-to-br from-green-500 to-teal-600 rounded-t-lg overflow-hidden">
                    <img src="/assets/other/guess-who.png" 
                         alt="Guess Who Game" 
                         class="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                         loading="lazy">
                </div>
                <div class="p-6">
                    <h3 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        Guess Who?
                    </h3>
                    <p class="text-gray-600 dark:text-gray-400 mb-4">
                        Test your knowledge by guessing the mystery driver from clues.
                    </p>
                    <span class="btn btn-primary inline-flex items-center gap-2">
                        Play Now
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                    </span>
                </div>
            </a>
            
            <!-- Driverdle Card -->
            <a href="/games/driverdle.php" 
               class="card hover-lift group cursor-pointer">
                <div class="relative h-48 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-t-lg overflow-hidden">
                    <img src="/assets/other/driverdle.png" 
                         alt="Driverdle Game" 
                         class="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300"
                         loading="lazy">
                </div>
                <div class="p-6">
                    <h3 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                        Driverdle
                    </h3>
                    <p class="text-gray-600 dark:text-gray-400 mb-4">
                        Wordle-style game to guess the driver of the day.
                    </p>
                    <span class="btn btn-primary inline-flex items-center gap-2">
                        Play Now
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                    </span>
                </div>
            </a>
        </div>
    </section>
    
    <!-- Random Cards Section -->
    <section class="my-16">
        <h2 class="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-gray-100">
            Discover Random Entries
        </h2>
        <div id="randomCards" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <!-- Filled by HomePage.js with skeleton initially -->
            <?php for ($i = 0; $i < 8; $i++): ?>
            <div class="card">
                <div class="skeleton h-48 rounded-t-lg mb-4"></div>
                <div class="skeleton h-6 w-3/4 mb-2"></div>
                <div class="skeleton h-4 w-1/2 mb-4"></div>
                <div class="skeleton h-4 w-full mb-2"></div>
                <div class="skeleton h-4 w-full"></div>
            </div>
            <?php endfor; ?>
        </div>
    </section>
    
</div>

<?php
$additionalScripts = <<<HTML
<!-- Initialize HomePage Module -->
<script type="module" src="/assets/js/pages/HomePage.js"></script>
HTML;

require_once __DIR__ . '/../includes/footer.php';
?>
