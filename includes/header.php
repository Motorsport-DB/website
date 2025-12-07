<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="index, follow">
    
    <?php if (isset($pageTitle)): ?>
    <title><?= htmlspecialchars($pageTitle) ?> - MotorsportDB</title>
    <?php else: ?>
    <title>MotorsportDB - Explore Motorsport Data</title>
    <?php endif; ?>
    
    <?php if (isset($pageDescription)): ?>
    <meta name="description" content="<?= htmlspecialchars($pageDescription) ?>">
    <?php else: ?>
    <meta name="description" content="Explore detailed information about motorsport drivers, teams, and championships worldwide.">
    <?php endif; ?>
    
    <meta name="keywords" content="motorsport database, racing drivers, teams, championships, F1, Formula 1, endurance racing, driverdb, teamdb, championshipdb">
    
    <!-- Open Graph / Social Media -->
    <meta property="og:title" content="<?= htmlspecialchars($pageTitle ?? 'MotorsportDB') ?> - Motorsport Statistics">
    <meta property="og:description" content="<?= htmlspecialchars($pageDescription ?? 'Discover motorsport drivers, teams, and championships statistics') ?>">
    <meta property="og:url" content="https://motorsportdb.org<?= htmlspecialchars($_SERVER['REQUEST_URI'] ?? '/') ?>">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="MotorsportDB">
    
    <!-- Stylesheets -->
    <link rel="stylesheet" href="/assets/css/tailwind.min.css">
    <link rel="stylesheet" href="/assets/css/design-system.css">
    <link rel="stylesheet" href="/assets/css/custom.css">
    
    <!-- Chart.js (loaded before modules) -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    
    <?php if (isset($additionalHead)): ?>
    <?= $additionalHead ?>
    <?php endif; ?>
</head>
<body class="bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-300 min-h-screen flex flex-col theme-transition">
    
    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 shadow-md dark:shadow-lg sticky top-0 z-40">
        <nav class="container mx-auto px-4 py-4 flex justify-between items-center">
            <!-- Logo -->
            <a href="/index.html" class="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                MotorsportDB
            </a>
            
            <!-- Navigation Links (Desktop) -->
            <div class="hidden md:flex items-center gap-6">
                <a href="/index.html" class="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">
                    Home
                </a>
                <a href="/head-to-head.html" class="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">
                    Head to Head
                </a>
                <div class="relative group">
                    <button class="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium flex items-center gap-1">
                        Games
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                    </button>
                    <div class="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                        <a href="/games/guess-who.html" class="block px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg transition-colors">
                            Guess Who
                        </a>
                        <a href="/games/driverdle.php" class="block px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-b-lg transition-colors">
                            Driverdle
                        </a>
                    </div>
                </div>
            </div>
            
            <!-- Theme Toggle & Mobile Menu -->
            <div class="flex items-center gap-4">
                <!-- Theme Toggle Button -->
                <button id="theme-toggle" 
                        class="p-2 rounded-lg bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 border-2 border-gray-400 dark:border-gray-600"
                        aria-label="Toggle theme"
                        title="Toggle dark/light mode">
                    <!-- Sun icon: shows in LIGHT mode (when you're in light mode) -->
                    <svg id="theme-icon-sun" class="w-5 h-5 text-yellow-500 block" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" fill-rule="evenodd" clip-rule="evenodd"></path>
                    </svg>
                    <!-- Moon icon: shows in DARK mode (when you're in dark mode) -->
                    <svg id="theme-icon-moon" class="w-5 h-5 text-blue-300 hidden" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
                    </svg>
                </button>
                
                <!-- Mobile Menu Button -->
                <button id="mobile-menu-toggle" class="md:hidden text-gray-700 dark:text-gray-300 focus:outline-none">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
                    </svg>
                </button>
            </div>
        </nav>
        
        <!-- Mobile Menu -->
        <div id="mobile-menu" class="hidden md:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <div class="container mx-auto px-4 py-4 flex flex-col gap-4">
                <a href="/index.html" class="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">
                    Home
                </a>
                <a href="/head-to-head.html" class="text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">
                    Head to Head
                </a>
                <div class="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <p class="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">Games</p>
                    <a href="/games/guess-who.php" class="block py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        Guess Who
                    </a>
                    <a href="/games/driverdle.php" class="block py-2 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        Driverdle
                    </a>
                </div>
            </div>
        </div>
    </header>
    
    <main class="flex-grow">
