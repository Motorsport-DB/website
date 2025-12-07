/**
 * MotorsportDB - Team Page
 * Modern implementation of team detail page
 */

import { apiService } from '../services/ApiService.js';
import { chartService } from '../services/ChartService.js';
import { themeService } from '../services/ThemeService.js';
import { createCardGrid } from '../components/CardComponent.js';
import { initTooltips } from '../components/TooltipComponent.js';
import { showLoadingOverlay, hideLoadingOverlay } from '../components/LoadingComponent.js';
import { calculateTeamStats, getTeamSeasonPerformance } from '../utils/dataProcessor.js';
import { formatDate, formatName } from '../utils/helpers.js';
import * as dom from '../utils/dom.js';

class TeamPage {
    constructor() {
        this.teamId = null;
        this.team = null;
        this.charts = new Map();
        this.init();
    }

    async init() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            this.teamId = urlParams.get('id');

            if (!this.teamId) {
                this.showError('Team ID not specified');
                return;
            }

            themeService.initToggleButton();
            showLoadingOverlay('Loading team data...');

            await this.loadTeamData();
            hideLoadingOverlay();

            this.displayTeamProfile();
            this.displayTeamStats();
            this.displayTeamCharts();
            this.displayTeamResults();
            await this.loadRandomCards();
            this.deferredInit();

        } catch (error) {
            console.error('Error initializing team page:', error);
            hideLoadingOverlay();
            this.showError('Failed to load team data');
        }
    }

    async loadTeamData() {
        try {
            const response = await apiService.getTeam(this.teamId);
            if (!response) {
                throw new Error('Team not found');
            }
            this.team = response;
            this.team.stats = calculateTeamStats(this.team);
            this.team.seasonPerformance = getTeamSeasonPerformance(this.team);
        } catch (error) {
            // Show user-friendly error message
            if (error.message.includes('404') || error.message.includes('not found')) {
                throw new Error(`Team "${this.teamId}" not found in our database.`);
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                throw new Error('Network error. Please check your connection and try again.');
            } else {
                throw new Error('Unable to load team data. Please try again later.');
            }
        }
    }

    displayTeamProfile() {
        if (!this.team) return;

        // Remove underscores from team name for display
        const teamDisplayName = (this.team.name || 'Unknown Team').replace(/_/g, ' ');
        document.title = `${teamDisplayName} - MotorsportDB`;

        const nameElem = document.getElementById('team-name');
        if (nameElem) nameElem.textContent = teamDisplayName;

        const pictureElem = document.getElementById('team-picture');
        if (pictureElem && this.team.picture) {
            pictureElem.src = this.team.picture;
            pictureElem.alt = teamDisplayName;
        }

        const countryElem = document.getElementById('team-country-img');
        if (countryElem && this.team.country) {
            countryElem.src = `/assets/flags/${this.team.country.toLowerCase()}.png`;
            countryElem.alt = this.team.country;
        }

        // Handle creation date - can be string or array
        const foundedElem = document.getElementById('team-founded');
        if (foundedElem && this.team.creationDate) {
            const dateDisplay = Array.isArray(this.team.creationDate) 
                ? this.team.creationDate.join(', ') 
                : this.team.creationDate;
            foundedElem.textContent = `Founded: ${dateDisplay}`;
            console.log(`✅ Team founded set: ${dateDisplay}`);
        }
    }

    displayTeamStats() {
        if (!this.team || !this.team.stats) return;

        const stats = this.team.stats;

        // Map stats correctly - calculateTeamStats now returns: totalRaces, wins, podiums (P2-P3), top10, other, dnf, poles, constructorTitles
        const statsMap = {
            'totalRaces': stats.totalRaces || 0,
            'totalWins': stats.wins || 0,
            'totalPodiums': (stats.wins || 0) + (stats.podiums || 0), // P1-P3 combined
            'totalChampionships': stats.constructorTitles || 0
        };

        Object.entries(statsMap).forEach(([statKey, value]) => {
            const elem = document.getElementById(statKey);
            if (elem) elem.textContent = value;
        });
    }

    displayTeamCharts() {
        console.log("📊 TeamPage.displayTeamCharts() called");
        console.log("  Team data:", this.team);
        console.log("  Current charts Map size:", this.charts.size);
        
        if (!this.team) {
            console.warn("⚠️  No team data, skipping charts");
            return;
        }
        
        // Destroy existing charts properly through ChartService
        const chartIds = ['performanceChart', 'resultsChart'];
        console.log("🗑️  Destroying existing charts:", chartIds);
        chartIds.forEach(id => {
            console.log(`    Destroying chart: ${id}`);
            chartService.destroyChart(id);
        });
        this.charts.clear();
        console.log("✅ All charts destroyed, Map cleared");
        
        console.log("📈 Creating performance chart...");
        this.createPerformanceChart();
        
        console.log("📈 Creating results distribution chart...");
        this.createResultsDistributionChart();
        
        console.log("✅ All charts created successfully");
        console.log("  Final charts Map size:", this.charts.size);
    }

    createPerformanceChart() {
        const canvas = document.getElementById('performanceChart');
        if (!canvas || !this.team.seasonPerformance) return;

        const data = this.team.seasonPerformance;
        const labels = Object.keys(data).sort();
        const wins = labels.map(season => data[season].wins || 0);

        const chart = chartService.createBarChart('performanceChart', labels, [{
            label: 'Wins',
            data: wins,
            backgroundColor: '#3b82f6'
        }]);

        this.charts.set('performance', chart);
    }

    createResultsDistributionChart() {
        const canvas = document.getElementById('resultsDistributionChart');
        if (!canvas || !this.team.stats) return;

        const stats = this.team.stats;
        const chart = chartService.createDoughnutChart('resultsDistributionChart',
            ['Wins', 'Podiums (P2-P3)', 'Top 10 (P4-P10)', 'Other (P11+)', 'DNF/DSQ'],
            [
                stats.wins || 0,
                stats.podiums || 0, // Now only P2-P3
                stats.top10 || 0,
                stats.other || 0,
                stats.dnf || 0
            ]
        );

        this.charts.set('distribution', chart);
    }

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

    displayTeamResults() {
        console.log("📋 displayTeamResults called");
        const container = document.getElementById('resultsContainer');
        if (!container) {
            console.error("❌ resultsContainer element not found");
            return;
        }
        
        if (!this.team || !this.team.seasons) {
            console.warn("⚠️  No team or seasons data");
            container.innerHTML = '<div class="container mx-auto px-6 py-8"><p class="text-gray-600 dark:text-gray-400">No results data available.</p></div>';
            return;
        }

        console.log("  Processing seasons:", Object.keys(this.team.seasons));

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
        html += `<button onclick="window.teamPage.collapseAllEvents()" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium">Collapse All</button>`;
        html += `<button onclick="window.teamPage.expandAllEvents()" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium">Expand All</button>`;
        html += '</div>';
        
        // Session filter toggles
        html += '<div class="flex gap-2">';
        html += `<button onclick="window.teamPage.setSessionFilter('all')" class="px-4 py-2 rounded-lg transition-colors text-sm font-medium ${this.sessionFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'}">All Sessions</button>`;
        html += `<button onclick="window.teamPage.setSessionFilter('qualifying')" class="px-4 py-2 rounded-lg transition-colors text-sm font-medium ${this.sessionFilter === 'qualifying' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'}">Qualifying</button>`;
        html += `<button onclick="window.teamPage.setSessionFilter('race')" class="px-4 py-2 rounded-lg transition-colors text-sm font-medium ${this.sessionFilter === 'race' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'}">Race</button>`;
        html += '</div>';
        
        html += '</div>'; // Close controls
        html += '</div>'; // Close header

        let champIndex = 0;
        // Iterate through all years
        Object.entries(this.team.seasons).forEach(([year, yearData]) => {
            // Iterate through championships
            Object.entries(yearData).forEach(([championship, championshipData]) => {
                const champId = `champ-${champIndex++}`;
                html += `<div class="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">`;
                const champDisplay = championship.replace(/_/g, ' ');
                
                // Championship header
                html += `<div class="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 text-white p-4 cursor-pointer" onclick="window.teamPage.toggleAccordion('${champId}');">`;
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
                    const filteredSessions = Object.entries(eventData).filter(([session, sessionResult]) => {
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
                    html += `<div class="bg-gray-100 dark:bg-gray-700 px-4 py-3 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors event-accordion" onclick="window.teamPage.toggleAccordion('${eventId}');">`;
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
                    html += `<th class="px-4 py-2 text-left text-sm font-semibold">Driver</th>`;
                    html += `<th class="px-4 py-2 text-center text-sm font-semibold">Position</th>`;
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
                    filteredSessions.forEach(([session, sessionData]) => {
                        // For teams, sessionData contains multiple car numbers (drivers)
                        Object.entries(sessionData).forEach(([carNumber, result]) => {
                            const positionClass = this.getPositionClass(result.position, session);
                            
                            // Get driver name from drivers array
                            let driverDisplay = 'N/A';
                            let driverLink = 'N/A';
                            if (result.drivers && result.drivers.length > 0) {
                                const driverName = result.drivers.join(', ').replace(/_/g, ' ');
                                const driverId = result.drivers[0]; // Link to first driver
                                driverDisplay = driverName;
                                driverLink = `<a href="/driver?id=${driverId}" class="text-blue-600 dark:text-blue-400 hover:underline">${driverDisplay}</a>`;
                            }
                            
                            // Extract other_info fields
                            const otherInfo = result.other_info || {};
                            const carNum = otherInfo.Car_number || otherInfo.carNumber || carNumber;
                            const laps = otherInfo.Laps || otherInfo.laps || '-';
                            const gap = otherInfo.Gap || otherInfo.gap || '-';
                            const avgSpeed = otherInfo.Average_speed || otherInfo.average_speed || '-';
                            
                            html += `<tr class="border-t border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">`;
                            html += `<td class="px-4 py-2 text-gray-900 dark:text-white">${session}</td>`;
                            html += `<td class="px-4 py-2">${driverLink}</td>`;
                            html += `<td class="px-4 py-2 text-center ${positionClass}">${result.position || 'N/A'}</td>`;
                            html += `<td class="px-4 py-2 text-center text-gray-900 dark:text-white">${result.points || 0}</td>`;
                            html += `<td class="px-4 py-2 text-center text-gray-900 dark:text-white">${result.fastest_lap || result.fastestLap || '-'}</td>`;
                            html += `<td class="px-4 py-2 text-center text-gray-600 dark:text-gray-400 text-sm">${carNum}</td>`;
                            html += `<td class="px-4 py-2 text-center text-gray-600 dark:text-gray-400 text-sm">${laps}</td>`;
                            html += `<td class="px-4 py-2 text-center text-gray-600 dark:text-gray-400 text-sm">${gap}</td>`;
                            html += `<td class="px-4 py-2 text-center text-gray-600 dark:text-gray-400 text-sm">${avgSpeed}</td>`;
                            html += `</tr>`;
                        });
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
        console.log("✅ Team results displayed successfully");
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
        this.displayTeamResults();
    }

    /**
     * Display Other Info section from team's session data
     */
    displayOtherInfo() {
        const container = document.getElementById('otherInfoContainer');
        if (!container) return;

        // Collect all unique other_info fields from all sessions
        const otherInfoFields = new Set();
        const otherInfoData = {};

        if (this.team && this.team.seasons) {
            Object.values(this.team.seasons).forEach(yearData => {
                Object.values(yearData).forEach(champData => {
                    Object.values(champData).forEach(eventData => {
                        Object.values(eventData).forEach(sessionData => {
                            // For teams, sessionData contains car numbers
                            Object.values(sessionData).forEach(result => {
                                if (result.other_info) {
                                    Object.entries(result.other_info).forEach(([key, value]) => {
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

    deferredInit() {
        if (window.innerWidth > 768) {
            if ('requestIdleCallback' in window) {
                requestIdleCallback(() => initTooltips());
            } else {
                setTimeout(() => initTooltips(), 1000);
            }
        }
    }

    showError(message) {
        const main = document.querySelector('main');
        if (main) {
            main.innerHTML = `
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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.teamPage = new TeamPage();
    });
} else {
    window.teamPage = new TeamPage();
}

export default TeamPage;
