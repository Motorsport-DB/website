document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const raceId = urlParams.get("id");
    const year = urlParams.get("year");

    let race = await fetchData("getRaces.php", raceId, year);
    if (race["error"]) {
        document.getElementById("resultsContainer").innerHTML = "<p id='text_error' class='text-red-500'>Race not found.</p>";
        return;
    }

    race.year = year;
    displayMainRaceInfo(race);
    displayRaceStats(race);
    displayRaceResults(race);
    displayDriverComparisonChart(race);
    displayQualifyingRaceChart(race);
    // Deffered loading of links to avoid blocking the main thread
    if (window.innerWidth > 768) { // Only execute if the screen is not a tablet/phone
        if ('requestIdleCallback' in window) {
            requestIdleCallback(() => {
                create_links(document.getElementsByTagName("a"));
            });
        } else {
            setTimeout(() => {
                create_links(document.getElementsByTagName("a"));
            }, 1000);
        }
    }
    await generate_random_cards();
});

function displayMainRaceInfo(race) {
    // BASIC INFORMATION
    document.getElementById("race-name").innerText = race.name.replaceAll("_", " ");
    document.getElementById("race-date").innerText = race.year;

    document.getElementById("race-picture").src = race.picture || "races/picture/default.png";
    
    // YEAR NAVIGATION
    const currentYearSpan = document.getElementById("current-year");
    const prevYearBtn = document.getElementById("prev-year-btn");
    const nextYearBtn = document.getElementById("next-year-btn");
    const prevYearText = document.getElementById("prev-year-text");
    const nextYearText = document.getElementById("next-year-text");
    
    if (currentYearSpan) {
        currentYearSpan.textContent = race.year;
    }
    
    // Show previous year button if available
    if (race.previous && prevYearBtn) {
        const [championship, year] = race.previous;
        prevYearText.textContent = year;
        prevYearBtn.classList.remove("hidden");
        prevYearBtn.onclick = () => {
            window.location.href = `race.html?id=${championship}&year=${year}`;
        };
    }
    
    // Show next year button if available
    if (race.next && nextYearBtn) {
        const [championship, year] = race.next;
        nextYearText.textContent = year;
        nextYearBtn.classList.remove("hidden");
        nextYearBtn.onclick = () => {
            window.location.href = `race.html?id=${championship}&year=${year}`;
        };
    }
}

