/**
 * Head to Head Comparison - MotorsportDB
 * Compare multiple drivers and analyze their performances
 */

// Global state
const state = {
    selectedDrivers: [],
    allDriversData: {},
    comparisonMode: 'common', // 'common' or 'all'
    charts: {},
    filters: {
        championship: 'all',
        season: 'all'
    }
};

const MAX_DRIVERS = 5;
const COLORS = [
    '#3b82f6', // blue
    '#ef4444', // red
    '#10b981', // green
    '#f59e0b', // amber
    '#8b5cf6', // purple
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadDriversList();
});

// Event Listeners
function initializeEventListeners() {
    const searchInput = document.getElementById('driver-search');
    const modeCommon = document.getElementById('mode-common');
    const modeAll = document.getElementById('mode-all');
    const compareBtn = document.getElementById('compare-btn');
    const exportBtn = document.getElementById('export-csv');
    const championshipFilter = document.getElementById('championship-filter');
    const seasonFilter = document.getElementById('season-filter');

    searchInput.addEventListener('input', debounce(handleSearch, 300));
    modeCommon.addEventListener('click', () => setComparisonMode('common'));
    modeAll.addEventListener('click', () => setComparisonMode('all'));
    compareBtn.addEventListener('click', performComparison);
    exportBtn?.addEventListener('click', exportToCSV);
    championshipFilter?.addEventListener('change', applyFilters);
    seasonFilter?.addEventListener('change', applyFilters);

    // Click outside to close dropdown
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#driver-search') && !e.target.closest('#search-dropdown')) {
            document.getElementById('search-dropdown').classList.add('hidden');
        }
    });
}

// Get all drivers from directory
async function getAllDrivers() {
    const driversData = {};
    try {
        // Load list of driver files
        const response = await fetch('getDriversList.php');
        if (!response.ok) throw new Error('Failed to fetch drivers list');
        const driversList = await response.json();
        
        // Store basic info for search
        driversList.forEach(driver => {
            if (driver.name) {
                driversData[driver.name] = {
                    name: driver.name,
                    nationality: driver.country || driver.nationality,
                    dateOfBirth: driver.dateOfBirth,
                    loaded: false
                };
            }
        });
        
        return driversData;
    } catch (error) {
        console.error('Error loading drivers list:', error);
        return {};
    }
}

// Load drivers list from JSON
async function loadDriversList() {
    try {
        const drivers = await getAllDrivers();
        state.allDriversData = drivers;
    } catch (error) {
        console.error('Error loading drivers:', error);
        showError('Failed to load drivers data');
    }
}

// Handle driver search
function handleSearch(e) {
    const query = e.target.value.trim().toLowerCase();
    const dropdown = document.getElementById('search-dropdown');

    if (query.length < 2) {
        dropdown.classList.add('hidden');
        return;
    }

    const results = Object.keys(state.allDriversData)
        .filter(name => {
            const driver = state.allDriversData[name];
            return name.toLowerCase().includes(query) && 
                   !state.selectedDrivers.some(d => d.name === name);
        })
        .slice(0, 10);

    displaySearchResults(results);
}

