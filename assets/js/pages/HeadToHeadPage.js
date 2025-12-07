/**
 * MotorsportDB - Head to Head Page v2.0
 * Complete driver comparison system with advanced statistics
 * 
 * Features:
 * - Compare 2-5 drivers simultaneously
 * - Multiple comparison modes (All, Common Championships, Common Races, Same Team)
 * - Comprehensive statistics (wins, podiums, DNF rate, avg position, etc.)
 * - Head-to-head battle analysis
 * - Performance radar charts
 * - Detailed race results with CSV export
 * - Fully responsive design
 */

import { apiService } from '../services/ApiService.js';
import { chartService } from '../services/ChartService.js';
import { themeService } from '../services/ThemeService.js';
import { SearchComponent } from '../components/SearchComponent.js';
import { calculateAdvancedHeadToHead } from '../utils/headToHeadProcessor.js';

class HeadToHeadPage {
    constructor() {
        this.selectedDrivers = [];
        this.maxDrivers = 5;
        this.searchComponent = null;
        this.charts = new Map();
        this.comparisonData = null;
        this.currentMode = 'all';
        
        try {
            themeService.initToggleButton();
            this.initializeSearch();
            this.setupEventListeners();
        } catch (error) {
            console.error('Error initializing head-to-head page:', error);
        }
    }

    initializeSearch() {
        const searchContainer = document.getElementById('driver-search-container');
        if (!searchContainer) return;

        this.searchComponent = new SearchComponent('driver-search-container', {
            placeholder: 'Search and add drivers (up to 5)...',
            showImages: true,
            maxResults: 10,
            onSelect: (driver) => {
                this.addDriver(driver);
                this.searchComponent.clear();
            }
        });
    }

    setupEventListeners() {
        const compareBtn = document.getElementById('compare-btn');
        if (compareBtn) {
            compareBtn.addEventListener('click', () => this.compareDrivers());
        }
        
        const modeSelect = document.getElementById('comparison-mode');
        if (modeSelect) {
            modeSelect.addEventListener('change', (e) => {
                this.currentMode = e.target.value;
                if (this.comparisonData) {
                    this.compareDrivers(); // Recompare with new mode
                }
            });
        }
        
        const exportBtn = document.getElementById('export-csv-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportToCSV());
        }
    }

    addDriver(driver) {
        if (this.selectedDrivers.length >= this.maxDrivers) {
            alert(`Maximum ${this.maxDrivers} drivers can be compared`);
            return;
        }

        if (this.selectedDrivers.find(d => d.id === driver.id)) {
            alert('Driver already selected');
            return;
        }

        this.selectedDrivers.push(driver);
        this.renderSelectedDrivers();
        
        // Auto-compare if we have at least 2 drivers
        if (this.selectedDrivers.length >= 2) {
            const compareBtn = document.getElementById('compare-btn');
            if (compareBtn) compareBtn.disabled = false;
        }
    }

    removeDriver(driverId) {
        this.selectedDrivers = this.selectedDrivers.filter(d => d.id !== driverId);
        this.renderSelectedDrivers();
        
        const compareBtn = document.getElementById('compare-btn');
        if (compareBtn) {
            compareBtn.disabled = this.selectedDrivers.length < 2;
        }
        
        // Clear comparison if less than 2 drivers
        if (this.selectedDrivers.length < 2) {
            this.clearComparison();
        }
    }