function displayRaceResults(race) {
    const resultsContainer = document.getElementById("resultsContainer");
    resultsContainer.innerHTML = ""; // Clear the container once
    
    // Add global toggle button
    const toggleAllBtn = document.createElement('div');
    toggleAllBtn.className = 'text-center mb-6';
    toggleAllBtn.innerHTML = `
        <button id="toggle-all-results" class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-all duration-200">
            📂 Collapse All Results
        </button>
    `;
    resultsContainer.appendChild(toggleAllBtn);

    const fragment = document.createDocumentFragment();
    
    Object.keys(race.events).sort().forEach(event => {
        Object.keys(race.events[event]).sort().forEach(session => {
            const sessionDiv = document.createElement('div');
            sessionDiv.classList.add("bg-white", "dark:bg-gray-800", "rounded-xl", "p-6", "my-8", "shadow-md", "border", "border-gray-200", "dark:border-gray-700");
            
            const sectionId = `section-${event.replace(/[^a-zA-Z0-9]/g, '_')}-${session.replace(/[^a-zA-Z0-9]/g, '_')}`;
            const isRaceSession = session.toLowerCase().includes('race');

            // Header with toggle button
            const headerDiv = document.createElement('div');
            headerDiv.className = 'flex justify-between items-center mb-4';
            
            const eventTitle = document.createElement('h2');
            eventTitle.classList.add("text-2xl", "font-bold", "text-blue-600", "dark:text-blue-400", "z-0");
            const eventSpan = document.createElement('span');
            eventSpan.classList.add("relative", "group");
            eventSpan.textContent = `${session} - ${event.replaceAll("_", " ")}`;
            eventTitle.appendChild(eventSpan);
            
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-all duration-200 flex items-center gap-2';
            toggleBtn.onclick = () => toggleSection(sectionId);
            toggleBtn.innerHTML = `
                <svg class="w-5 h-5 toggle-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${isRaceSession ? 'M19 9l-7 7-7-7' : 'M9 5l7 7-7 7'}"></path>
                </svg>
                <span class="toggle-text">${isRaceSession ? 'Collapse' : 'Expand'}</span>
            `;
            
            headerDiv.appendChild(eventTitle);
            headerDiv.appendChild(toggleBtn);
            sessionDiv.appendChild(headerDiv);

            const tableContainer = document.createElement('div');
            tableContainer.id = sectionId;
            tableContainer.classList.add("mt-6", "relative", "z-0", "overflow-x-auto", "sm:overflow-visible");
            if (!isRaceSession) {
                tableContainer.classList.add('hidden');
            }
            const table = document.createElement('table');
            table.classList.add("min-w-full", "table-auto", "text-sm", "text-gray-800", "dark:text-gray-100", "relative", "z-10");

            const thead = document.createElement('thead');
            thead.classList.add("bg-blue-100", "dark:bg-gray-700", "text-blue-700", "dark:text-blue-300");
            const headerRow = document.createElement('tr');
            ['Position', 'Car #', 'Team', 'Drivers', 'Fastest Lap', 'Other Info'].forEach(headerText => {
                const th = document.createElement('th');
                th.classList.add("w-1/12", "p-2", "border-b", "border-gray-300", "dark:border-gray-600");
                th.textContent = headerText;
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);

            const tbody = document.createElement('tbody');
            tbody.classList.add("divide-y", "divide-gray-400", "dark:divide-gray-700");

            const cars = Object.entries(race.events[event][session]).map(([car, data]) => ({ car, data }));

            const classified = cars.filter(({ data }) => !["NC", "DNF", "DNS", "DSQ"].includes(data.position));
            const nonClassified = cars.filter(({ data }) => ["NC", "DNF", "DNS", "DSQ"].includes(data.position));

            classified.sort((a, b) => (parseInt(a.data.position) || 9999) - (parseInt(b.data.position) || 9999));
            nonClassified.sort((a, b) => (b.data.other_info?.Laps || 0) - (a.data.other_info?.Laps || 0));

            [...classified, ...nonClassified].forEach(({ car, data }) => {
                const row = document.createElement('tr');
                row.classList.add("hover:bg-gray-200", "dark:hover:bg-gray-700", "cursor-pointer", "transition");

                const position = data.position ? `P${data.position}` : "N/A";
                const teamName = data.team?.replaceAll("_", " ") ?? "N/A";
                const fastestLap = data.fastest_lap ?? "N/A";

                const drivers = data.drivers?.length
                    ? data.drivers.map(driver => `<span class="relative group"><a class="text-blue-600 dark:text-blue-400 hover:underline" href="driver.html?id=${driver}">${driver.replaceAll("_", " ")}</a></span>`).join(", ")
                    : "N/A";

                const otherInfoHTML = Object.entries(data.other_info || {})
                    .map(([key, value]) => `<span class="mr-2"><strong>${key.replaceAll("_", " ")}:</strong> ${value}</span>`)
                    .join("");

                row.innerHTML = `
                    <td class="p-3 w-1/12">${position}</td>
                    <td class="p-3 w-1/12">${car}</td>
                    <td class="p-3 relative group w-1/4 overflow-visible z-30">
                        <a class="text-blue-600 dark:text-blue-400 hover:underline" href="team.html?id=${data.team}">${teamName}</a>
                    </td>
                    <td class="p-3 w-1/4">${drivers}</td>
                    <td class="p-3 w-1/6">${fastestLap}</td>
                    <td class="p-3 w-1/6">
                        <button class="text-blue-600 dark:text-blue-400 hover:underline" onclick="toggleDetails('${event}-${session}-${car}')">Show Details</button>
                        <span id="${event}-${session}-${car}" class="hidden ml-2 text-gray-600 dark:text-gray-400">${otherInfoHTML || "No additional info"}</span>
                    </td>
                `;

                tbody.appendChild(row);
            });

            table.appendChild(tbody);
            tableContainer.appendChild(table);
            sessionDiv.appendChild(tableContainer);
            fragment.appendChild(sessionDiv);
        });
    });

    resultsContainer.appendChild(fragment);
    
    // Add toggle all functionality
    document.getElementById('toggle-all-results').addEventListener('click', function() {
        const allSections = document.querySelectorAll('[id^="section-"]');
        const allHidden = Array.from(allSections).every(section => section.classList.contains('hidden'));
        
        allSections.forEach(section => {
            if (allHidden) {
                section.classList.remove('hidden');
            } else {
                section.classList.add('hidden');
            }
        });
        
        // Update all toggle buttons
        document.querySelectorAll('.toggle-text').forEach(text => {
            text.textContent = allHidden ? 'Collapse' : 'Expand';
        });
        document.querySelectorAll('.toggle-icon path').forEach(icon => {
            icon.setAttribute('d', allHidden ? 'M19 9l-7 7-7-7' : 'M9 5l7 7-7 7');
        });
        
        this.textContent = allHidden ? '📁 Collapse All Results' : '📂 Expand All Results';
    });
}

function toggleDetails(rowId) {
    document.getElementById(rowId)?.classList.toggle("hidden");
}

function toggleSection(sectionId) {
    const section = document.getElementById(sectionId);
    const button = event.currentTarget;
    const text = button.querySelector('.toggle-text');
    const icon = button.querySelector('.toggle-icon path');
    
    section.classList.toggle('hidden');
    
    if (section.classList.contains('hidden')) {
        text.textContent = 'Expand';
        icon.setAttribute('d', 'M9 5l7 7-7 7');
    } else {
        text.textContent = 'Collapse';
        icon.setAttribute('d', 'M19 9l-7 7-7-7');
    }
}

function getAveragePositionsPerEvent(race) {
    const dataByDriver = {};
    const sortedEvents = Object.keys(race.events).sort();

    sortedEvents.forEach(event => {
        Object.entries(race.events[event]).forEach(([_, sessionData]) => {
            Object.entries(sessionData).forEach(([_, car]) => {
                const position = parseInt(car.position);
                if (isNaN(position) || !car.drivers) return;

                car.drivers.forEach(driver => {
                    if (!dataByDriver[driver]) dataByDriver[driver] = {};
                    if (!dataByDriver[driver][event]) dataByDriver[driver][event] = [];
                    dataByDriver[driver][event].push(position);
                });
            });
        });
    });

    let averageByDriver = {};
    for (const driver in dataByDriver) {
        averageByDriver[driver] = sortedEvents.map(event => {
            const positions = dataByDriver[driver][event] || [];
            return positions.length ? parseFloat((positions.reduce((a, b) => a + b) / positions.length).toFixed(2)) : null;
        });
    }

    const sortedDrivers = Object.keys(averageByDriver).sort((a, b) => {
        const avgA = averageByDriver[a].filter(pos => pos !== null).reduce((sum, pos) => sum + pos, 0) / averageByDriver[a].filter(pos => pos !== null).length || Infinity;
        const avgB = averageByDriver[b].filter(pos => pos !== null).reduce((sum, pos) => sum + pos, 0) / averageByDriver[b].filter(pos => pos !== null).length || Infinity;
        return avgA - avgB;
    });

    const sortedAverageByDriver = {};
    sortedDrivers.forEach(driver => {
        sortedAverageByDriver[driver] = averageByDriver[driver];
    });

    averageByDriver = sortedAverageByDriver;

    return { averageByDriver, sortedEvents };
}

function displayDriverComparisonChart(race) {
    const { averageByDriver, sortedEvents } = getAveragePositionsPerEvent(race);

    const colors = [
        "#f87171", "#60a5fa", "#34d399", "#fbbf24", "#a78bfa",
        "#f472b6", "#38bdf8", "#fb923c", "#4ade80", "#c084fc",
        "#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6"
    ];
    const maxPosition = Math.max(...Object.values(averageByDriver).map(pos => Math.ceil(pos)));

    // Group drivers by car and prepare datasets
    const carGroups = {};
    Object.entries(race.events).forEach(([event, sessions]) => {
        Object.values(sessions).forEach(session => {
            Object.entries(session).forEach(([car, data]) => {
                if (!data.drivers) return;
                if (!carGroups[car]) carGroups[car] = new Set();
                data.drivers.forEach(driver => carGroups[car].add(driver));
            });
        });
    });

    const groupedDataByCar = {};
    Object.entries(averageByDriver).forEach(([driver, positions]) => {
        const car = Object.keys(carGroups).find(car => carGroups[car].has(driver));
        if (!car) return;
        if (!groupedDataByCar[car]) groupedDataByCar[car] = { drivers: new Set(), positions: Array(sortedEvents.length).fill(null) };
        groupedDataByCar[car].drivers.add(driver);
        positions.forEach((position, index) => {
            if (position !== null) {
                groupedDataByCar[car].positions[index] = groupedDataByCar[car].positions[index] === null
                    ? position
                    : (groupedDataByCar[car].positions[index] + position) / 2;
            }
        });
    });

    // Sort cars by their average position closest to 0 and take the top 5
    const topCars = Object.entries(groupedDataByCar)
        .sort(([, a], [, b]) => {
            const avgA = a.positions.filter(pos => pos !== null).reduce((sum, pos) => sum + pos, 0) / a.positions.filter(pos => pos !== null).length || Infinity;
            const avgB = b.positions.filter(pos => pos !== null).reduce((sum, pos) => sum + pos, 0) / b.positions.filter(pos => pos !== null).length || Infinity;
            return avgA - avgB;
        });

    const datasets = topCars.map(([car, data], i) => {
        const driverNames = Array.from(data.drivers).map(driver => driver.replaceAll("_", " ")).join(", ");
        return {
            label: window.innerWidth <= 768 
            ? `#${car}`
            : `${driverNames} #${car}`,
            data: data.positions,
            borderColor: colors[i % colors.length],
            backgroundColor: colors[i % colors.length],
            tension: 0.3,
            spanGaps: true,
            pointRadius: 5,
            pointHoverRadius: 6,
            hidden: i >= 5
        };
    });

    const canvas = document.getElementById("performanceChart");
    if (!canvas) {
        console.error('Canvas element "performanceChart" not found');
        return;
    }
    
    if (datasets.length === 0) {
        console.warn('No data available for performance chart');
        return;
    }
    
    const ctx = canvas.getContext("2d");
    new Chart(ctx, {
        type: "line",
        data: {
            labels: sortedEvents,
            datasets
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
                    beginAtZero: false,
                    min: 1,
                    reverse: true,
                    title: {
                        display: true,
                        text: "Average position"
                    },
                    ticks: {
                        stepSize: 1
                    },
                    grid: {
                        color: 'rgba(156, 163, 175, 0.2)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: "Events"
                    },
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    position: "bottom",
                    labels: {
                        boxWidth: 10, // Reduce box size for legend items
                    },
                    onClick: (e, legendItem, legend) => {
                        const index = legendItem.datasetIndex;
                        const ci = legend.chart;
                        const meta = ci.getDatasetMeta(index);
                        meta.hidden = meta.hidden === null ? !ci.data.datasets[index].hidden : null;
                        ci.update();
                    }
                },
                tooltip: {
                    backgroundColor: "#111827",
                    titleColor: "#ffffff",
                    bodyColor: "#d1d5db",
                    borderColor: "#3B82F6",
                    borderWidth: 1,
                    cornerRadius: 8,
                    mode: 'index',
                    intersect: false
                },
            },
        },
    });
}