// Display search results
function displaySearchResults(results) {
    const dropdown = document.getElementById('search-dropdown');
    
    if (results.length === 0) {
        dropdown.innerHTML = '<div class="p-4 text-gray-500 dark:text-gray-400">No drivers found</div>';
        dropdown.classList.remove('hidden');
        return;
    }

    dropdown.innerHTML = results.map(name => {
        const driver = state.allDriversData[name];
        const nationality = (driver.nationality || 'default').toLowerCase().replace(/ /g, '_');
        const displayName = name.replaceAll('_', ' ');
        
        return `
            <div class="driver-result p-3 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer border-b dark:border-gray-600 last:border-b-0 transition"
                 data-driver="${name}">
                <div class="flex items-center gap-3">
                    <img src="assets/flags/${nationality}.png" 
                         alt="${nationality}" 
                         class="w-8 h-6 object-cover rounded"
                         onerror="this.src='assets/flags/default.png'">
                    <div>
                        <div class="font-semibold text-gray-800 dark:text-gray-200">${displayName}</div>
                        <div class="text-sm text-gray-500 dark:text-gray-400">
                            ${driver.dateOfBirth || 'N/A'}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Add click handlers
    dropdown.querySelectorAll('.driver-result').forEach(el => {
        el.addEventListener('click', () => addDriver(el.dataset.driver));
    });

    dropdown.classList.remove('hidden');
}

// Add driver to comparison
function addDriver(driverName) {
    if (state.selectedDrivers.length >= MAX_DRIVERS) {
        showError(`Maximum ${MAX_DRIVERS} drivers allowed`);
        return;
    }

    const driver = state.allDriversData[driverName];
    if (!driver) return;

    state.selectedDrivers.push({
        name: driverName,
        data: driver,
        color: COLORS[state.selectedDrivers.length]
    });

    renderSelectedDrivers();
    updateCompareButton();
    updateQuickStats();
    
    // Clear search
    document.getElementById('driver-search').value = '';
    document.getElementById('search-dropdown').classList.add('hidden');
}

// Remove driver from comparison
function removeDriver(index) {
    state.selectedDrivers.splice(index, 1);
    
    // Reassign colors
    state.selectedDrivers.forEach((driver, i) => {
        driver.color = COLORS[i];
    });

    renderSelectedDrivers();
    updateCompareButton();
    updateQuickStats();
    
    // Hide results if less than 2 drivers
    if (state.selectedDrivers.length < 2) {
        document.getElementById('results-section').classList.add('hidden');
        document.getElementById('empty-state').classList.remove('hidden');
    }
}

// Render selected drivers
function renderSelectedDrivers() {
    const container = document.getElementById('selected-drivers');
    
    if (state.selectedDrivers.length === 0) {
        container.innerHTML = '<div class="col-span-full text-center text-gray-500 dark:text-gray-400 py-4">No drivers selected</div>';
        return;
    }

    container.innerHTML = state.selectedDrivers.map((driver, index) => {
        const nationality = (driver.data.nationality || 'default').toLowerCase().replace(/ /g, '_');
        const dob = driver.data.dateOfBirth || 'N/A';
        const displayName = driver.name.replaceAll('_', ' ');
        
        return `
            <div class="driver-card bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border-l-4 animate-fade-in hover-lift"
                 style="border-color: ${driver.color}">
                <div class="flex justify-between items-start mb-3">
                    <div class="flex items-center gap-2">
                        <img src="assets/flags/${nationality}.png" 
                             alt="${nationality}" 
                             class="w-8 h-6 object-cover rounded"
                             onerror="this.src='assets/flags/default.png'">
                        <div class="w-4 h-4 rounded-full" style="background-color: ${driver.color}"></div>
                    </div>
                    <button onclick="removeDriver(${index})" 
                            class="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition"
                            aria-label="Remove driver">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                <h3 class="font-bold text-gray-900 dark:text-gray-100 text-lg mb-1">${displayName}</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400">${dob}</p>
            </div>
        `;
    }).join('');
}

// Update compare button state
function updateCompareButton() {
    const btn = document.getElementById('compare-btn');
    btn.disabled = state.selectedDrivers.length < 2;
}

// Update quick stats preview
function updateQuickStats() {
    const quickStats = document.getElementById('quick-stats');
    const quickStatsText = document.getElementById('quick-stats-text');
    
    if (state.selectedDrivers.length < 2) {
        quickStats.classList.add('hidden');
        return;
    }

    const totalRaces = state.selectedDrivers.reduce((sum, driver) => {
        return sum + getTotalRaces(driver.data);
    }, 0);

    quickStatsText.textContent = `${state.selectedDrivers.length} drivers selected • ${totalRaces} total races`;
    quickStats.classList.remove('hidden');
}

// Set comparison mode
function setComparisonMode(mode) {
    state.comparisonMode = mode;
    
    const commonBtn = document.getElementById('mode-common');
    const allBtn = document.getElementById('mode-all');
    
    if (mode === 'common') {
        commonBtn.classList.add('bg-blue-600', 'text-white');
        commonBtn.classList.remove('bg-gray-300', 'dark:bg-gray-600', 'text-gray-700', 'dark:text-gray-300');
        allBtn.classList.remove('bg-blue-600', 'text-white');
        allBtn.classList.add('bg-gray-300', 'dark:bg-gray-600', 'text-gray-700', 'dark:text-gray-300');
    } else {
        allBtn.classList.add('bg-blue-600', 'text-white');
        allBtn.classList.remove('bg-gray-300', 'dark:bg-gray-600', 'text-gray-700', 'dark:text-gray-300');
        commonBtn.classList.remove('bg-blue-600', 'text-white');
        commonBtn.classList.add('bg-gray-300', 'dark:bg-gray-600', 'text-gray-700', 'dark:text-gray-300');
    }

    // Re-perform comparison if already done
    if (!document.getElementById('results-section').classList.contains('hidden')) {
        performComparison();
    }
}

// Perform comparison
async function performComparison() {
    if (state.selectedDrivers.length < 2) return;

    // Show loading
    showLoading();

    try {
        // Load full driver data
        await loadFullDriverData();

        // Get common or all races
        const races = state.comparisonMode === 'common' 
            ? getCommonRaces() 
            : getAllRaces();

        // Calculate statistics
        const stats = calculateStatistics(races);

        // Hide loading and show results
        document.getElementById('loading-indicator').classList.add('hidden');
        document.getElementById('results-content').classList.remove('hidden');
        document.getElementById('results-section').classList.remove('hidden');
        document.getElementById('empty-state')?.classList.add('hidden');

        // Display results
        displayOverallStats(stats);
        displayCharts(stats);
        displayHeadToHeadMatrix(stats);
        displayRaceBreakdown(races);
        displayInterestingFacts(stats);

        // Scroll to results
        document.getElementById('results-section').scrollIntoView({ behavior: 'smooth' });

    } catch (error) {
        console.error('Comparison error:', error);
        showError('Failed to perform comparison');
    }
}

// Get driver data from API
async function getDriverData(driverName) {
    try {
        const response = await fetch(`getDrivers.php?id=${driverName}`);
        if (!response.ok) throw new Error('Failed to fetch driver data');
        const data = await response.json();
        // getDrivers.php returns an array with one driver object
        return Array.isArray(data) && data.length > 0 ? data[0] : data;
    } catch (error) {
        console.error('Error loading driver data:', error);
        return null;
    }
}

// Load full driver data
async function loadFullDriverData() {
    const promises = state.selectedDrivers.map(async (driver) => {
        if (!driver.fullData) {
            const data = await getDriverData(driver.name);
            driver.fullData = data;
        }
    });

    await Promise.all(promises);
}

// Get common races between all selected drivers
function getCommonRaces() {
    const allRaces = state.selectedDrivers.map(driver => {
        const races = extractRaces(driver.fullData);
        return races;
    });
    
    // Find intersection of all races (including session)
    const commonRaceKeys = allRaces.reduce((common, driverRaces) => {
        const keys = new Set(driverRaces.map(r => `${r.season}|||${r.championship}|||${r.raceName}|||${r.session}`));
        if (common === null) return keys;
        return new Set([...common].filter(k => keys.has(k)));
    }, null);

    // Build race objects for common races
    const races = [];
    commonRaceKeys.forEach(key => {
        const [season, championship, raceName, session] = key.split('|||');
        const raceData = {};
        
        state.selectedDrivers.forEach(driver => {
            const driverRace = extractRaces(driver.fullData).find(r => 
                `${r.season}|||${r.championship}|||${r.raceName}|||${r.session}` === key
            );
            raceData[driver.name] = driverRace;
        });

        races.push({
            key,
            season,
            championship,
            raceName,
            session,
            drivers: raceData
        });
    });

    return races;
}

// Get all races
function getAllRaces() {
    const racesMap = new Map();

    state.selectedDrivers.forEach(driver => {
        const driverRaces = extractRaces(driver.fullData);
        
        driverRaces.forEach(race => {
            const key = `${race.season}|||${race.championship}|||${race.raceName}|||${race.session}`;
            
            if (!racesMap.has(key)) {
                racesMap.set(key, {
                    key,
                    season: race.season,
                    championship: race.championship,
                    raceName: race.raceName,
                    session: race.session,
                    drivers: {}
                });
            }
            
            racesMap.get(key).drivers[driver.name] = race;
        });
    });

    return Array.from(racesMap.values());
}

// Extract races from driver data
function extractRaces(driverData) {
    const races = [];
    
    if (!driverData?.seasons) {
        return races;
    }
    Object.entries(driverData.seasons).forEach(([season, seasonData]) => {
        // seasonData contains championships directly
        Object.entries(seasonData).forEach(([championship, champData]) => {
            // champData contains races directly
            Object.entries(champData).forEach(([raceName, raceData]) => {
                // raceData contains sessions (Qualifying, Race 1, etc.)
                Object.entries(raceData).forEach(([session, sessionData]) => {
                    // Only include actual race sessions (not practice, qualifying, etc.)
                    const isRaceSession = session.toLowerCase().includes('race');
                    
                    // sessionData has position, points, team, etc. directly
                    if (sessionData && (sessionData.position || sessionData.team) && isRaceSession) {
                        races.push({
                            season,
                            championship,
                            raceName,
                            session,
                            position: parseInt(sessionData.position) || "DNF",
                            points: parseInt(sessionData.points) || 0,
                            team: sessionData.team,
                            fastest_lap: sessionData.fastest_lap,
                            status: sessionData.status || '',
                            other_info: sessionData.other_info || {}
                        });
                    }
                });
            });
        });
    });
    return races;
}

// Calculate statistics
function calculateStatistics(races) {
    const stats = {
        drivers: {},
        races: races.length,
        mode: state.comparisonMode
    };

    // Initialize stats for each driver
    state.selectedDrivers.forEach(driver => {
        stats.drivers[driver.name] = {
            races: 0,
            wins: 0,
            podiums: 0,
            points: 0,
            dnf: 0,
            dns: 0,
            averagePosition: 0,
            bestPosition: null,
            worstPosition: null,
            totalPosition: 0,
            validPositions: 0,
            polePositions: 0,
            fastestLaps: 0,
            headToHead: {},
            championships: new Set(),
            seasons: new Set()
        };
    });

    // Calculate stats from races
    races.forEach(race => {
        Object.entries(race.drivers).forEach(([driverName, raceData]) => {
            const driverStats = stats.drivers[driverName];
            if (!driverStats) return;

            driverStats.races++;
            driverStats.championships.add(race.championship);
            driverStats.seasons.add(race.season);

            const position = raceData.position;
            const status = raceData.status || '';

            // Count results
            if (position === 1) driverStats.wins++;
            if (position <= 3) driverStats.podiums++;
            if (raceData.points) driverStats.points += raceData.points;
            if (status.toLowerCase().includes('dnf') || status.toLowerCase().includes('retired')) {
                driverStats.dnf++;
            }
            if (status.toLowerCase().includes('dns') || status.toLowerCase().includes('not start')) {
                driverStats.dns++;
            }

            // Position statistics
            if (position && !isNaN(position)) {
                driverStats.totalPosition += position;
                driverStats.validPositions++;
                
                if (driverStats.bestPosition === null || position < driverStats.bestPosition) {
                    driverStats.bestPosition = position;
                }
                if (driverStats.worstPosition === null || position > driverStats.worstPosition) {
                    driverStats.worstPosition = position;
                }
            } else if (position === "DNF") {
                driverStats.dnf++;
            } else {
                console.log(position);
            }

            // Qualifying/Grid
            if (raceData.grid === 1 || raceData.gridPosition === 1) {
                driverStats.polePositions++;
            }

            // Fastest lap
            if (raceData.fastestLap || status.toLowerCase().includes('fastest')) {
                driverStats.fastestLaps++;
            }
        });

        // Head to head comparison
        const finishers = Object.entries(race.drivers)
            .filter(([_, data]) => data.position && !isNaN(data.position))
            .sort((a, b) => a[1].position - b[1].position);

        finishers.forEach(([driver1, data1], i) => {
            finishers.slice(i + 1).forEach(([driver2, data2]) => {
                if (stats.drivers[driver1] && stats.drivers[driver2]) {
                    if (!stats.drivers[driver1].headToHead[driver2]) {
                        stats.drivers[driver1].headToHead[driver2] = { ahead: 0, behind: 0 };
                    }
                    if (!stats.drivers[driver2].headToHead[driver1]) {
                        stats.drivers[driver2].headToHead[driver1] = { ahead: 0, behind: 0 };
                    }

                    stats.drivers[driver1].headToHead[driver2].ahead++;
                    stats.drivers[driver2].headToHead[driver1].behind++;
                }
            });
        });
    });

    // Calculate averages
    Object.values(stats.drivers).forEach(driver => {
        if (driver.validPositions > 0) {
            driver.averagePosition = (driver.totalPosition / driver.validPositions).toFixed(2);
        }
        driver.championships = driver.championships.size;
        driver.seasons = driver.seasons.size;
        driver.finishRate = ((driver.races - driver.dnf - driver.dns) / driver.races * 100).toFixed(1);
    });

    return stats;
}

// Display overall stats
function displayOverallStats(stats) {
    const container = document.getElementById('overall-stats');
    if (!container) {
        console.error('overall-stats container not found');
        return;
    }
    
    const statCards = state.selectedDrivers.map(driver => {
        const driverStats = stats.drivers[driver.name];
        const displayName = driver.name.replaceAll('_', ' ');
        
        return `
            <div class="stat-card bg-gray-50 dark:bg-gray-700 rounded-lg p-6 border-l-4 hover-lift animate-fade-in"
                 style="border-color: ${driver.color}">
                <h3 class="font-bold text-xl text-gray-900 dark:text-gray-100 mb-4">${displayName}</h3>
                <div class="space-y-2">
                    <div class="flex justify-between">
                        <span class="text-gray-600 dark:text-gray-400">Races:</span>
                        <span class="font-semibold text-gray-900 dark:text-gray-100">${driverStats.races}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600 dark:text-gray-400">Wins:</span>
                        <span class="font-semibold text-green-600 dark:text-green-400">${driverStats.wins}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600 dark:text-gray-400">Podiums:</span>
                        <span class="font-semibold text-blue-600 dark:text-blue-400">${driverStats.podiums}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600 dark:text-gray-400">Avg Position:</span>
                        <span class="font-semibold text-gray-900 dark:text-gray-100">${driverStats.averagePosition}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600 dark:text-gray-400">Best:</span>
                        <span class="font-semibold text-yellow-600 dark:text-yellow-400">P${driverStats.bestPosition || 'N/A'}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600 dark:text-gray-400">DNF Rate:</span>
                        <span class="font-semibold text-red-600 dark:text-red-400">${(driverStats.dnf / driverStats.races * 100).toFixed(1)}%</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600 dark:text-gray-400">Finish Rate:</span>
                        <span class="font-semibold text-green-600 dark:text-green-400">${driverStats.finishRate}%</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = statCards;
}

// Display charts
function displayCharts(stats) {
    destroyCharts();

    createResultsChart(stats);
    createAveragePositionChart(stats);
    createRadarChart(stats);
    createWinRateChart(stats);
}

// Create results distribution chart
function createResultsChart(stats) {
    const ctx = document.getElementById('results-chart');
    
    const datasets = state.selectedDrivers.map(driver => {
        const driverStats = stats.drivers[driver.name];
        const displayName = driver.name.replaceAll('_', ' ');
        return {
            label: displayName,
            data: [driverStats.wins, driverStats.podiums - driverStats.wins, driverStats.races - driverStats.podiums - driverStats.dnf, driverStats.dnf],
            backgroundColor: driver.color,
            borderColor: driver.color,
            borderWidth: 2
        };
    });

    state.charts.results = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Wins', 'Other Podiums', 'Other Finishes', 'DNF'],
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                    }
                },
                tooltip: {
                    backgroundColor: "#111827",
                    titleColor: "#ffffff",
                    bodyColor: "#d1d5db",
                    borderColor: "#3B82F6",
                    borderWidth: 1,
                    cornerRadius: 8,
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1,
                    },
                    grid: {
                        color: 'rgba(156, 163, 175, 0.2)'
                    },
                    title: {
                    }
                },
                x: {
                    ticks: {
                    },
                    grid: {
                        display: false
                    },
                    title: {
                    }
                }
            }
        }
    });
}

