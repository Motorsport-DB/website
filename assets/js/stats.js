// Global Statistics for index.html
let statsChartsInstances = {};

async function loadGlobalStats() {
    try {
        // Wait for Chart.js to be loaded
        if (typeof Chart === 'undefined') {
            console.warn('Chart.js not loaded yet, retrying...');
            setTimeout(loadGlobalStats, 100);
            return;
        }
        
        // Load pre-generated global statistics from cards.json
        let globalStats = null;
        try {
            const cardsResponse = await fetch('cards.json');
            if (cardsResponse.ok) {
                const cardsData = await cardsResponse.json();
                if (cardsData && cardsData.statistics) {
                    globalStats = {
                        totalChampionships: cardsData.statistics.numbers_of_championship,
                        totalRaces: cardsData.statistics.numbers_of_races,
                        lastUpdated: cardsData.generated_at
                    };
                }
            }
        } catch (error) {
            console.warn('Could not load cards.json statistics, will use placeholders:', error);
        }
        
        // Load all drivers to get statistics
        const driversResponse = await fetch('getDriversList.php');
        const driversData = await driversResponse.json();
        
        
        // Calculate statistics
        const totalDrivers = driversData.length;
        
        // Count nationalities
        const nationalityCounts = {};
        const birthYears = {};
        
        driversData.forEach(driver => {
            // Count nationality (stored as 'country' in JSON)
            if (driver.country) {
                nationalityCounts[driver.country] = (nationalityCounts[driver.country] || 0) + 1;
            }
            
            // Count by decade of birth
            if (driver.dateOfBirth) {
                const year = parseInt(driver.dateOfBirth.split('-')[0]);
                if (!isNaN(year)) {
                    const decade = Math.floor(year / 10) * 10;
                    birthYears[decade] = (birthYears[decade] || 0) + 1;
                }
            }
        });
        
        
        // Update stats cards
        document.getElementById('totalDrivers').textContent = totalDrivers.toLocaleString();
        
        // Load teams count
        try {
            const teamsResponse = await fetch('getTeamsList.php');
            const teamsData = await teamsResponse.json();
            document.getElementById('totalTeams').textContent = teamsData.length.toLocaleString();
        } catch (error) {
            document.getElementById('totalTeams').textContent = 'N/A';
        }
        
        // Use pre-generated stats if available, otherwise use placeholders
        if (globalStats) {
            document.getElementById('totalChampionships').textContent = globalStats.totalChampionships.toLocaleString();
            document.getElementById('totalRaces').textContent = globalStats.totalRaces.toLocaleString();
            console.log('Using statistics from cards.json, generated at:', globalStats.lastUpdated);
        } else {
            document.getElementById('totalChampionships').textContent = '50+';
            document.getElementById('totalRaces').textContent = '10,000+';
            console.warn('cards.json not found or incomplete. Using API endpoint /api/cards.php instead.');
        }
        
        // Create charts
        createNationalityChart(nationalityCounts);
        createGrowthChart(birthYears);
        
    } catch (error) {
        console.error('Error loading global stats:', error);
        document.getElementById('totalDrivers').textContent = 'Error';
        document.getElementById('totalTeams').textContent = 'Error';
        document.getElementById('totalChampionships').textContent = 'Error';
        document.getElementById('totalRaces').textContent = 'Error';
    }
}

function createNationalityChart(nationalityCounts) {
    const ctx = document.getElementById('nationalityChart');
    if (!ctx) {
        console.error('nationalityChart canvas not found');
        return;
    }
    
    // Sort and get top 10 nationalities
    const sortedNationalities = Object.entries(nationalityCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    const labels = sortedNationalities.map(([country]) => country.replaceAll('_', ' '));
    const data = sortedNationalities.map(([, count]) => count);
    
    
    // Generate colors
    const colors = [
        'rgba(59, 130, 246, 0.8)',   // blue
        'rgba(239, 68, 68, 0.8)',    // red
        'rgba(34, 197, 94, 0.8)',    // green
        'rgba(251, 191, 36, 0.8)',   // amber
        'rgba(147, 51, 234, 0.8)',   // purple
        'rgba(236, 72, 153, 0.8)',   // pink
        'rgba(20, 184, 166, 0.8)',   // teal
        'rgba(249, 115, 22, 0.8)',   // orange
        'rgba(99, 102, 241, 0.8)',   // indigo
        'rgba(168, 85, 247, 0.8)'    // violet
    ];
    
    if (statsChartsInstances.nationality) {
        statsChartsInstances.nationality.destroy();
    }
    
    try {
        statsChartsInstances.nationality = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Number of Drivers',
                    data: data,
                    backgroundColor: colors,
                    borderColor: colors.map(c => c.replace('0.8', '1')),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                indexAxis: 'y',
                scales: {
                    x: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        },
                        grid: {
                            color: 'rgba(156, 163, 175, 0.2)'
                        }
                    },
                    y: {
                        grid: {
                            display: false
                        }
                    }
                },
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
                    cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                return `${context.parsed.x} drivers`;
                            }
                        }
                    }
                }
            }
        });
    } catch (error) {
        console.error('Error creating nationality chart:', error);
    }
}

function createGrowthChart(birthYears) {
    const ctx = document.getElementById('growthChart');
    if (!ctx) return;
    
    // Sort decades
    const sortedDecades = Object.entries(birthYears)
        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
    
    const labels = sortedDecades.map(([decade]) => `${decade}s`);
    const data = sortedDecades.map(([, count]) => count);
    
    // Calculate cumulative
    const cumulative = [];
    let sum = 0;
    data.forEach(value => {
        sum += value;
        cumulative.push(sum);
    });
    
    if (statsChartsInstances.growth) {
        statsChartsInstances.growth.destroy();
    }
    
    statsChartsInstances.growth = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Drivers Born',
                    data: data,
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: 'Cumulative Total',
                    data: cumulative,
                    backgroundColor: 'rgba(34, 197, 94, 0.2)',
                    borderColor: 'rgba(34, 197, 94, 1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: {
                mode: 'index',
                intersect: false
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Drivers per Decade'
                    },
                    grid: {
                        color: 'rgba(156, 163, 175, 0.2)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Cumulative Total'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 10
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
            }
        }
    });
}

// Load stats when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadGlobalStats);
} else {
    loadGlobalStats();
}

// Reload charts when theme changes
window.addEventListener('themeChanged', () => {
    loadGlobalStats();
});