    renderSelectedDrivers() {
        const container = document.getElementById('selected-drivers');
        if (!container) return;

        if (this.selectedDrivers.length === 0) {
            container.innerHTML = '<p class="text-gray-500 dark:text-gray-400 col-span-full text-center">No drivers selected</p>';
            return;
        }

        let html = '';
        this.selectedDrivers.forEach(driver => {
            html += `
                <div class="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-md flex items-center gap-3 relative hover:shadow-lg transition-shadow">
                    <img src="${driver.image || 'drivers/picture/default.png'}" 
                         alt="${driver.name}" 
                         class="w-12 h-12 rounded-full object-cover border-2 border-blue-400 dark:border-blue-500">
                    <div class="flex-1">
                        <p class="font-semibold text-gray-900 dark:text-white">${driver.name}</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">${driver.country || 'Unknown'}</p>
                    </div>
                    <button onclick="window.headToHeadPage.removeDriver('${driver.id}')" 
                            class="text-red-600 hover:text-red-700 dark:text-red-400 hover:scale-110 transition-transform">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    async compareDrivers() {
        if (this.selectedDrivers.length < 2) {
            alert('Please select at least 2 drivers to compare');
            return;
        }

        try {
            const loadingIndicator = document.getElementById('loading-indicator');
            if (loadingIndicator) loadingIndicator.classList.remove('hidden');

            // Load detailed data for each driver
            const driversData = await Promise.all(
                this.selectedDrivers.map(d => apiService.getDriver(d.id))
            );

            console.log('Loaded drivers data:', driversData);

            // Calculate comprehensive comparison
            this.comparisonData = calculateAdvancedHeadToHead(driversData, this.currentMode);
            
            console.log('Comparison data:', this.comparisonData);

            // Check if mode constraints are met
            if (this.currentMode === 'same-team' && this.comparisonData.battles.commonRaces === 0) {
                alert('⚠️ No common races found where all selected drivers were in the SAME team.\n\nPlease:\n- Select drivers who were teammates\n- OR switch to another comparison mode');
                if (loadingIndicator) loadingIndicator.classList.add('hidden');
                return;
            }
            
            if (this.currentMode === 'common-races' && this.comparisonData.battles.commonRaces === 0) {
                alert('⚠️ No common races found where all selected drivers participated.\n\nPlease:\n- Select drivers with overlapping race history\n- OR switch to "All Races" or "Common Championships" mode');
                if (loadingIndicator) loadingIndicator.classList.add('hidden');
                return;
            }
            
            if (this.currentMode === 'common-championships' && this.comparisonData.summary.commonChampionships.length === 0) {
                alert('⚠️ No common championships found where all selected drivers competed.\n\nPlease:\n- Select drivers who competed in the same championship (e.g., all in F1 or all in GT)\n- OR switch to "All Races" mode for global comparison');
                if (loadingIndicator) loadingIndicator.classList.add('hidden');
                return;
            }

            // Display all sections
            this.displayGlobalStats();
            this.displayHeadToHeadBattles();
            this.displayComparisonCharts();
            this.displayPerformanceRadar();
            this.displayRaceResults();

            if (loadingIndicator) loadingIndicator.classList.add('hidden');
            
            // Scroll to results
            const resultsSection = document.getElementById('comparison-results');
            if (resultsSection) {
                resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }

        } catch (error) {
            console.error('Error comparing drivers:', error);
            alert('Failed to load comparison data. Please try again.');
            const loadingIndicator = document.getElementById('loading-indicator');
            if (loadingIndicator) loadingIndicator.classList.add('hidden');
        }
    }

    displayGlobalStats() {
        const container = document.getElementById('global-stats');
        if (!container || !this.comparisonData) return;

        let html = '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">';

        this.comparisonData.drivers.forEach(driver => {
            const stats = driver.detailedStats;
            const colorClass = this.getDriverColorClass(driver.id);
            
            html += `
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-t-4 ${colorClass}">
                    <div class="flex items-center gap-3 mb-4">
                        <img src="${driver.image}" alt="${driver.name}" 
                             class="w-16 h-16 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700">
                        <div>
                            <h3 class="font-bold text-lg text-gray-900 dark:text-white">${driver.name}</h3>
                            <p class="text-sm text-gray-500 dark:text-gray-400">${this.getCountryFlag(driver.country)} ${driver.country || 'Unknown'}</p>
                        </div>
                    </div>
                    
                    <div class="space-y-2 text-sm">
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Total Races:</span>
                            <span class="font-bold text-gray-900 dark:text-white">${stats.totalRaces}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Wins:</span>
                            <span class="font-bold text-green-600 dark:text-green-400">${stats.wins}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Podiums:</span>
                            <span class="font-bold text-blue-600 dark:text-blue-400">${stats.podiums}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Poles:</span>
                            <span class="font-bold text-purple-600 dark:text-purple-400">${stats.poles}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Avg Position:</span>
                            <span class="font-bold text-gray-900 dark:text-white">${stats.avgPosition}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Win Rate:</span>
                            <span class="font-bold text-gray-900 dark:text-white">${stats.winRate}%</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Podium Rate:</span>
                            <span class="font-bold text-gray-900 dark:text-white">${stats.podiumRate}%</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Finish Rate:</span>
                            <span class="font-bold text-gray-900 dark:text-white">${stats.finishRate}%</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">DNF Rate:</span>
                            <span class="font-bold text-red-600 dark:text-red-400">${stats.dnfRate}%</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">DNFs:</span>
                            <span class="font-bold text-gray-900 dark:text-white">${stats.dnfs}</span>
                        </div>
                        ${stats.avgQualifying > 0 ? `
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Avg Qualifying:</span>
                            <span class="font-bold text-gray-900 dark:text-white">${stats.avgQualifying}</span>
                        </div>
                        <div class="flex justify-between">
                            <span class="text-gray-600 dark:text-gray-400">Quali vs Race:</span>
                            <span class="font-bold ${stats.qualifyingVsRace > 0 ? 'text-red-600' : 'text-green-600'}">
                                ${stats.qualifyingVsRace > 0 ? '+' : ''}${stats.qualifyingVsRace}
                            </span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;
        container.classList.remove('hidden');
    }

    displayHeadToHeadBattles() {
        const container = document.getElementById('head-to-head-battles');
        if (!container || !this.comparisonData) return;
        
        const battle = this.comparisonData.battles;
        if (!battle || battle.commonRaces === 0) {
            container.classList.add('hidden');
            return;
        }

        // Sort drivers by finishesAhead (descending)
        const sortedDrivers = [...battle.drivers].sort((a, b) => b.finishesAhead - a.finishesAhead);
        const totalBattles = battle.commonRaces;
        
        let html = `
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <h4 class="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    🏆 Direct Battle Results - ${battle.commonRaces} Common Races
                </h4>
                
                <div class="space-y-4">
                    ${sortedDrivers.map((driver, index) => {
                        const percentage = totalBattles > 0 ? ((driver.finishesAhead / totalBattles) * 100).toFixed(1) : 0;
                        const colorClass = this.getDriverBattleColor(index);
                        
                        return `
                            <div class="flex items-center gap-4">
                                <div class="flex-1">
                                    <div class="flex justify-between items-center mb-2">
                                        <span class="font-semibold text-gray-900 dark:text-white">${driver.name}</span>
                                        <span class="text-lg font-bold ${colorClass}">${driver.finishesAhead} wins</span>
                                    </div>
                                    <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-6 overflow-hidden">
                                        <div class="${colorClass} h-full flex items-center justify-center text-white text-xs font-bold transition-all duration-500" 
                                             style="width: ${percentage}%">
                                            ${percentage}%
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <p class="text-sm text-gray-600 dark:text-gray-400 text-center">
                        📊 Based on ${battle.commonRaces} races where all drivers participated
                        ${battle.mode === 'same-team' ? ' in the SAME team' : ''}
                    </p>
                </div>
            </div>
        `;

        container.innerHTML = html;
        container.classList.remove('hidden');
    }

    displayComparisonCharts() {
        if (!this.comparisonData) return;
        
        // Destroy existing charts
        this.charts.forEach(chart => chart.destroy());
        this.charts.clear();
        
        const drivers = this.comparisonData.drivers;
        const names = drivers.map(d => d.name);
        const colors = drivers.map((d, i) => this.getChartColor(i));
        
        // Wins Chart
        this.createChart('wins-chart', 'Wins Comparison', names, 
            drivers.map(d => d.detailedStats.wins), colors);
        
        // Podiums Chart
        this.createChart('podiums-chart', 'Podiums Comparison', names,
            drivers.map(d => d.detailedStats.podiums), colors);
        
        // Finish Types Chart (Stacked)
        this.createStackedChart('finish-types-chart', 'Finish Types', names, [
            { label: 'Wins', data: drivers.map(d => d.detailedStats.wins), color: '#10b981' },
            { label: 'Podiums (2-3)', data: drivers.map(d => d.detailedStats.podiums - d.detailedStats.wins), color: '#3b82f6' },
            { label: 'Top 10', data: drivers.map(d => d.detailedStats.top10 - d.detailedStats.podiums), color: '#f59e0b' },
            { label: 'Other Finishes', data: drivers.map(d => d.detailedStats.otherFinishes), color: '#6b7280' },
            { label: 'DNFs', data: drivers.map(d => d.detailedStats.dnfs), color: '#ef4444' }
        ]);
        
        // DNF Rate Chart
        this.createChart('dnf-rate-chart', 'DNF Rate (%)', names,
            drivers.map(d => d.detailedStats.dnfRate), colors);
        
        // Qualifying vs Race Position Chart (grouped bars)
        this.createGroupedChart('avg-position-chart', 'Average Qualifying vs Race Position', names, [
            { label: 'Avg Qualifying', data: drivers.map(d => d.detailedStats.avgQualifying), color: '#8b5cf6' },
            { label: 'Avg Race', data: drivers.map(d => d.detailedStats.avgPosition), color: '#3b82f6' }
        ]);
        
        const chartsContainer = document.getElementById('comparison-charts');
        if (chartsContainer) chartsContainer.classList.remove('hidden');
    }

    displayPerformanceRadar() {
        const container = document.getElementById('performance-radar');
        if (!container || !this.comparisonData) return;
        
        const canvas = document.getElementById('radar-chart');
        if (!canvas) return;
        
        // Destroy existing radar chart
        if (this.charts.has('radar')) {
            this.charts.get('radar').destroy();
        }
        
        const drivers = this.comparisonData.drivers;
        
        // Normalize stats to 0-100 scale
        const maxValues = {
            winRate: Math.max(...drivers.map(d => d.detailedStats.winRate)),
            podiumRate: Math.max(...drivers.map(d => d.detailedStats.podiumRate)),
            finishRate: Math.max(...drivers.map(d => d.detailedStats.finishRate)),
            avgPosition: Math.max(...drivers.map(d => d.detailedStats.avgPosition)),
            poles: Math.max(...drivers.map(d => d.detailedStats.poles)),
            fastestLaps: Math.max(...drivers.map(d => d.detailedStats.fastestLaps))
        };
        
        const datasets = drivers.map((driver, index) => {
            const stats = driver.detailedStats;
            return {
                label: driver.name,
                data: [
                    stats.winRate,
                    stats.podiumRate,
                    stats.finishRate,
                    stats.totalRaces > 0 ? (100 - (stats.avgPosition / 20 * 100)) : 0, // Inverted avg position
                    maxValues.poles > 0 ? (stats.poles / maxValues.poles * 100) : 0,
                    maxValues.fastestLaps > 0 ? (stats.fastestLaps / maxValues.fastestLaps * 100) : 0
                ],
                backgroundColor: this.getChartColor(index, 0.2),
                borderColor: this.getChartColor(index),
                borderWidth: 2
            };
        });
        
        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Win Rate', 'Podium Rate', 'Finish Rate', 'Avg Position', 'Poles', 'Fastest Laps'],
                datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            stepSize: 20
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top'
                    },
                    title: {
                        display: true,
                        text: 'Performance Radar',
                        font: { size: 18, weight: 'bold' }
                    }
                }
            }
        });
        
        this.charts.set('radar', chart);
        container.classList.remove('hidden');
    }

    displayRaceResults() {
        const container = document.getElementById('race-results-table');
        if (!container || !this.comparisonData) return;
        
        const races = this.comparisonData.raceResults;
        if (races.length === 0) {
            container.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-4">No race results available</p>';
            return;
        }
        
        // Create filter dropdowns
        const championships = [...new Set(races.map(r => r.championship))];
        const years = [...new Set(races.map(r => r.year))].sort((a, b) => parseInt(b) - parseInt(a));
        
        let html = `
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                <div class="flex flex-wrap gap-4 mb-6 items-center justify-between">
                    <h3 class="text-2xl font-bold text-gray-900 dark:text-white">Race Results</h3>
                    <div class="flex flex-wrap gap-3">
                        <select id="filter-year" class="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white">
                            <option value="">All Years</option>
                            ${years.map(y => `<option value="${y}">${y}</option>`).join('')}
                        </select>
                        <select id="filter-championship" class="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white">
                            <option value="">All Championships</option>
                            ${championships.map(c => `<option value="${c}">${c}</option>`).join('')}
                        </select>
                        <button id="export-csv-btn" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition">
                            Export CSV
                        </button>
                    </div>
                </div>
                
                <div class="overflow-x-auto">
                    <table class="min-w-full" id="results-table">
                        <thead class="bg-gray-100 dark:bg-gray-700">
                            <tr>
                                <th class="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Year</th>
                                <th class="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Championship</th>
                                <th class="px-4 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">Race</th>
                                ${this.comparisonData.drivers.map(d => `
                                    <th class="px-4 py-3 text-center text-sm font-semibold text-gray-900 dark:text-white">${d.name}</th>
                                `).join('')}
                            </tr>
                        </thead>
                        <tbody id="results-tbody">
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        container.classList.remove('hidden');
        
        // Render table rows
        this.renderRaceResultsTable(races);
        
        // Setup filters
        document.getElementById('filter-year').addEventListener('change', () => this.filterRaceResults());
        document.getElementById('filter-championship').addEventListener('change', () => this.filterRaceResults());
        
        // Reconnect export button
        const exportBtn = document.getElementById('export-csv-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportToCSV());
        }
    }

    renderRaceResultsTable(races) {
        const tbody = document.getElementById('results-tbody');
        if (!tbody) return;
        
        let html = '';
        races.forEach(race => {
            html += `
                <tr class="border-t dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                    <td class="px-4 py-3 text-sm text-gray-900 dark:text-white">${race.year}</td>
                    <td class="px-4 py-3 text-sm text-gray-900 dark:text-white">${race.championship}</td>
                    <td class="px-4 py-3 text-sm text-gray-900 dark:text-white">${race.event}</td>
                    ${this.comparisonData.drivers.map(driver => {
                        const driverResult = race.drivers.find(d => d.driverId === driver.id);
                        if (!driverResult) {
                            return '<td class="px-4 py-3 text-center text-sm text-gray-400">-</td>';
                        }
                        const posClass = this.getPositionClass(driverResult.racePosition);
                        return `
                            <td class="px-4 py-3 text-center text-sm">
                                <span class="${posClass} font-semibold">${driverResult.racePosition}</span>
                                ${driverResult.qualifyingPosition !== 'N/A' ? `<br><span class="text-xs text-gray-500">(Q: ${driverResult.qualifyingPosition})</span>` : ''}
                            </td>
                        `;
                    }).join('')}
                </tr>
            `;
        });
        
        tbody.innerHTML = html;
    }

    filterRaceResults() {
        const yearFilter = document.getElementById('filter-year').value;
        const championshipFilter = document.getElementById('filter-championship').value;
        
        let filteredRaces = this.comparisonData.raceResults;
        
        if (yearFilter) {
            filteredRaces = filteredRaces.filter(r => r.year === yearFilter);
        }
        
        if (championshipFilter) {
            filteredRaces = filteredRaces.filter(r => r.championship === championshipFilter);
        }
        
        this.renderRaceResultsTable(filteredRaces);
    }

    exportToCSV() {
        if (!this.comparisonData) return;
        
        const races = this.comparisonData.raceResults;
        const drivers = this.comparisonData.drivers;
        
        let csv = 'Year,Championship,Race,';
        csv += drivers.map(d => `${d.name} Race,${d.name} Quali`).join(',') + '\n';
        
        races.forEach(race => {
            csv += `${race.year},${race.championship},${race.event},`;
            csv += drivers.map(driver => {
                const driverResult = race.drivers.find(d => d.driverId === driver.id);
                if (!driverResult) return '-,-';
                return `${driverResult.racePosition},${driverResult.qualifyingPosition}`;
            }).join(',') + '\n';
        });
        
        // Download CSV
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `head-to-head-${drivers.map(d => d.lastName).join('-')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    // Helper methods

    createChart(canvasId, label, labels, data, colors) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        if (this.charts.has(canvasId)) {
            this.charts.get(canvasId).destroy();
        }
        
        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label,
                    data,
                    backgroundColor: colors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: label,
                        font: { size: 16, weight: 'bold' }
                    }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
        
        this.charts.set(canvasId, chart);
    }

    createStackedChart(canvasId, title, labels, datasets) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        if (this.charts.has(canvasId)) {
            this.charts.get(canvasId).destroy();
        }
        
        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: datasets.map(ds => ({
                    label: ds.label,
                    data: ds.data,
                    backgroundColor: ds.color
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { stacked: true },
                    y: { stacked: true, beginAtZero: true }
                },
                plugins: {
                    title: { display: true, text: title, font: { size: 16, weight: 'bold' } }
                }
            }
        });
        
