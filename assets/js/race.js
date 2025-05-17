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
}

function displayRaceResults(race) {
    const resultsContainer = document.getElementById("resultsContainer");
    resultsContainer.innerHTML = ""; // Clear the container once

    const fragment = document.createDocumentFragment();
    
    Object.keys(race.events).sort().forEach(event => {
        Object.keys(race.events[event]).sort().forEach(session => {
            const sessionDiv = document.createElement('div');
            sessionDiv.classList.add("bg-white", "dark:bg-gray-800", "rounded-xl", "p-6", "my-8", "shadow-md", "border", "border-gray-200", "dark:border-gray-700");

            const eventTitle = document.createElement('h2');
            eventTitle.classList.add("text-2xl", "font-bold", "text-blue-600", "dark:text-blue-400", "mb-4", "z-0");
            const eventSpan = document.createElement('span');
            eventSpan.classList.add("relative", "group");
            eventSpan.textContent = `${session} - ${event.replaceAll("_", " ")}`;
            eventTitle.appendChild(eventSpan);
            sessionDiv.appendChild(eventTitle);

            const tableContainer = document.createElement('div');
            tableContainer.classList.add("mt-6", "relative", "z-0", "overflow-x-auto", "sm:overflow-visible");
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
}

function toggleDetails(rowId) {
    document.getElementById(rowId)?.classList.toggle("hidden");
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

    const ctx = document.getElementById("performanceChart").getContext("2d");
    new Chart(ctx, {
        type: "line",
        data: {
            labels: sortedEvents,
            datasets
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    min: 1,
                    max: maxPosition,
                    reverse: true,
                    title: {
                        display: true,
                        text: "Average position"
                    },
                    ticks: {
                        stepSize: 1
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: "Events"
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
                    mode: 'index',
                    intersect: false,
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