function displayRaceStats(race) {
    let totalRaces = 0;
    let totalLaps = 0;
    let fastestLapTime = Infinity;
    let fastestLapDriver = null;
    let fastestLapCircuit = null;

    Object.keys(race.events).forEach(event => {
        Object.keys(race.events[event]).forEach(session => {
            const cars = Object.values(race.events[event][session]);
            cars.forEach(car => {
                if (session.toLowerCase().includes("race")) {
                    totalRaces++;
                    totalLaps += parseInt(car.other_info?.Laps || 0);
                }
                if (car.fastest_lap) {
                    if (
                        car.fastest_lap &&
                        car.fastest_lap !== "0.000" &&
                        car.fastest_lap !== "0:00.000" &&
                        car.fastest_lap !== "0:00" &&
                        car.fastest_lap !== "0"
                    ) {
                        const lapTimeParts = car.fastest_lap.split(":");
                        const lapTime = lapTimeParts.length === 2 
                            ? parseInt(lapTimeParts[0]) * 60 + parseFloat(lapTimeParts[1]) 
                            : parseFloat(car.fastest_lap);
                        if (lapTime > 0 && lapTime < fastestLapTime) {
                            fastestLapTime = lapTime;
                            display_fastest_lap = car.fastest_lap;
                            fastestLapDriver = car.drivers?.[0]?.replaceAll("_", " ") || "Unknown";
                            fastestLapCircuit = `${event} <p>(${session})</p>`;
                        }
                    }
                }
            });
        });
    });

    document.getElementById("totalRaces").innerText = totalRaces;
    document.getElementById("totalLaps").innerText = totalLaps;
    if (
        typeof display_fastest_lap === "string" &&
        display_fastest_lap.trim() !== "" &&
        fastestLapDriver &&
        fastestLapDriver !== "Unknown"
    ) {
        document.getElementById("fastestLap").innerHTML =
            `<strong>${display_fastest_lap}</strong> by ${fastestLapDriver} <p>${fastestLapCircuit}</p>`;
    } else {
        document.getElementById("fastestLap").innerHTML = "N/A";
    }
}