// Create average position chart
function createAveragePositionChart(stats) {
    const ctx = document.getElementById('average-position-chart');
    
    const data = state.selectedDrivers.map(driver => ({
        name: driver.name.replaceAll('_', ' '),
        avgPos: parseFloat(stats.drivers[driver.name].averagePosition),
        color: driver.color
    })).sort((a, b) => a.avgPos - b.avgPos);

    state.charts.avgPosition = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d.name),
            datasets: [{
                label: 'Average Position',
                data: data.map(d => d.avgPos),
                backgroundColor: data.map(d => d.color),
                borderColor: data.map(d => d.color),
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: "#111827",
                    titleColor: "#ffffff",
                    bodyColor: "#d1d5db",
                    borderColor: "#3B82F6",
                    borderWidth: 1,
                    cornerRadius: 8
                }
            },
            scales: {
                x: {
                    reverse: true,
                    beginAtZero: true,
                    ticks: {
                    },
                    grid: {
                        color: 'rgba(156, 163, 175, 0.2)'
                    },
                    title: {
                    }
                },
                y: {
                    ticks: {
                    },
                    grid: {
                        display: false
                    },
                    title: {
                    }
                }
            }
        }
    });
}

// Create radar chart
function createRadarChart(stats) {
    const ctx = document.getElementById('radar-chart');
    
    const datasets = state.selectedDrivers.map(driver => {
        const driverStats = stats.drivers[driver.name];
        const displayName = driver.name.replaceAll('_', ' ');
        const maxRaces = Math.max(...Object.values(stats.drivers).map(d => d.races));
        
        return {
            label: displayName,
            data: [
                (driverStats.wins / maxRaces * 100).toFixed(0),
                (driverStats.podiums / maxRaces * 100).toFixed(0),
                parseFloat(driverStats.finishRate),
                (driverStats.polePositions / maxRaces * 100).toFixed(0),
                (driverStats.fastestLaps / maxRaces * 100).toFixed(0)
            ],
            backgroundColor: driver.color + '33',
            borderColor: driver.color,
            borderWidth: 2,
            pointBackgroundColor: driver.color,
            pointBorderColor: '#fff',
            pointHoverBackgroundColor: '#fff',
            pointHoverBorderColor: driver.color
        };
    });

    state.charts.radar = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Win %', 'Podium %', 'Finish %', 'Pole %', 'Fastest Lap %'],
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                    }
                },
                tooltip: {
                    backgroundColor: "#111827",
                    titleColor: "#ffffff",
                    bodyColor: "#d1d5db",
                    borderColor: "#3B82F6",
                    borderWidth: 1,
                    cornerRadius: 8
                }
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                    },
                    grid: {
                        color: 'rgba(156, 163, 175, 0.3)'
                    },
                    pointLabels: {
                    }
                }
            }
        }
    });
}

