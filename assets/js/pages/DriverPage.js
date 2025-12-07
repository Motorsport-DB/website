/**
 * MotorsportDB - Driver Page
 * Modern implementation of driver detail page
 */

import { apiService } from '../services/ApiService.js';
import { chartService } from '../services/ChartService.js';
import { themeService } from '../services/ThemeService.js';
import { createCardGrid } from '../components/CardComponent.js';
import { initTooltips } from '../components/TooltipComponent.js';
import { showLoadingOverlay, hideLoadingOverlay } from '../components/LoadingComponent.js';
import { calculateDriverStats, getSeasonPerformance, getDriverRadarData } from '../utils/dataProcessor.js';
import { calculateAge, formatDate, formatName } from '../utils/helpers.js';
import * as dom from '../utils/dom.js';

class DriverPage {
    constructor() {
        this.driverId = null;
        this.driver = null;
        this.charts = new Map();
        this.init();
    }

    /**
     * Initialize driver page
     */
    async init() {
        try {
            // Get driver ID from URL
            const urlParams = new URLSearchParams(window.location.search);
            this.driverId = urlParams.get('id');

            if (!this.driverId) {
                this.showError('Driver ID not specified');
                return;
            }

            // Initialize theme
            themeService.initToggleButton();

            // Show loading
            showLoadingOverlay('Loading driver data...');

            // Load driver data
            await this.loadDriverData();

            // Hide loading
            hideLoadingOverlay();

            // Display driver info
            this.displayDriverProfile();
            this.displayDriverStats();
            this.displayDriverCharts();
            this.displayDriverResults();

            // Load random cards
            await this.loadRandomCards();

            // Initialize tooltips (deferred)
            this.deferredInit();

        } catch (error) {
            console.error('Error initializing driver page:', error);
            hideLoadingOverlay();
            this.showError('Failed to load driver data');
        }
    }

    /**
     * Load driver data from API
     */
    async loadDriverData() {
        try {
            const response = await apiService.getDriver(this.driverId);
            
            if (!response) {
                throw new Error('Driver not found');
            }

            this.driver = response;
            
            // Calculate additional data
            this.driver.age = calculateAge(this.driver.dateOfBirth, this.driver.dateOfDeath);
            this.driver.stats = calculateDriverStats(this.driver);
            this.driver.seasonPerformance = getSeasonPerformance(this.driver);
            this.driver.radarData = getDriverRadarData(this.driver);

        } catch (error) {
            // Show user-friendly error message
            if (error.message.includes('404') || error.message.includes('not found')) {
                throw new Error(`Driver "${this.driverId}" not found in our database.`);
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                throw new Error('Network error. Please check your connection and try again.');
            } else {
                throw new Error('Unable to load driver data. Please try again later.');
            }
        }
    }

    /**
     * Display driver profile information
     */
    displayDriverProfile() {
        if (!this.driver) return;

        // Update page title and name - concatenate before formatName()
        const fullName = `${this.driver.firstName || ''} ${this.driver.lastName || ''}`.trim();
        const formattedName = formatName(fullName);
        document.title = `${formattedName} - MotorsportDB`;

        // Driver name
        const nameElem = document.getElementById('driver-name');
        if (nameElem) {
            nameElem.textContent = formattedName;
            console.log(`✅ Driver name set: ${formattedName}`);
        }

        // Driver picture
        const pictureElem = document.getElementById('driver-picture');
        if (pictureElem && this.driver.picture) {
            pictureElem.src = this.driver.picture;
            pictureElem.alt = `${this.driver.firstName} ${this.driver.lastName}`;
        }

        // Country flag
        const countryElem = document.getElementById('driver-country-img');
        if (countryElem && this.driver.country) {
            countryElem.src = `/assets/flags/${this.driver.country.toLowerCase()}.png`;
            countryElem.alt = this.driver.country;
        }

        // Date of birth
        const dobElem = document.getElementById('driver-dob');
        if (dobElem) {
            if (this.driver.dateOfBirth) {
                const ageText = this.driver.dateOfDeath ? '' : ` (${this.driver.age} years old)`;
                dobElem.textContent = `Date of birth: ${formatDate(this.driver.dateOfBirth)}${ageText}`;
            } else {
                dobElem.textContent = 'Date of birth: N/A';
            }
        }

        // Date of death
        const dodElem = document.getElementById('driver-dod');
        if (dodElem) {
            if (this.driver.dateOfDeath) {
                dodElem.textContent = `Date of death: ${formatDate(this.driver.dateOfDeath)} (${this.driver.age} years)`;
                dom.show(dodElem);
            } else {
                dom.hide(dodElem);
            }
        }
    }