function displayQualifyingRaceChart(race) {
    const driverData = {};
    
    Object.keys(race.events).forEach(event => {
        Object.entries(race.events[event]).forEach(([session, sessionData]) => {
            Object.entries(sessionData).forEach(([car, data]) => {
                if (!data.drivers) return;
                
                data.drivers.forEach(driver => {
                    if (!driverData[driver]) {
                        driverData[driver] = { qualifying: [], race: [] };
                    }
                    
                    const position = parseInt(data.position);
                    if (!isNaN(position)) {
                        if (session.toLowerCase().includes("qualifying") || session.toLowerCase().includes("practice")) {
                            driverData[driver].qualifying.push(position);
                        } else if (session.toLowerCase().includes("race")) {
                            driverData[driver].race.push(position);
                        }
                    }
                });
            });
        });
    });
    
    const canvas = document.getElementById('qualifyingRaceChart');
    if (!canvas) {
        console.error('Canvas element "qualifyingRaceChart" not found');
        return;
    }
    
    // Calculate average positions for each driver
    const driverAverages = {};
    Object.entries(driverData).forEach(([driver, data]) => {
        const avgQualifying = data.qualifying.length > 0 
            ? data.qualifying.reduce((sum, pos) => sum + pos, 0) / data.qualifying.length 
            : null;
        const avgRace = data.race.length > 0 
            ? data.race.reduce((sum, pos) => sum + pos, 0) / data.race.length 
            : null;
        
        if (avgQualifying !== null && avgRace !== null) {
            driverAverages[driver] = {
                qualifying: avgQualifying,
                race: avgRace,
                qualifyingCount: data.qualifying.length,
                raceCount: data.race.length
            };
        }
    });
    
    // Filter drivers who have both qualifying and race data
    // Sort by position difference: most gained positions first, most lost positions last
    const validDrivers = Object.entries(driverAverages)
        .sort((a, b) => {
            const diffA = a[1].qualifying - a[1].race;
            const diffB = b[1].qualifying - b[1].race;
            return diffB - diffA; // Descending order (most gained to most lost)
        });
    
    if (validDrivers.length === 0) {
        console.warn('No qualifying vs race data available');
        return;
    }
    
    const labels = validDrivers.map(([driver, _]) => driver.replaceAll("_", " "));
    
    // Calculate position difference (qualifying - race)
    // Positive = gained positions (green), Negative = lost positions (red)
    const positionDifferences = validDrivers.map(([_, data]) => data.qualifying - data.race);
    
    // Create colors array based on whether positions were gained or lost
    const backgroundColors = positionDifferences.map(diff => 
        diff > 0 ? 'rgba(16, 185, 129, 0.7)' : 'rgba(239, 68, 68, 0.7)'
    );
    const borderColors = positionDifferences.map(diff => 
        diff > 0 ? 'rgba(16, 185, 129, 1)' : 'rgba(239, 68, 68, 1)'
    );
    
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Position Change',
                    data: positionDifferences,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 1
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
                    beginAtZero: true,
                    title: { 
                        display: true, 
                        text: 'Positions Gained/Lost' 
                    },
                    ticks: { 
                        stepSize: 1,
                        callback: function(value) {
                            return value > 0 ? '+' + value : value;
                        }
                    },
                    grid: { color: 'rgba(156, 163, 175, 0.2)' }
                },
                x: {
                    title: { display: true, text: 'Driver' },
                    grid: { display: false }
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
                            const value = context.parsed.y;
                            const driverIndex = context.dataIndex;
                            const driver = validDrivers[driverIndex];
                            const qualAvg = driver[1].qualifying.toFixed(2);
                            const raceAvg = driver[1].race.toFixed(2);
                            const qualCount = driver[1].qualifyingCount;
                            const raceCount = driver[1].raceCount;
                            
                            if (value > 0) {
                                return `Gained ${value.toFixed(2)} positions (Q avg: P${qualAvg} [${qualCount}] → Race avg: P${raceAvg} [${raceCount}])`;
                            } else if (value < 0) {
                                return `Lost ${Math.abs(value).toFixed(2)} positions (Q avg: P${qualAvg} [${qualCount}] → Race avg: P${raceAvg} [${raceCount}])`;
                            } else {
                                return `No change (avg: P${qualAvg})`;
                            }
                        }
                    }
                }
            }
        }
    });
}