// Create win rate chart
function createWinRateChart(stats) {
    const ctx = document.getElementById('winrate-chart');
    
    // Calculate overall win rate for each driver against others
    const data = state.selectedDrivers.map(driver => {
        const driverStats = stats.drivers[driver.name];
        const displayName = driver.name.replaceAll('_', ' ');
        let totalBattles = 0;
        let totalWins = 0;

        Object.values(driverStats.headToHead).forEach(h2h => {
            totalBattles += h2h.ahead + h2h.behind;
            totalWins += h2h.ahead;
        });

        return {
            name: displayName,
            winRate: totalBattles > 0 ? (totalWins / totalBattles * 100).toFixed(1) : 0,
            color: driver.color
        };
    }).sort((a, b) => b.winRate - a.winRate);

    state.charts.winRate = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: data.map(d => `${d.name} (${d.winRate}%)`),
            datasets: [{
                data: data.map(d => d.winRate),
                backgroundColor: data.map(d => d.color),
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: true,
                    position: 'right',
                    labels: {
                    }
                },
                tooltip: {
                    backgroundColor: "#111827",
                    titleColor: "#ffffff",
                    bodyColor: "#d1d5db",
                    borderColor: "#3B82F6",
                    borderWidth: 1,
                    cornerRadius: 8
                }
            }
        }
    });
}