    /**
     * Display Other Info section from driver's session data
     */
    displayOtherInfo() {
        const container = document.getElementById('otherInfoContainer');
        if (!container) return;

        // Collect all unique other_info fields from all sessions
        const otherInfoFields = new Set();
        const otherInfoData = {};

        if (this.driver && this.driver.seasons) {
            Object.values(this.driver.seasons).forEach(yearData => {
                Object.values(yearData).forEach(champData => {
                    Object.values(champData).forEach(eventData => {
                        Object.values(eventData).forEach(sessionResult => {
                            if (sessionResult.other_info) {
                                Object.entries(sessionResult.other_info).forEach(([key, value]) => {
                                    otherInfoFields.add(key);
                                    if (!otherInfoData[key]) {
                                        otherInfoData[key] = value;
                                    }
                                });
                            }
                        });
                    });
                });
            });
        }

        if (otherInfoFields.size === 0) {
            dom.hide(container);
            return;
        }

        // Create Other Info display
        let html = '<div class="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">';
        html += '<h3 class="text-xl font-bold mb-4 text-gray-900 dark:text-white">Additional Information</h3>';
        html += '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">';

        const fieldLabels = {
            carNumber: 'Car Number',
            laps: 'Laps',
            gap: 'Gap',
            interval: 'Interval',
            speed: 'Speed',
            fastestLap: 'Fastest Lap Time',
            lap_of_fastestLap: 'Fastest Lap #',
            grid: 'Grid Position',
            time: 'Time',
            retired: 'Retired',
            bestLap: 'Best Lap'
        };

        Array.from(otherInfoFields).sort().forEach(field => {
            const label = fieldLabels[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            html += '<div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">';
            html += `<p class="text-sm text-gray-600 dark:text-gray-400">${label}</p>`;
            html += `<p class="text-lg font-semibold text-gray-900 dark:text-white">Available in sessions</p>`;
            html += '</div>';
        });

        html += '</div>';
        html += '</div>';

        container.innerHTML = html;
        dom.show(container);
    }

    /**
     * Display driver statistics
     */
    displayDriverStats() {
        if (!this.driver || !this.driver.stats) return;

        const stats = this.driver.stats;

        // Total races
        const racesElem = document.getElementById('totalRaces');
        if (racesElem) {
            racesElem.textContent = stats.totalRaces || 0;
        }

        // Total wins
        const winsElem = document.getElementById('totalWins');
        if (winsElem) {
            winsElem.textContent = stats.wins || 0;
        }

        // Total podiums
        const podiumsElem = document.getElementById('totalPodiums');
        if (podiumsElem) {
            podiumsElem.textContent = stats.podiums || 0;
        }

        // Total championships
        const champsElem = document.getElementById('totalChampionships');
        if (champsElem) {
            champsElem.textContent = stats.championships || 0;
        }
    }

    /**
     * Display driver performance charts
     */
    displayDriverCharts() {
        console.log("📊 DriverPage.displayDriverCharts() called");
        console.log("  Driver data:", this.driver);
        console.log("  Current charts Map size:", this.charts.size);
        
        if (!this.driver) {
            console.warn("⚠️  No driver data, skipping charts");
            return;
        }

        // Destroy existing charts properly through ChartService
        const chartIds = [
            'performanceChart',
            'raceDistributionChart',
            'qualifyingDistributionChart',
            'radarChart',
            'finishRateChart'
        ];
        
        console.log("🗑️  Destroying existing charts:", chartIds);
        chartIds.forEach(id => {
            console.log(`    Destroying chart: ${id}`);
            chartService.destroyChart(id);
        });
        this.charts.clear();
        console.log("✅ All charts destroyed, Map cleared");

        // Performance over time chart
        console.log("📈 Creating performance chart...");
        this.createPerformanceChart();

        // Results distribution charts
        console.log("📈 Creating results distribution charts...");
        this.createResultsDistributionCharts();

        // Performance radar chart
        console.log("📈 Creating radar chart...");
        this.createRadarChart();

        // Finish rate chart
        console.log("📈 Creating finish rate chart...");
        this.createFinishRateChart();
        
        console.log("✅ All charts created successfully");
        console.log("  Final charts Map size:", this.charts.size);
    }

    /**
     * Create performance over time chart
     */
    createPerformanceChart() {
        const canvas = document.getElementById('performanceChart');
        if (!canvas || !this.driver.seasonPerformance) return;

        const data = this.driver.seasonPerformance;
        const labels = Object.keys(data).sort();
        const avgPositions = labels.map(season => data[season].avgPosition);

        const chart = chartService.createLineChart('performanceChart', {
            labels: labels,
            datasets: [{
                label: 'Average Position',
                data: avgPositions,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
            }]
        }, {
            reverse: true, // Lower position is better
            title: 'Average Position by Season'
        });

        this.charts.set('performance', chart);
    }

    /**
     * Create results distribution charts
     */
    createResultsDistributionCharts() {
        if (!this.driver.stats) return;

        const stats = this.driver.stats;

        // Race distribution
        const raceCanvas = document.getElementById('raceDistributionChart');
        if (raceCanvas) {
            const chart = chartService.createDoughnutChart('raceDistributionChart',
                ['Wins', 'Podiums', 'Points', 'Other'],
                [
                    stats.wins || 0,
                    (stats.podiums || 0) - (stats.wins || 0),
                    (stats.points || 0) - (stats.podiums || 0),
                    (stats.totalRaces || 0) - (stats.points || 0)
                ]
            );
            this.charts.set('raceDistribution', chart);
        }

        // Qualifying distribution
        const qualifyingCanvas = document.getElementById('qualifyingDistributionChart');
        if (qualifyingCanvas) {
            const chart = chartService.createDoughnutChart('qualifyingDistributionChart',
                ['Top 3', 'Top 10', 'Other'],
                [
                    stats.qualifyingTop3 || 0,
                    (stats.qualifyingTop10 || 0) - (stats.qualifyingTop3 || 0),
                    (stats.totalQualifying || 0) - (stats.qualifyingTop10 || 0)
                ]
            );
            this.charts.set('qualifyingDistribution', chart);
        }

        // Mobile combined chart
        const mobileCanvas = document.getElementById('resultsDistributionChartMobile');
        if (mobileCanvas) {
            const chart = chartService.createBarChart('resultsDistributionChartMobile', ['Wins', 'Podiums', 'Points', 'Top 10'], [{
                label: 'Race Results',
                data: [stats.wins, stats.podiums, stats.points, stats.top10Finishes],
                backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b']
            }]);
            this.charts.set('mobileDistribution', chart);
        }
    }

    /**
     * Create performance radar chart
     */
    createRadarChart() {
        const canvas = document.getElementById('performanceRadarChart');
        if (!canvas || !this.driver.radarData) return;

        const chart = chartService.createRadarChart('performanceRadarChart', this.driver.radarData.labels, [{
            label: 'Performance',
            data: this.driver.radarData.values,
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.2)',
        }]);

        this.charts.set('radar', chart);
    }

