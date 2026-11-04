/**
 * MotorsportDB - Race Page
 * Modern implementation of race/championship detail page
 */

import { apiService } from '../services/ApiService.js';
import { chartService } from '../services/ChartService.js';
import { themeService } from '../services/ThemeService.js';
import { createCardGrid } from '../components/CardComponent.js';
import { initTooltips } from '../components/TooltipComponent.js';
import { showLoadingOverlay, hideLoadingOverlay } from '../components/LoadingComponent.js';
import { isRaceSession, isQualifyingSession } from '../utils/dataProcessor.js';
import { formatDisplayName, escapeHtml } from '../utils/helpers.js';
import * as dom from '../utils/dom.js';

class RacePage {
    constructor() {
        this.raceId = null;
        this.year = null;
        this.raceData = null;
        this.charts = new Map();
        this.init();
    }

    async init() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            this.raceId = urlParams.get('id');
            this.year = urlParams.get('year');

            if (!this.raceId || !this.year) {
                this.showError('Race ID or year not specified');
                return;
            }

            themeService.initToggleButton();
            showLoadingOverlay('Loading race data...');

            await this.loadRaceData();
            hideLoadingOverlay();

            this.displayRaceInfo();
            this.displayStandings();
            this.displayRaceResults();
            this.displayRaceCharts();
            this.setupYearNavigation();
            await this.loadRandomCards();
            this.deferredInit();

        } catch (error) {
            console.error('Error initializing race page:', error);
            hideLoadingOverlay();
            this.showError('Failed to load race data');
        }
    }

    async loadRaceData() {
        try {
            const response = await apiService.getRace(this.raceId, this.year);
            
            if (!response || !response.events) {
                throw new Error('Race data not found');
            }
            this.raceData = response;
        } catch (error) {
            // Show user-friendly error message
            if (error.message.includes('404') || error.message.includes('not found')) {
                throw new Error(`Championship "${this.raceId}" for year ${this.year} not found in our database.`);
            } else if (error.message.includes('network') || error.message.includes('fetch')) {
                throw new Error('Network error. Please check your connection and try again.');
            } else {
                throw new Error('Unable to load race data. Please try again later.');
            }
        }
    }

    displayRaceInfo() {
        if (!this.raceData) return;

        document.title = `${formatDisplayName(this.raceId)} ${this.year} - MotorsportDB`;

        const nameElem = document.getElementById('race-name');
        if (nameElem) nameElem.textContent = formatDisplayName(this.raceId);

        const yearElem = document.getElementById('current-year');
        if (yearElem) yearElem.textContent = this.year;

        const dateElem = document.getElementById('race-date');
        if (dateElem) {
            // For GP_Explorer or year 0000, show "Multiple Years"
            if (this.year === '0000' || this.raceId === 'GP_Explorer') {
                dateElem.textContent = 'Multiple Years';
            } else {
                dateElem.textContent = this.year;
            }
        }

        const pictureElem = document.getElementById('race-picture');
        if (pictureElem) {
            pictureElem.src = this.raceData.picture ? `/${this.raceData.picture}` : '/races/picture/default.png';
            pictureElem.alt = formatDisplayName(this.raceId);
        }

        // Calculate and display stats
        this.displayStats();
    }
    
    displayStats() {
        if (!this.raceData || !this.raceData.events) {
            console.warn("⚠️  No race data for stats");
            return;
        }
        
        const events = this.raceData.events;
        const totalEvents = Object.keys(events).length;
        
        // Count unique participants, total laps, and sessions
        const participants = new Set();
        let totalLaps = 0;
        let totalSessions = 0;

        Object.values(events).forEach((sessions) => {
            Object.entries(sessions).forEach(([sessionName, results]) => {
                totalSessions++;
                if (typeof results !== 'object' || results === null) return;
                let raceLaps = 0;
                Object.values(results).forEach((result) => {
                    (result.drivers || (result.driver ? [result.driver] : [])).forEach((d) => participants.add(d));
                    const info = result.other_info || {};
                    const laps = parseInt(info.laps ?? info.Laps ?? result.laps, 10);
                    if (!Number.isNaN(laps) && laps > raceLaps) raceLaps = laps;
                });
                // race distance = laps of the leader, summed over every race
                if (isRaceSession(sessionName)) totalLaps += raceLaps;
            });
        });

        const totalEventsElem = document.getElementById('totalEvents');
        if (totalEventsElem) totalEventsElem.textContent = totalEvents;
        
        const totalParticipantsElem = document.getElementById('totalParticipants');
        if (totalParticipantsElem) totalParticipantsElem.textContent = participants.size;
        
        const seasonInfoElem = document.getElementById('seasonInfo');
        if (seasonInfoElem) seasonInfoElem.textContent = this.year;
        
        const totalLapsElem = document.getElementById('totalLaps');
        if (totalLapsElem) {
            totalLapsElem.textContent = totalLaps > 0 ? totalLaps.toLocaleString() : 'N/A';
        } else {
            console.error("❌ Element 'totalLaps' not found!");
        }
    }

    displayRaceResults() {
        if (!this.raceData || !this.raceData.events) return;

        const container = document.getElementById('resultsContainer');
        if (!container) return;

        // Initialize filter state
        if (!this.sessionFilter) {
            this.sessionFilter = 'all'; // 'all', 'qualifying', 'race'
        }

        let html = '<div class="container mx-auto px-6 py-8">';
        html += '<div class="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">';
        html += '<h2 class="text-3xl font-bold text-gray-900 dark:text-white">Race Results</h2>';
        
        // Controls: Collapse/Expand + Session Filter
        html += '<div class="flex flex-col sm:flex-row items-start sm:items-center gap-3">';
        
        // Collapse/Expand buttons
        html += '<div class="flex gap-2">';
        html += `<button onclick="window.racePage.collapseAllEvents()" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium">Collapse All</button>`;
        html += `<button onclick="window.racePage.expandAllEvents()" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium">Expand All</button>`;
        html += '</div>';
        
        // Session filter toggles
        html += '<div class="flex gap-2">';
        html += `<button onclick="window.racePage.setSessionFilter('all')" class="px-4 py-2 rounded-lg transition-colors text-sm font-medium ${this.sessionFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'}">All Sessions</button>`;
        html += `<button onclick="window.racePage.setSessionFilter('qualifying')" class="px-4 py-2 rounded-lg transition-colors text-sm font-medium ${this.sessionFilter === 'qualifying' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'}">Qualifying</button>`;
        html += `<button onclick="window.racePage.setSessionFilter('race')" class="px-4 py-2 rounded-lg transition-colors text-sm font-medium ${this.sessionFilter === 'race' ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'}">Race</button>`;
        html += '</div>';
        
        html += '</div>'; // Close controls
        html += '</div>'; // Close header

        let eventIndex = 0;
        for (const [event, sessions] of Object.entries(this.raceData.events)) {
            const eventId = `event-${eventIndex++}`;
            
            // Filter sessions based on sessionFilter
            const filteredSessions = Object.entries(sessions).filter(([session, results]) => {
                if (this.sessionFilter === 'all') return true;
                if (this.sessionFilter === 'qualifying') {
                    return isQualifyingSession(session) || /^s?q\d$|hyperpole/i.test(session);
                }
                if (this.sessionFilter === 'race') {
                    return isRaceSession(session);
                }
                return true;
            });
            
            // Skip event if no sessions match filter
            if (filteredSessions.length === 0) continue;
            
            html += `<div class="mb-8 bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700">`;
            
            // Event header (clickable accordion)
            html += `<div class="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800 text-white p-4 cursor-pointer" onclick="window.racePage.toggleAccordion('${eventId}');">`;
            html += `<div class="flex items-center justify-between">`;
            html += `<h3 class="text-xl font-bold">${escapeHtml(event)}</h3>`;
            html += `<svg id="${eventId}-icon" class="w-6 h-6 accordion-icon rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">`;
            html += `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>`;
            html += `</svg>`;
            html += `</div>`;
            html += `</div>`;
            
            // Event content
            html += `<div id="${eventId}" class="accordion-content expanded">`;
            
            for (const [session, results] of filteredSessions) {
                html += this.createResultsTable(session, results);
            }
            
            html += '</div>'; // Close event content
            html += '</div>'; // Close event card
        }

        html += '</div>';
        container.innerHTML = html;
    }

    /**
     * Championship standings computed from the points of every session
     * (drivers and teams; one table per class for multi-class series).
     */
    computeStandings() {
        const byClass = new Map();
        const get = (cls) => {
            if (!byClass.has(cls)) byClass.set(cls, { drivers: new Map(), teams: new Map() });
            return byClass.get(cls);
        };
        const add = (map, id, points, win) => {
            const row = map.get(id) || { id, points: 0, wins: 0 };
            row.points += points;
            row.wins += win ? 1 : 0;
            map.set(id, row);
        };
        Object.values(this.raceData.events || {}).forEach((sessions) => {
            Object.entries(sessions).forEach(([session, results]) => {
                const race = isRaceSession(session);
                Object.values(results || {}).forEach((r) => {
                    const pts = parseFloat(r.points) || 0;
                    const info = r.other_info || {};
                    const win = race && String(info.Class_position || r.position) === '1';
                    if (!pts && !win) return;
                    const group = get(info.Class || info.class || '');
                    (r.drivers || []).forEach((d) => add(group.drivers, d, pts, win));
                    if (r.team) add(group.teams, r.team, pts, win);
                });
            });
        });
        const sort = (m) => [...m.values()].sort((a, b) => b.points - a.points || b.wins - a.wins);
        return [...byClass.entries()]
            .map(([cls, g]) => ({ cls, drivers: sort(g.drivers), teams: sort(g.teams) }))
            .filter((g) => g.drivers.length)
            .sort((a, b) => b.drivers[0].points - a.drivers[0].points);
    }

    displayStandings() {
        const container = document.getElementById('standingsContainer');
        if (!container || !this.raceData) return;
        const groups = this.computeStandings();
        if (!groups.length) {
            container.innerHTML = '';
            return;
        }
        const table = (title, rows, type) => {
            const body = rows.slice(0, 25).map((r, i) => `
                <tr class="border-t border-gray-200 dark:border-gray-700">
                    <td class="px-3 py-1.5 text-gray-500 dark:text-gray-400 w-10">${i + 1}</td>
                    <td class="px-3 py-1.5"><a class="text-blue-600 dark:text-blue-400 hover:underline" href="/${type}.php?id=${encodeURIComponent(r.id)}">${escapeHtml(formatDisplayName(r.id))}</a></td>
                    <td class="px-3 py-1.5 text-center text-gray-600 dark:text-gray-300">${r.wins || ''}</td>
                    <td class="px-3 py-1.5 text-right font-semibold text-gray-900 dark:text-white">${Math.round(r.points * 10) / 10}</td>
                </tr>`).join('');
            return `
                <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <h4 class="px-4 py-3 font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700">${escapeHtml(title)}</h4>
                    <div class="overflow-x-auto"><table class="min-w-full text-sm">
                        <thead class="text-gray-500 dark:text-gray-400 text-xs uppercase"><tr>
                            <th class="px-3 py-2 text-left">#</th><th class="px-3 py-2 text-left">${type === 'driver' ? 'Driver' : 'Team'}</th>
                            <th class="px-3 py-2 text-center">Wins</th><th class="px-3 py-2 text-right">Points</th>
                        </tr></thead><tbody>${body}</tbody></table></div>
                </div>`;
        };
        container.innerHTML = `
            <h2 class="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Standings</h2>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">Computed from the points of every session in our database${this.year >= new Date().getFullYear() ? ' (season in progress)' : ''}.</p>
            ${groups.map((g) => `
                ${g.cls ? `<h3 class="text-lg font-semibold mt-6 mb-3 text-gray-800 dark:text-gray-200">${escapeHtml(g.cls)}</h3>` : ''}
                <div class="grid gap-6 md:grid-cols-2">${table('Drivers', g.drivers, 'driver')}${table('Teams', g.teams, 'team')}</div>
            `).join('')}`;
    }

    createResultsTable(session, results) {
        let html = `<div class="border-t border-gray-200 dark:border-gray-700 p-6">`;
        html += `<h4 class="text-lg font-semibold mb-4 text-gray-900 dark:text-white">${escapeHtml(session)}</h4>`;
        html += `<div class="overflow-x-auto">`;
        html += `<table class="min-w-full bg-white dark:bg-gray-800 rounded-lg">`;
        html += `<thead class="bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white">`;
        html += `<tr>`;
        html += `<th class="px-4 py-2 text-left text-sm font-semibold">Pos</th>`;
        html += `<th class="px-4 py-2 text-left text-sm font-semibold">Driver(s)</th>`;
        html += `<th class="px-4 py-2 text-left text-sm font-semibold">Team</th>`;
        html += `<th class="px-4 py-2 text-center text-sm font-semibold">Points</th>`;
        html += `<th class="px-4 py-2 text-center text-sm font-semibold">Fastest Lap</th>`;
        html += `<th class="px-4 py-2 text-center text-sm font-semibold">Car #</th>`;
        html += `<th class="px-4 py-2 text-center text-sm font-semibold">Laps</th>`;
        html += `<th class="px-4 py-2 text-center text-sm font-semibold">Time / Gap</th>`;
        html += `<th class="px-4 py-2 text-center text-sm font-semibold">Avg Speed</th>`;
        html += `</tr>`;
        html += `</thead>`;
        html += `<tbody>`;

        const rank = (p) => {
            const n = parseInt(p, 10);
            if (!Number.isNaN(n) && String(n) === String(p).trim()) return n;
            const order = ['NC', 'DNF', 'DNS', 'DSQ', 'EXC', 'DNQ', 'DNPQ', 'WIT'];
            const i = order.indexOf(String(p || '').toUpperCase());
            return 1000 + (i === -1 ? order.length : i);
        };
        const resultsArray = Array.isArray(results)
            ? results
            : Object.values(results || {}).sort((a, b) => rank(a.position) - rank(b.position));

        const link = (type, id) => id
            ? `<a href="/${type}.php?id=${encodeURIComponent(id)}" class="text-blue-600 dark:text-blue-400 hover:underline">${escapeHtml(formatDisplayName(id))}</a>`
            : '<span class="text-gray-400">—</span>';

        resultsArray.forEach((result) => {
            const position = result.position || '—';
            const positionClass = this.getPositionClass(position, session);
            const drivers = (result.drivers || (result.driver ? [result.driver] : [])).map((d) => link('driver', d)).join('<br>');
            const otherInfo = result.other_info || {};
            const pick = (...keys) => {
                for (const k of keys) {
                    if (otherInfo[k] !== undefined && otherInfo[k] !== '') return otherInfo[k];
                }
                return '—';
            };
            const fastest = result.fastest_lap || '—';
            const isFastest = otherInfo.fastestLapOfRace === 'yes';
            const cls = otherInfo.Class || otherInfo.class;

            html += `<tr class="border-t border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">`;
            html += `<td class="px-4 py-2 ${positionClass}">${escapeHtml(position)}</td>`;
            html += `<td class="px-4 py-2 text-gray-900 dark:text-white">${drivers || '—'}${cls ? ` <span class="ml-1 text-xs px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">${escapeHtml(cls)}</span>` : ''}</td>`;
            html += `<td class="px-4 py-2 text-gray-900 dark:text-white">${link('team', result.team)}</td>`;
            html += `<td class="px-4 py-2 text-center text-gray-900 dark:text-white">${escapeHtml(result.points ?? 0)}</td>`;
            html += `<td class="px-4 py-2 text-center ${isFastest ? 'font-semibold text-purple-600 dark:text-purple-400' : 'text-gray-900 dark:text-white'}">${escapeHtml(fastest)}${isFastest ? ' ⏱' : ''}</td>`;
            html += `<td class="px-4 py-2 text-center text-gray-600 dark:text-gray-400 text-sm">${escapeHtml(pick('carNumber', 'Car_number'))}</td>`;
            html += `<td class="px-4 py-2 text-center text-gray-600 dark:text-gray-400 text-sm">${escapeHtml(pick('laps', 'Laps'))}</td>`;
            html += `<td class="px-4 py-2 text-center text-gray-600 dark:text-gray-400 text-sm">${escapeHtml(pick('time', 'Time', 'Elapsed_time', 'gap', 'Gap', 'status', 'Status'))}</td>`;
            html += `<td class="px-4 py-2 text-center text-gray-600 dark:text-gray-400 text-sm">${escapeHtml(pick('speed', 'Average_speed', 'average_speed'))}</td>`;
            html += `</tr>`;
        });

        html += `</tbody>`;
        html += `</table>`;
        html += `</div>`;
        html += `</div>`;

        return html;
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
        this.displayRaceResults();
    }

    async setupYearNavigation() {
        
        const prevBtn = document.getElementById('prev-year-btn');
        const nextBtn = document.getElementById('next-year-btn');
        const prevYearText = document.getElementById('prev-year-text');
        const nextYearText = document.getElementById('next-year-text');

        // Check previous year - but NOT if we're at year 0000
        if (prevBtn && prevYearText) {
            if (this.year === '0000') {
                prevBtn.classList.add('hidden');
            } else {
                const prevYear = String(parseInt(this.year) - 1).padStart(4, '0');
                
                // Only show button if data exists for previous year
                try {
                    const response = await apiService.getRace(this.raceId, prevYear);
                    if (response && response.events) {
                        prevYearText.textContent = prevYear;
                        prevBtn.classList.remove('hidden');
                        prevBtn.addEventListener('click', () => {
                            window.location.href = `?id=${this.raceId}&year=${prevYear}`;
                        });
                    } else {
                    }
                } catch (error) {
                    // Previous year doesn't exist, keep button hidden
                }
            }
        }

        // Check next year
        if (nextBtn && nextYearText) {
            if (this.year !== '0000') {
                const nextYear = String(parseInt(this.year) + 1).padStart(4, '0');
                const currentYear = new Date().getFullYear();
                
                
                if (parseInt(nextYear) <= currentYear) {
                    // Only show button if data exists for next year
                    try {
                        const response = await apiService.getRace(this.raceId, nextYear);
                        if (response && response.events) {
                            nextYearText.textContent = nextYear;
                            nextBtn.classList.remove('hidden');
                            nextBtn.addEventListener('click', () => {
                                window.location.href = `?id=${this.raceId}&year=${nextYear}`;
                            });
                        } else {
                        }
                    } catch (error) {
                        // Next year doesn't exist, keep button hidden (not an error, just end of data)
                    }
                } else {
                }
            } else {
            }
        }
        
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

    displayRaceCharts() {
        
        if (!this.raceData || !this.raceData.events) {
            console.warn("⚠️  No race data or events, skipping charts");
            return;
        }

        // Destroy existing charts
        chartService.destroyChart('winnersChart');
        chartService.destroyChart('participantsChart');
        chartService.destroyChart('qualifyingVsRaceChart');
        chartService.destroyChart('raceEvolutionChart');
        this.charts.clear();

        // Create all charts
        this.createWinnersChart();

        this.createParticipantsChart();
        
        this.createQualifyingVsRaceChart();
        
        this.createRaceEvolutionChart();
        
    }

    createWinnersChart() {
        const canvas = document.getElementById('winnersChart');
        if (!canvas) {
            console.error("❌ Canvas 'winnersChart' not found!");
            return;
        }
        if (!this.raceData.events) {
            console.warn("⚠️  No events data for winners chart");
            return;
        }
        

        // Count winners across all events
        const winnerCounts = {};
        let totalWinners = 0;
        
        Object.entries(this.raceData.events).forEach(([eventName, sessions]) => {
            Object.entries(sessions).forEach(([sessionName, results]) => {
                // Only count main race sessions
                if (isRaceSession(sessionName)) {
                    if (typeof results === 'object' && results !== null) {
                        // Find the winner (position 1)
                        const winner = Object.values(results).find(r => r.position === 1 || r.position === '1');
                        if (winner) {
                            const winnerName = winner.drivers ? winner.drivers[0] : winner.driver;
                            if (winnerName) {
                                winnerCounts[winnerName] = (winnerCounts[winnerName] || 0) + 1;
                                totalWinners++;
                            }
                        }
                    }
                }
            });
        });
        

        // Sort winners by win count (show all)
        const sortedWinners = Object.entries(winnerCounts)
            .sort((a, b) => b[1] - a[1]);

        if (sortedWinners.length === 0) {
            console.warn("⚠️  No winners found, skipping chart");
            return;
        }
        

        // Show top 10 by default
        const displayLimit = 10;
        const winnersToShow = sortedWinners.slice(0, displayLimit);
        const hasMore = sortedWinners.length > displayLimit;
        
        const labels = winnersToShow.map(([name]) => name);
        const data = winnersToShow.map(([, count]) => count);

        const chartTitle = hasMore 
            ? `Top ${displayLimit} Event Winners (${sortedWinners.length} total)` 
            : 'Top Event Winners';

        const chart = chartService.createBarChart('winnersChart', labels, [{
            label: 'Event Wins',
            data: data,
            backgroundColor: '#3b82f6'
        }], {
            indexAxis: 'y',
            title: chartTitle
        });

        if (chart) {
            this.charts.set('winners', chart);
        } else {
            console.error("❌ Failed to create winners chart");
        }
    }

    createParticipantsChart() {
        const canvas = document.getElementById('participantsChart');
        if (!canvas) {
            console.error("❌ Canvas 'participantsChart' not found!");
            return;
        }
        if (!this.raceData.events) {
            console.warn("⚠️  No events data for participants chart");
            return;
        }
        

        // Count appearances by participant
        const participantCounts = {};
        
        Object.values(this.raceData.events).forEach(sessions => {
            Object.values(sessions).forEach(results => {
                if (typeof results === 'object' && results !== null) {
                    Object.values(results).forEach(result => {
                        if (result.drivers) {
                            result.drivers.forEach(driver => {
                                participantCounts[driver] = (participantCounts[driver] || 0) + 1;
                            });
                        } else if (result.driver) {
                            participantCounts[result.driver] = (participantCounts[result.driver] || 0) + 1;
                        }
                    });
                }
            });
        });
        

        // Sort participants by participation count (show all)
        const sortedParticipants = Object.entries(participantCounts)
            .sort((a, b) => b[1] - a[1]);

        if (sortedParticipants.length === 0) {
            console.warn("⚠️  No participants found, skipping chart");
            return;
        }
        

        // Show top 10 by default
        const displayLimit = 10;
        const participantsToShow = sortedParticipants.slice(0, displayLimit);
        const hasMore = sortedParticipants.length > displayLimit;
        
        const labels = participantsToShow.map(([name]) => name);
        const data = participantsToShow.map(([, count]) => count);

        const chartTitle = hasMore 
            ? `Top ${displayLimit} Active Participants (${sortedParticipants.length} total)` 
            : 'Most Active Participants';

        const chart = chartService.createDoughnutChart('participantsChart', labels, data, {
            title: chartTitle
        });

        if (chart) {
            this.charts.set('participants', chart);
        } else {
            console.error("❌ Failed to create participants chart");
        }
    }

    createQualifyingVsRaceChart() {
        const canvas = document.getElementById('qualifyingVsRaceChart');
        if (!canvas) {
            console.error("❌ Canvas 'qualifyingVsRaceChart' not found!");
            return;
        }
        if (!this.raceData.events) {
            console.warn("⚠️  No events data for qualifying vs race chart");
            return;
        }
        
        
        // Collect data for qualifying vs race positions
        const driverData = {};
        
        Object.entries(this.raceData.events).forEach(([eventName, sessions]) => {
            let qualifyingSession = null;
            let raceSession = null;
            
            // Find qualifying and race sessions
            Object.entries(sessions).forEach(([sessionName, results]) => {
                const lowerSession = sessionName.toLowerCase();
                if (lowerSession.includes('qualifying') || lowerSession.includes('qualif')) {
                    qualifyingSession = results;
                } else if (lowerSession.includes('race') || lowerSession === 'final') {
                    raceSession = results;
                }
            });
            
            // Compare positions if both sessions exist
            if (qualifyingSession && raceSession && typeof qualifyingSession === 'object' && typeof raceSession === 'object') {
                const qualTotalDrivers = Object.keys(qualifyingSession).length;
                const raceTotalDrivers = Object.keys(raceSession).length;
                
                Object.entries(raceSession).forEach(([key, raceResult]) => {
                    const driver = raceResult.drivers ? raceResult.drivers[0] : raceResult.driver;
                    if (!driver) return;
                    
                    // Find same driver in qualifying
                    const qualResult = Object.values(qualifyingSession).find(q => {
                        const qDriver = q.drivers ? q.drivers[0] : q.driver;
                        return qDriver === driver;
                    });
                    
                    if (qualResult) {
                        // If position is missing or invalid, set to last place
                        let qualPos = parseInt(qualResult.position);
                        if (!qualPos || isNaN(qualPos) || !qualResult.position) {
                            qualPos = qualTotalDrivers;
                        }
                        
                        let racePos = parseInt(raceResult.position);
                        if (!racePos || isNaN(racePos) || !raceResult.position) {
                            racePos = raceTotalDrivers;
                        }
                        
                        if (!driverData[driver]) {
                            driverData[driver] = { qualSum: 0, raceSum: 0, count: 0 };
                        }
                        driverData[driver].qualSum += qualPos;
                        driverData[driver].raceSum += racePos;
                        driverData[driver].count++;
                    }
                });
            }
        });
        
        // Calculate averages for all drivers
        const driverAverages = Object.entries(driverData)
            .map(([driver, data]) => ({
                driver,
                avgQualifying: data.qualSum / data.count,
                avgRace: data.raceSum / data.count
            }))
            .sort((a, b) => a.avgRace - b.avgRace);
        
        if (driverAverages.length === 0) {
            console.warn("⚠️  No qualifying vs race data found");
            return;
        }
        
        
        // Show top 10 by default
        const displayLimit = 10;
        const driversToShow = driverAverages.slice(0, displayLimit);
        const hasMore = driverAverages.length > displayLimit;
        
        const labels = driversToShow.map(d => d.driver);
        const chartTitle = hasMore 
            ? `Top ${displayLimit} Drivers - Qualifying vs Race (${driverAverages.length} total)`
            : 'Qualifying vs Race Performance';
        
        const chart = chartService.createBarChart('qualifyingVsRaceChart', labels, [
            {
                label: 'Avg Qualifying Position',
                data: driversToShow.map(d => d.avgQualifying),
                backgroundColor: '#f59e0b'
            },
            {
                label: 'Avg Race Position',
                data: driversToShow.map(d => d.avgRace),
                backgroundColor: '#3b82f6'
            }
        ], {
            title: chartTitle
        });
        
        if (chart) {
            this.charts.set('qualifyingVsRace', chart);
        } else {
            console.error("❌ Failed to create qualifying vs race chart");
        }
    }

    createRaceEvolutionChart() {
        const canvas = document.getElementById('raceEvolutionChart');
        if (!canvas) {
            console.error("❌ Canvas 'raceEvolutionChart' not found!");
            return;
        }
        if (!this.raceData.events) {
            console.warn("⚠️  No events data for race evolution chart");
            return;
        }
        
        
        // Collect race results for top drivers
        const driverPositions = {};
        const eventNames = [];
        
        Object.entries(this.raceData.events).forEach(([eventName, sessions]) => {
            eventNames.push(eventName);
            
            // Find the race session
            Object.entries(sessions).forEach(([sessionName, results]) => {
                const lowerSession = sessionName.toLowerCase();
                if (lowerSession.includes('race') || lowerSession === 'final') {
                    if (typeof results === 'object' && results !== null) {
                        const resultsArray = Object.values(results);
                        const totalDrivers = resultsArray.length;
                        
                        Object.entries(results).forEach(([key, result]) => {
                            const driver = result.drivers ? result.drivers[0] : result.driver;
                            if (!driver) return;
                            
                            // If position is missing, invalid, or DNF/DNS/DSQ, set to last place
                            let position = parseInt(result.position);
                            if (!position || isNaN(position) || !result.position) {
                                position = totalDrivers; // Last position instead of 999
                            }
                            
                            if (!driverPositions[driver]) {
                                driverPositions[driver] = [];
                            }
                            driverPositions[driver].push(position);
                        });
                    }
                }
            });
        });
        
        // Get ALL drivers sorted by average position
        const allDrivers = Object.entries(driverPositions)
            .map(([driver, positions]) => ({
                driver,
                avgPos: positions.reduce((a, b) => a + b, 0) / positions.length,
                positions
            }))
            .sort((a, b) => a.avgPos - b.avgPos);
        
        if (allDrivers.length === 0 || eventNames.length === 0) {
            console.warn("⚠️  No race evolution data found");
            return;
        }
        
        
        // Generate enough colors for all drivers
        const colors = this._generateDriverColors(allDrivers.length);
        
        // Create datasets for ALL drivers (top 5 visible by default)
        const datasets = allDrivers.map((driver, index) => ({
            label: driver.driver,
            data: driver.positions,
            borderColor: colors[index],
            backgroundColor: colors[index] + '33',
            tension: 0.4,
            hidden: index >= 5 // Hide drivers beyond top 5 by default
        }));
        
        const chart = chartService.createLineChart('raceEvolutionChart', {
            labels: eventNames,
            datasets: datasets
        }, {
            title: `Race-by-Race Position Evolution (${allDrivers.length} drivers - Top 5 shown)`,
            scales: {
                y: {
                    reverse: true, // P1 at top, higher positions at bottom
                    ticks: {
                        stepSize: 1,
                        callback: function(value) {
                            return 'P' + value; // Display as P1, P2, P3...
                        }
                    },
                    title: {
                        display: true,
                        text: 'Position'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Event'
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    onClick: (e, legendItem, legend) => {
                        // Default Chart.js legend click behavior (toggle visibility)
                        const index = legendItem.datasetIndex;
                        const chart = legend.chart;
                        const meta = chart.getDatasetMeta(index);
                        
                        meta.hidden = meta.hidden === null ? !chart.data.datasets[index].hidden : null;
                        chart.update();
                    },
                    labels: {
                        boxWidth: 15,
                        padding: 8,
                        font: {
                            size: 10
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return context.dataset.label + ': P' + context.parsed.y;
                        }
                    }
                }
            }
        });
        
        if (chart) {
            this.charts.set('raceEvolution', chart);
        } else {
            console.error("❌ Failed to create race evolution chart");
        }
    }

    /**
     * Display Other Info section from race's session data
     */
    displayOtherInfo() {
        const container = document.getElementById('otherInfoContainer');
        if (!container) return;

        // Collect all unique other_info fields from all sessions
        const otherInfoFields = new Set();
        const otherInfoData = {};

        if (this.raceData && this.raceData.events) {
            Object.values(this.raceData.events).forEach(eventData => {
                Object.values(eventData).forEach(sessionResults => {
                    // Handle both array and object formats
                    let resultsArray = [];
                    if (Array.isArray(sessionResults)) {
                        resultsArray = sessionResults;
                    } else if (typeof sessionResults === 'object' && sessionResults !== null) {
                        resultsArray = Object.values(sessionResults);
                    }
                    
                    resultsArray.forEach(result => {
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
            html += `<p class="text-lg font-semibold text-gray-900 dark:text-white">Available in results</p>`;
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

    /**
     * Generate distinct colors for drivers
     * @private
     * @param {number} count - Number of colors needed
     * @returns {Array<string>} Array of hex color codes
     */
    _generateDriverColors(count) {
        // Base palette of distinct colors
        const baseColors = [
            '#3b82f6', // Blue
            '#ef4444', // Red
            '#10b981', // Green
            '#f59e0b', // Orange
            '#8b5cf6', // Purple
            '#ec4899', // Pink
            '#06b6d4', // Cyan
            '#f97316', // Deep Orange
            '#84cc16', // Lime
            '#6366f1', // Indigo
            '#14b8a6', // Teal
            '#f43f5e', // Rose
            '#a855f7', // Violet
            '#22d3ee', // Sky
            '#eab308', // Yellow
            '#64748b', // Slate
            '#dc2626', // Red 700
            '#059669', // Emerald
            '#7c3aed', // Purple 600
            '#db2777'  // Pink 600
        ];

        if (count <= baseColors.length) {
            return baseColors.slice(0, count);
        }

        // If we need more colors, generate variations
        const colors = [...baseColors];
        const hueStep = 360 / count;
        
        for (let i = baseColors.length; i < count; i++) {
            const hue = (i * hueStep) % 360;
            const saturation = 60 + (i % 3) * 15;
            const lightness = 45 + (i % 4) * 10;
            colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
        }

        return colors;
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
        window.racePage = new RacePage();
    });
} else {
    window.racePage = new RacePage();
}

export default RacePage;