// Display head to head matrix
function displayHeadToHeadMatrix(stats) {
    const container = document.getElementById('head-to-head-matrix');
    
    const drivers = state.selectedDrivers;
    
    let html = `
        <table class="min-w-full bg-white dark:bg-gray-700 rounded-lg overflow-hidden">
            <thead class="bg-gray-200 dark:bg-gray-600">
                <tr>
                    <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Driver</th>
    `;

    drivers.forEach(driver => {
        html += `<th class="px-4 py-3 text-center text-sm font-semibold" style="color: ${driver.color}">${driver.name.replaceAll('_', ' ')}</th>`;
    });

    html += `</tr></thead><tbody>`;

    drivers.forEach((driver1, i) => {
        const driverStats = stats.drivers[driver1.name];
        
        html += `
            <tr class="border-t dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition">
                <td class="px-4 py-3 font-semibold" style="color: ${driver1.color}">${driver1.name.replaceAll('_', ' ')}</td>
        `;

        drivers.forEach((driver2, j) => {
            if (i === j) {
                html += `<td class="px-4 py-3 text-center bg-gray-100 dark:bg-gray-800">-</td>`;
            } else {
                const h2h = driverStats.headToHead[driver2.name];
                if (h2h) {
                    const total = h2h.ahead + h2h.behind;
                    const percentage = (h2h.ahead / total * 100).toFixed(0);
                    const isWinning = h2h.ahead > h2h.behind;
                    
                    html += `
                        <td class="px-4 py-3 text-center ${isWinning ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}">
                            <div class="font-bold text-lg">${h2h.ahead}-${h2h.behind}</div>
                            <div class="text-xs text-gray-600 dark:text-gray-400">${percentage}%</div>
                        </td>
                    `;
                } else {
                    html += `<td class="px-4 py-3 text-center text-gray-400">N/A</td>`;
                }
            }
        });

        html += `</tr>`;
    });

    html += `</tbody></table>`;

    container.innerHTML = html;
}