    /**
     * Create finish rate chart (detailed distribution)
     */
    createFinishRateChart() {
        const canvas = document.getElementById('finishRateChart');
        if (!canvas || !this.driver.stats) return;

        const stats = this.driver.stats;

        const chart = chartService.createDoughnutChart('finishRateChart',
            ['Wins', 'Podiums', 'Top 10', 'Outside Top 10', 'DNF/DSQ'],
            [
                stats.wins || 0,
                (stats.podiums || 0) - (stats.wins || 0),
                (stats.top10Finishes || 0) - (stats.podiums || 0),
                stats.outsideTop10 || 0,
                (stats.dnfs || 0) + (stats.disqualifications || 0)
            ]
        );

        this.charts.set('finishRate', chart);
    }

    /**
     * Display detailed driver results
     */
    displayDriverResults() {
        console.log("📋 displayDriverResults called");
        const container = document.getElementById('resultsContainer');
        if (!container) {
            console.error("❌ resultsContainer element not found");
            return;
        }
        
        if (!this.driver || !this.driver.seasons) {
            console.warn("⚠️  No driver or seasons data");
            container.innerHTML = '<div class="container mx-auto px-6 py-8"><p class="text-gray-600 dark:text-gray-400">No results data available.</p></div>';
            return;
        }

        console.log("  Processing seasons:", Object.keys(this.driver.seasons));

        // Initialize filter state
        if (!this.sessionFilter) {
            this.sessionFilter = 'all'; // 'all', 'qualifying', 'race'
        }

        let html = '<div class="container mx-auto px-6 py-8">';
        html += '<div class="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">';
        html += '<h2 class="text-3xl font-bold text-gray-900 dark:text-white">Detailed Results</h2>';
        
        // Controls: Collapse/Expand + Session Filter
        html += '<div class="flex flex-col sm:flex-row items-start sm:items-center gap-3">';
        
        // Collapse/Expand buttons
        html += '<div class="flex gap-2">';
        html += `<button onclick="window.driverPage.collapseAllEvents()" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium">Collapse All</button>`;
        html += `<button onclick="window.driverPage.expandAllEvents()" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium">Expand All</button>`;
        html += '</div>';
        
        // Session filter toggles
        html += '<div class="flex gap-2">';
        html += `<button onclick="window.driverPage.setSessionFilter('all')" class="px-4 py-2 rounded-lg transition-colors text-sm font-medium ${this.sessionFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'}">All Sessions</button>`;
        html += `<button onclick="window.driverPage.setSessionFilter('qualifying')" class="px-4 py-2 rounded-lg transition-colors text-sm font-medium ${this.sessionFilter === 'qualifying' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'}">Qualifying</button>`;
        html += `<button onclick="window.driverPage.setSessionFilter('race')" class="px-4 py-2 rounded-lg transition-colors text-sm font-medium ${this.sessionFilter === 'race' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'}">Race</button>`;
        html += '</div>';
        
        html += '</div>'; // Close controls
        html += '</div>'; // Close header

        let champIndex = 0;
        // Iterate through all years
        Object.entries(this.driver.seasons).forEach(([year, yearData]) => {
            // Iterate through championships
            Object.entries(yearData).forEach(([championship, championshipData]) => {
                const champId = `champ-${champIndex++}`;
                html += `<div class="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">`;
                const champDisplay = championship.replace(/_/g, ' ');
                
                // Championship header
                html += `<div class="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 text-white p-4 cursor-pointer" onclick="window.driverPage.toggleAccordion('${champId}');">`;
                html += `<div class="flex items-center justify-between">`;
                html += `<h3 class="text-xl font-bold">`;
                html += `<a href="/race?id=${championship}&year=${year}" class="hover:underline" onclick="event.stopPropagation();">${champDisplay} ${year}</a>`;
                html += `</h3>`;
                html += `<svg id="${champId}-icon" class="w-6 h-6 accordion-icon rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">`;
                html += `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>`;
                html += `</svg>`;
                html += `</div>`;
                html += `</div>`;
                
                // Championship content
                html += `<div id="${champId}" class="accordion-content expanded">`;
                
                // Group events
                const events = Object.entries(championshipData);
                let eventIndex = 0;
                
                events.forEach(([event, eventData]) => {
                    const eventId = `event-${champIndex}-${eventIndex++}`;
                    
                    // Filter sessions based on sessionFilter
                    const filteredSessions = Object.entries(eventData).filter(([session, result]) => {
                        if (this.sessionFilter === 'all') return true;
                        if (this.sessionFilter === 'qualifying') {
                            return session.toLowerCase().includes('qualifying') || 
                                   session.toLowerCase().includes('quali');
                        }
                        if (this.sessionFilter === 'race') {
                            return session.toLowerCase().includes('race') && 
                                   !session.toLowerCase().includes('practice');
                        }
                        return true;
                    });
                    
                    // Skip event if no sessions match filter
                    if (filteredSessions.length === 0) return;
                    
                    // Event header (clickable accordion)
                    html += `<div class="border-t border-gray-200 dark:border-gray-700">`;
                    html += `<div class="bg-gray-100 dark:bg-gray-700 px-4 py-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors event-accordion" onclick="window.driverPage.toggleAccordion('${eventId}');">`;
                    html += `<div class="flex items-center justify-between">`;
                    html += `<span class="font-bold text-gray-900 dark:text-white">${event.replace(/_/g, ' ')}</span>`;
                    html += `<svg id="${eventId}-icon" class="w-5 h-5 text-gray-600 dark:text-gray-300 accordion-icon rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">`;
                    html += `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>`;
                    html += `</svg>`;
                    html += `</div>`;
                    html += `</div>`;
                    
                    // Event results table
                    html += `<div id="${eventId}" class="accordion-content expanded">`;
                    html += `<div class="overflow-x-auto">`;
                    html += `<table class="min-w-full bg-white dark:bg-gray-800">`;
                    html += `<thead class="bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white">`;
                    html += `<tr>`;
                    html += `<th class="px-4 py-2 text-left text-sm font-semibold">Session</th>`;
                    html += `<th class="px-4 py-2 text-center text-sm font-semibold">Position</th>`;
                    html += `<th class="px-4 py-2 text-left text-sm font-semibold">Team</th>`;
                    html += `<th class="px-4 py-2 text-center text-sm font-semibold">Points</th>`;
                    html += `<th class="px-4 py-2 text-center text-sm font-semibold">Fastest Lap</th>`;
                    html += `<th class="px-4 py-2 text-center text-sm font-semibold">Car #</th>`;
                    html += `<th class="px-4 py-2 text-center text-sm font-semibold">Laps</th>`;
                    html += `<th class="px-4 py-2 text-center text-sm font-semibold">Gap</th>`;
                    html += `<th class="px-4 py-2 text-center text-sm font-semibold">Avg Speed</th>`;
                    html += `</tr>`;
                    html += `</thead>`;
                    html += `<tbody>`;
                    
                    // Iterate through filtered sessions
                    filteredSessions.forEach(([session, result]) => {
                        const positionClass = this.getPositionClass(result.position, session);
                        const teamDisplay = result.team ? result.team.replace(/_/g, ' ') : 'N/A';
                        const teamLink = result.team ? 
                            `<a href="/team?id=${result.team}" class="text-blue-600 dark:text-blue-400 hover:underline">${teamDisplay}</a>` : 
                            'N/A';
                        
                        // Extract other_info fields
                        const otherInfo = result.other_info || {};
                        const carNumber = otherInfo.Car_number || otherInfo.carNumber || '-';
                        const laps = otherInfo.Laps || otherInfo.laps || '-';
                        const gap = otherInfo.Gap || otherInfo.gap || '-';
                        const avgSpeed = otherInfo.Average_speed || otherInfo.average_speed || '-';
                        
                        html += `<tr class="border-t border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">`;
                        html += `<td class="px-4 py-2 text-gray-900 dark:text-white">${session}</td>`;
                        html += `<td class="px-4 py-2 text-center ${positionClass}">${result.position || 'N/A'}</td>`;
                        html += `<td class="px-4 py-2">${teamLink}</td>`;
                        html += `<td class="px-4 py-2 text-center text-gray-900 dark:text-white">${result.points || 0}</td>`;
                        html += `<td class="px-4 py-2 text-center text-gray-900 dark:text-white">${result.fastest_lap || result.fastestLap || '-'}</td>`;
                        html += `<td class="px-4 py-2 text-center text-gray-600 dark:text-gray-400 text-sm">${carNumber}</td>`;
                        html += `<td class="px-4 py-2 text-center text-gray-600 dark:text-gray-400 text-sm">${laps}</td>`;
                        html += `<td class="px-4 py-2 text-center text-gray-600 dark:text-gray-400 text-sm">${gap}</td>`;
                        html += `<td class="px-4 py-2 text-center text-gray-600 dark:text-gray-400 text-sm">${avgSpeed}</td>`;
                        html += `</tr>`;
                    });
                    
                    html += `</tbody>`;
                    html += `</table>`;
                    html += `</div>`;
                    html += `</div>`; // Close event content
                    html += `</div>`; // Close event section
                });
                
                html += `</div>`; // Close championship content
                html += `</div>`; // Close championship card
            });
        });

        html += '</div>';
        container.innerHTML = html;
        console.log("✅ Results displayed successfully");
    }

