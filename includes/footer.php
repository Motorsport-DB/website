    </main>
    
    <!-- Footer -->
    <footer class="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-16">
        <div class="container mx-auto px-4 py-8">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
                <!-- About -->
                <div>
                    <h3 class="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">MotorsportDB</h3>
                    <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        Comprehensive database of motorsport drivers, teams, and championships from around the world.
                    </p>
                </div>
                
                <!-- Quick Links -->
                <div>
                    <h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Quick Links</h4>
                    <ul class="space-y-2 text-sm">
                        <li><a href="/index.html" class="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Home</a></li>
                        <li><a href="/head-to-head.html" class="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Head to Head</a></li>
                        <li><a href="/games/guess-who.php" class="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Guess Who</a></li>
                        <li><a href="/games/driverdle.php" class="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Driverdle</a></li>
                    </ul>
                </div>
                
                <!-- Resources -->
                <div>
                    <h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Resources</h4>
                    <ul class="space-y-2 text-sm">
                        <li><a href="/api/drivers-list.php" class="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Drivers List</a></li>
                        <li><a href="/api/teams-list.php" class="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Teams List</a></li>
                        <li><a href="/README_V2.md" class="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Documentation</a></li>
                        <li><a href="https://github.com/Motorsport-DB" target="_blank" rel="noopener noreferrer" class="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">GitHub</a></li>
                    </ul>
                </div>
                
                <!-- Stats -->
                <div>
                    <h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Database Stats</h4>
                    <ul class="space-y-2 text-sm text-gray-600 dark:text-gray-400" id="footer-stats">
                        <li>Loading statistics...</li>
                    </ul>
                </div>
            </div>
            
            <div class="border-t border-gray-200 dark:border-gray-700 mt-8 pt-8 text-center text-sm text-gray-600 dark:text-gray-400">
                <p>&copy; <?= date('Y') ?> MotorsportDB. Open Source Project.</p>
                <p class="mt-2">
                    Data compiled from public sources • Not affiliated with any motorsport organization.
                </p>
            </div>
        </div>
    </footer>
    
    <!-- Mobile Menu Script -->
    <script>
        document.getElementById('mobile-menu-toggle')?.addEventListener('click', function() {
            const menu = document.getElementById('mobile-menu');
            menu.classList.toggle('hidden');
        });
    </script>
    
    <!-- Footer Stats Loader -->
    <script type="module">
        import { apiService } from '/assets/js/services/ApiService.js';
        
        async function loadFooterStats() {
            try {
                const response = await fetch('/api/cards.php');
                const data = await response.json();
                
                if (data?.statistics) {
                    const statsContainer = document.getElementById('footer-stats');
                    if (statsContainer) {
                        statsContainer.innerHTML = `
                            <li>🏁 ${data.statistics.numbers_of_drivers || 0} Drivers</li>
                            <li>🏎️ ${data.statistics.numbers_of_teams || 0} Teams</li>
                            <li>🏆 ${data.statistics.numbers_of_championship || 0} Championships</li>
                            <li>📊 ${data.statistics.numbers_of_races || 0} Races</li>
                        `;
                    }
                }
            } catch (error) {
                console.error('Error loading footer stats:', error);
            }
        }
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', loadFooterStats);
        } else {
            loadFooterStats();
        }
    </script>
    
    <?php if (isset($additionalScripts)): ?>
    <?= $additionalScripts ?>
    <?php endif; ?>
    
</body>
</html>