// Display race breakdown
function displayRaceBreakdown(races) {
    const container = document.getElementById('race-breakdown');
    
    // Populate filters
    populateFilters(races);

    // Apply current filters
    const filteredRaces = applyRaceFilters(races);

    let html = `
        <table class="min-w-full bg-white dark:bg-gray-700 rounded-lg overflow-hidden">
            <thead class="bg-gray-200 dark:bg-gray-600">
                <tr>
                    <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Season</th>
                    <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Championship</th>
                    <th class="px-4 py-3 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">Race</th>
    `;

    state.selectedDrivers.forEach(driver => {
        html += `<th class="px-4 py-3 text-center text-sm font-semibold" style="color: ${driver.color}">${driver.name.replaceAll('_', ' ')}</th>`;
    });

    html += `</tr></thead><tbody>`;

    filteredRaces.forEach((race, index) => {
        const championshipDisplay = race.championship.replaceAll('_', ' ');
        html += `
            <tr class="border-t dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition ${index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800/50' : ''}">
                <td class="px-4 py-3 text-gray-700 dark:text-gray-300">${race.season}</td>
                <td class="px-4 py-3 text-gray-700 dark:text-gray-300"><a href="race.html?id=${race.championship}&year=${race.season}" class="text-blue-600 dark:text-blue-400 hover:underline">${championshipDisplay}</a></td>
                <td class="px-4 py-3 text-gray-700 dark:text-gray-300">${race.raceName}</td>
        `;

        state.selectedDrivers.forEach(driver => {
            const raceData = race.drivers[driver.name];
            if (raceData) {
                const position = raceData.position || 'N/A';
                const points = raceData.points || 0;
                const status = raceData.status || '';
                
                let cellClass = 'text-gray-700 dark:text-gray-300';
                if (position === 1) cellClass = 'text-yellow-600 dark:text-yellow-400 font-bold';
                else if (position <= 3) cellClass = 'text-blue-600 dark:text-blue-400 font-semibold';
                else if (status.toLowerCase().includes('dnf')) cellClass = 'text-red-600 dark:text-red-400';

                html += `
                    <td class="px-4 py-3 text-center ${cellClass}">
                        <div>P${position}</div>
                        ${points > 0 ? `<div class="text-xs text-gray-500 dark:text-gray-400">${points} pts</div>` : ''}
                    </td>
                `;
            } else {
                html += `<td class="px-4 py-3 text-center text-gray-400">-</td>`;
            }
        });

        html += `</tr>`;
    });

    html += `</tbody></table>`;

    if (filteredRaces.length === 0) {
        html = '<div class="text-center py-8 text-gray-500 dark:text-gray-400">No races found with current filters</div>';
    }

    container.innerHTML = html;
}