    /**
     * Get CSS class for position display with color coding
     * @param {string|number} position - Position value
     * @param {string} session - Session name
     * @returns {string} CSS classes
     */
    getPositionClass(position, session) {
        // No color for practice sessions
        if (session.toLowerCase().includes('practice') || session.toLowerCase().includes('free')) {
            return 'text-gray-900 dark:text-white';
        }
        
        const pos = String(position).toLowerCase();
        
        // Gold for 1st place
        if (position === '1' || position === 1) {
            return 'text-yellow-600 dark:text-yellow-400 font-bold';
        }
        
        // Silver for 2nd place
        if (position === '2' || position === 2) {
            return 'text-gray-400 font-bold';
        }
        
        // Bronze for 3rd place
        if (position === '3' || position === 3) {
            return 'text-orange-600 dark:text-orange-400 font-bold';
        }
        
        // Red for DNF/DSQ/DNS
        if (pos.includes('dnf') || pos.includes('dsq') || pos.includes('dns') || 
            pos.includes('ret') || pos.includes('wd')) {
            return 'text-red-600 dark:text-red-400 font-bold';
        }
        
        // Default styling
        return 'text-gray-900 dark:text-white';
    }

    /**
     * Toggle accordion section with smooth animation
     * @param {string} elementId - ID of the accordion content element
     */
    toggleAccordion(elementId) {
        const content = document.getElementById(elementId);
        const icon = document.getElementById(`${elementId}-icon`);
        
        if (!content) return;
        
        if (content.classList.contains('collapsed')) {
            // Expand
            content.classList.remove('collapsed');
            content.classList.add('expanded');
            if (icon) icon.classList.add('rotate-180');
        } else {
            // Collapse
            content.classList.remove('expanded');
            content.classList.add('collapsed');
            if (icon) icon.classList.remove('rotate-180');
        }
    }