        this.charts.set(canvasId, chart);
    }

    createGroupedChart(canvasId, title, labels, datasets) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;
        
        if (this.charts.has(canvasId)) {
            this.charts.get(canvasId).destroy();
        }
        
        const ctx = canvas.getContext('2d');
        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: datasets.map(ds => ({
                    label: ds.label,
                    data: ds.data,
                    backgroundColor: ds.color,
                    borderWidth: 1
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: { display: true, text: title, font: { size: 16, weight: 'bold' } },
                    legend: { display: true, position: 'top' }
                },
                scales: {
                    y: { 
                        beginAtZero: true,
                        reverse: true,
                        title: { display: true, text: 'Position (lower is better)' }
                    }
                }
            }
        });
        
        this.charts.set(canvasId, chart);
    }

    getDriverColorClass(driverId) {
        const index = this.comparisonData.drivers.findIndex(d => d.id === driverId);
        const colors = [
            'border-blue-500',
            'border-green-500',
            'border-yellow-500',
            'border-red-500',
            'border-purple-500'
        ];
        return colors[index % colors.length];
    }

    getDriverBattleColor(index) {
        const colors = [
            'bg-blue-600 dark:bg-blue-500',
            'bg-green-600 dark:bg-green-500',
            'bg-yellow-600 dark:bg-yellow-500',
            'bg-red-600 dark:bg-red-500',
            'bg-purple-600 dark:bg-purple-500'
        ];
        return colors[index % colors.length];
    }

    getCountryFlag(country) {
        const flags = {
            'France': '🇫🇷',
            'Spain': '🇪🇸',
            'United Kingdom': '🇬🇧',
            'Italy': '🇮🇹',
            'Germany': '🇩🇪',
            'Netherlands': '🇳🇱',
            'Belgium': '🇧🇪',
            'Monaco': '🇲🇨',
            'Brazil': '🇧🇷',
            'Argentina': '🇦🇷',
            'Australia': '🇦🇺',
            'Japan': '🇯🇵',
            'USA': '🇺🇸',
            'Canada': '🇨🇦',
            'Mexico': '🇲🇽',
            'Finland': '🇫🇮',
            'Sweden': '🇸🇪',
            'Denmark': '🇩🇰',
            'Austria': '🇦🇹',
            'Switzerland': '🇨🇭',
            'Poland': '🇵🇱',
            'Russia': '🇷🇺',
            'China': '🇨🇳',
            'India': '🇮🇳',
            'South Africa': '🇿🇦',
            'New Zealand': '🇳🇿',
            'Colombia': '🇨🇴',
            'Venezuela': '🇻🇪',
            'Thailand': '🇹🇭',
            'Malaysia': '🇲🇾',
            'Singapore': '🇸🇬',
            'Indonesia': '🇮🇩',
            'Ireland': '🇮🇪',
            'Portugal': '🇵🇹',
            'Greece': '🇬🇷',
            'Czech Republic': '🇨🇿',
            'Hungary': '🇭🇺',
            'Norway': '🇳🇴'
        };
        return flags[country] || '🏁';
    }

    getChartColor(index, alpha = 1) {
        const colors = [
            `rgba(59, 130, 246, ${alpha})`,   // blue
            `rgba(16, 185, 129, ${alpha})`,   // green
            `rgba(245, 158, 11, ${alpha})`,   // yellow
            `rgba(239, 68, 68, ${alpha})`,    // red
            `rgba(168, 85, 247, ${alpha})`    // purple
        ];
        return colors[index % colors.length];
    }

    getPositionClass(position) {
        const posStr = String(position).toUpperCase();
        if (position === '1' || position === 1) return 'text-yellow-600 dark:text-yellow-400';
        if (position === '2' || position === 2) return 'text-gray-400';
        if (position === '3' || position === 3) return 'text-orange-600 dark:text-orange-400';
        if (posStr.includes('DNF') || posStr.includes('NC')) return 'text-red-600 dark:text-red-400';
        if (posStr.includes('DSQ')) return 'text-red-800 dark:text-red-600';
        return 'text-gray-900 dark:text-white';
    }

    clearComparison() {
        const sections = [
            'global-stats',
            'head-to-head-battles',
            'comparison-charts',
            'performance-radar',
            'race-results-table'
        ];
        
        sections.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.classList.add('hidden');
                el.innerHTML = '';
            }
        });
        
        this.charts.forEach(chart => chart.destroy());
        this.charts.clear();
        this.comparisonData = null;
    }
}

// Initialize and expose globally
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.headToHeadPage = new HeadToHeadPage();
    });
} else {
    window.headToHeadPage = new HeadToHeadPage();
}

export default HeadToHeadPage;