// Populate filter dropdowns
function populateFilters(races) {
    const championships = new Set();
    const seasons = new Set();

    races.forEach(race => {
        championships.add(race.championship);
        seasons.add(race.season);
    });

    // Championships
    const champFilter = document.getElementById('championship-filter');
    const currentChamp = champFilter.value;
    champFilter.innerHTML = '<option value="all">All Championships</option>' +
        Array.from(championships).sort().map(c => 
            `<option value="${c}" ${c === currentChamp ? 'selected' : ''}>${c}</option>`
        ).join('');

    // Seasons
    const seasonFilter = document.getElementById('season-filter');
    const currentSeason = seasonFilter.value;
    seasonFilter.innerHTML = '<option value="all">All Seasons</option>' +
        Array.from(seasons).sort((a, b) => b - a).map(s => 
            `<option value="${s}" ${s === currentSeason ? 'selected' : ''}>${s}</option>`
        ).join('');
}

// Apply race filters
function applyRaceFilters(races) {
    return races.filter(race => {
        if (state.filters.championship !== 'all' && race.championship !== state.filters.championship) {
            return false;
        }
        if (state.filters.season !== 'all' && race.season !== state.filters.season) {
            return false;
        }
        return true;
    });
}

// Apply filters (event handler)
function applyFilters() {
    state.filters.championship = document.getElementById('championship-filter').value;
    state.filters.season = document.getElementById('season-filter').value;

    // Re-render race breakdown with filters
    const races = state.comparisonMode === 'common' ? getCommonRaces() : getAllRaces();
    displayRaceBreakdown(races);
}