    /**
     * Collapse all event sections
     */
    collapseAllEvents() {
        document.querySelectorAll('[id^="event-"]').forEach(el => {
            if (!el.classList.contains('collapsed')) {
                el.classList.remove('expanded');
                el.classList.add('collapsed');
                const icon = document.getElementById(`${el.id}-icon`);
                if (icon) icon.classList.remove('rotate-180');
            }
        });
    }

    /**
     * Expand all event sections
     */
    expandAllEvents() {
        document.querySelectorAll('[id^="event-"]').forEach(el => {
            if (el.classList.contains('collapsed')) {
                el.classList.remove('collapsed');
                el.classList.add('expanded');
                const icon = document.getElementById(`${el.id}-icon`);
                if (icon) icon.classList.add('rotate-180');
            }
        });
    }

    /**
     * Set session filter and refresh display
     * @param {string} filter - 'all', 'qualifying', or 'race'
     */
    setSessionFilter(filter) {
        this.sessionFilter = filter;
        this.displayDriverResults();
    }

    /**
     * Group results by championship and season (DEPRECATED - using seasons structure directly)
     */
    groupResultsByChampionship(results) {
        const grouped = {};

        for (const result of results) {
            const championship = result.championship || 'Other';
            const season = result.season || 'Unknown';

            if (!grouped[championship]) {
                grouped[championship] = {};
            }

            if (!grouped[championship][season]) {
                grouped[championship][season] = [];
            }

            grouped[championship][season].push(result);
        }

        return grouped;
    }