// Display interesting facts
function displayInterestingFacts(stats) {
    const container = document.getElementById('interesting-facts');
    const facts = [];

    // Best average position
    const avgPositions = Object.entries(stats.drivers).map(([name, data]) => ({
        name,
        value: parseFloat(data.averagePosition)
    })).sort((a, b) => a.value - b.value);
    
    // Only show if there's a clear winner (not all equal)
    if (avgPositions.length > 1 && avgPositions[0].value !== avgPositions[1].value) {
        const bestAvgDriver = avgPositions[0];
        facts.push(`🏆 <strong>${bestAvgDriver.name.replaceAll('_', ' ')}</strong> has the best average position: <strong>P${bestAvgDriver.value.toFixed(2)}</strong>`);
    }

    // Most wins
    const winsData = Object.entries(stats.drivers).map(([name, data]) => ({
        name,
        value: data.wins
    })).sort((a, b) => b.value - a.value);
    
    if (winsData[0].value > 0 && (winsData.length === 1 || winsData[0].value !== winsData[1].value)) {
        facts.push(`🥇 <strong>${winsData[0].name.replaceAll('_', ' ')}</strong> has the most wins: <strong>${winsData[0].value}</strong>`);
    }

    // Best finish rate
    const finishRates = Object.entries(stats.drivers).map(([name, data]) => ({
        name,
        value: parseFloat(data.finishRate)
    })).sort((a, b) => b.value - a.value);
    
    if (finishRates.length > 1 && finishRates[0].value !== finishRates[1].value) {
        facts.push(`🎯 <strong>${finishRates[0].name.replaceAll('_', ' ')}</strong> has the best finish rate: <strong>${finishRates[0].value}%</strong>`);
    }

    // Most pole positions
    const polesData = Object.entries(stats.drivers).map(([name, data]) => ({
        name,
        value: data.polePositions
    })).sort((a, b) => b.value - a.value);
    
    if (polesData[0].value > 0 && (polesData.length === 1 || polesData[0].value !== polesData[1].value)) {
        facts.push(`⚡ <strong>${polesData[0].name.replaceAll('_', ' ')}</strong> has the most pole positions: <strong>${polesData[0].value}</strong>`);
    }

    // Head to head dominance
    const h2hData = Object.entries(stats.drivers).map(([name, data]) => {
        let totalAhead = 0;
        let totalBehind = 0;
        Object.values(data.headToHead).forEach(h2h => {
            totalAhead += h2h.ahead;
            totalBehind += h2h.behind;
        });
        const total = totalAhead + totalBehind;
        return { name, winRate: total > 0 ? parseFloat((totalAhead / total * 100).toFixed(1)) : 0, total };
    }).sort((a, b) => b.winRate - a.winRate);

    if (h2hData[0].total > 0 && (h2hData.length === 1 || h2hData[0].winRate !== h2hData[1].winRate)) {
        facts.push(`⚔️ <strong>${h2hData[0].name.replaceAll('_', ' ')}</strong> dominates head-to-head: <strong>${h2hData[0].winRate}%</strong> win rate`);
    }

    // Most championships participated
    const champsData = Object.entries(stats.drivers).map(([name, data]) => ({
        name,
        value: data.championships
    })).sort((a, b) => b.value - a.value);
    
    if (champsData.length > 1 && champsData[0].value !== champsData[1].value) {
        facts.push(`🌍 <strong>${champsData[0].name.replaceAll('_', ' ')}</strong> competed in the most championships: <strong>${champsData[0].value}</strong>`);
    }

    container.innerHTML = facts.map(fact => `
        <div class="bg-white/10 backdrop-blur-sm rounded-lg p-4 animate-fade-in">
            <p class="text-sm">${fact}</p>
        </div>
    `).join('');
}

// Export to CSV
function exportToCSV() {
    const races = state.comparisonMode === 'common' ? getCommonRaces() : getAllRaces();
    const filteredRaces = applyRaceFilters(races);

    let csv = 'Season,Championship,Race,' + state.selectedDrivers.map(d => d.name.replaceAll('_', ' ')).join(',') + '\n';

    filteredRaces.forEach(race => {
        let row = `${race.season},${race.championship},${race.raceName}`;
        
        state.selectedDrivers.forEach(driver => {
            const raceData = race.drivers[driver.name];
            const position = raceData?.position || 'N/A';
            row += `,P${position}`;
        });

        csv += row + '\n';
    });

    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `motorsportdb_comparison_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Destroy all charts
function destroyCharts() {
    Object.values(state.charts).forEach(chart => {
        if (chart) chart.destroy();
    });
    state.charts = {};
}

// Utility functions
function getTotalRaces(driverData) {
    let count = 0;
    if (driverData?.seasons) {
        Object.values(driverData.seasons).forEach(season => {
            Object.values(season.championships || {}).forEach(champ => {
                count += Object.keys(champ.races || {}).length;
            });
        });
    }
    return count;
}

function showLoading() {
    document.getElementById('results-section').classList.remove('hidden');
    document.getElementById('loading-indicator').classList.remove('hidden');
    document.getElementById('results-content').classList.add('hidden');
    document.getElementById('empty-state')?.classList.add('hidden');
}

function showError(message) {
    alert(message);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Make removeDriver globally accessible
window.removeDriver = removeDriver;