    /**
     * Create results table HTML (DEPRECATED - inline in displayDriverResults)
     */
    createResultsTable(season, results) {
        let html = `<div class="mb-6 bg-gray-100 dark:bg-gray-800 rounded-lg p-4">`;
        html += `<h4 class="text-xl font-semibold mb-3 text-gray-900 dark:text-white">${season}</h4>`;
        html += `<div class="overflow-x-auto">`;
        html += `<table class="min-w-full bg-white dark:bg-gray-700 rounded-lg">`;
        html += `<thead class="bg-gray-200 dark:bg-gray-600">`;
        html += `<tr>`;
        html += `<th class="px-4 py-2 text-left">Event</th>`;
        html += `<th class="px-4 py-2 text-left">Session</th>`;
        html += `<th class="px-4 py-2 text-center">Position</th>`;
        html += `<th class="px-4 py-2 text-left">Team</th>`;
        html += `<th class="px-4 py-2 text-center">Points</th>`;
        html += `</tr>`;
        html += `</thead>`;
        html += `<tbody>`;

        for (const result of results) {
            const positionClass = result.position <= 3 ? 'text-green-600 dark:text-green-400 font-bold' : '';
            html += `<tr class="border-t dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600">`;
            html += `<td class="px-4 py-2">${result.event || 'N/A'}</td>`;
            html += `<td class="px-4 py-2">${result.session || 'N/A'}</td>`;
            html += `<td class="px-4 py-2 text-center ${positionClass}">${result.position || 'N/A'}</td>`;
            html += `<td class="px-4 py-2">${result.team || 'N/A'}</td>`;
            html += `<td class="px-4 py-2 text-center">${result.points || 0}</td>`;
            html += `</tr>`;
        }

        html += `</tbody>`;
        html += `</table>`;
        html += `</div>`;
        html += `</div>`;

        return html;
    }

    /**
     * Load random cards
     */
    async loadRandomCards() {
        try {
            const response = await fetch('/api/cards.php');
            const data = await response.json();

            if (data && data.cards) {
                const cardsData = data.cards.map(card => ({
                    name: card.name || `${card.firstName || ''} ${card.lastName || ''}`.trim(),
                    image: card.image,
                    url: card.url,
                    type: card.type,
                }));

                createCardGrid('section_randomCards', cardsData, {
                    type: 'mixed',
                    columns: 4,
                    showStats: false,
                });
            }
        } catch (error) {
            console.error('Error loading random cards:', error);
        }
    }

    /**
     * Deferred initialization (tooltips, etc.)
     */
    deferredInit() {
        if (window.innerWidth > 768) {
            if ('requestIdleCallback' in window) {
                requestIdleCallback(() => {
                    initTooltips();
                });
            } else {
                setTimeout(() => {
                    initTooltips();
                }, 1000);
            }
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        const container = document.getElementById('resultsContainer');
        if (container) {
            container.innerHTML = `
                <div class="container mx-auto px-6 py-8">
                    <div class="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-200 px-4 py-3 rounded">
                        <p class="font-bold">Error</p>
                        <p>${message}</p>
                    </div>
                </div>
            `;
        }
    }
}

// Initialize page when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.driverPage = new DriverPage();
    });
} else {
    window.driverPage = new DriverPage();
}

export default DriverPage;
