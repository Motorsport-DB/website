document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const raceId = urlParams.get("id");
    const year = urlParams.get("year");

    let race = await fetchData("getRaces.php", raceId, year);
    if (race["error"]) {
        document.getElementById("raceDetail").innerHTML = "<p id='text_error' class='text-red-500'>Race not found.</p>";
        return;
    }

    displayMainRaceInfo(race);
    displayRaceResults(race);
    displayDriverComparisonChart(race);
});

function displayMainRaceInfo(race) {
    const picture = race.picture || "default.png";
    const nickname = race.nickname ? `Nickname: ${race.nickname}` : "";
    const country = race.country?.toLowerCase() || "default";

    document.getElementById("raceDetail").innerHTML = `
        <img src="${picture}" class="w-40 h-40 object-contain aspect-[3/2] rounded-lg mr-6" alt="Picture of ${race.name}">
        <div>
            <h1 class="text-3xl font-bold">${race.name.replaceAll("_", " ")}</h1>
            <p class="text-lg text-gray-300">${nickname}</p>
            <div id="country_flag" class="flex items-center mt-2">
                <img src="assets/flags/${country}.png" class="w-8 aspect-[3/2] mr-2 rounded" alt="Country Flag">
            </div>
        </div>`;
}

function displayRaceResults(race) {
    const resultsContainer = document.getElementById("resultsContainer");
    resultsContainer.innerHTML = "";

    Object.keys(race.events).sort().forEach(event => {
        let eventHTML = `<h2 class="text-xl font-bold mt-6">${event}</h2>`;

        Object.keys(race.events[event]).sort().forEach(session => {
            let sessionHTML = `<h3 class="text-lg font-semibold mt-4">${session}</h3>`;
            sessionHTML += `
                <table class="table-fixed w-full mt-2 bg-gray-800 text-white border border-gray-700">
                    <thead>
                        <tr class="bg-gray-700">
                            <th class="w-1/12 p-2 border border-gray-600">Position</th>
                            <th class="w-1/12 p-2 border border-gray-600">Car #</th>
                            <th class="w-1/6 p-2 border border-gray-600">Team</th>
                            <th class="w-1/6 p-2 border border-gray-600">Drivers</th>
                            <th class="w-1/6 p-2 border border-gray-600">Fastest Lap</th>
                            <th class="w-1/6 p-2 border border-gray-600">Other Info</th>
                        </tr>
                    </thead>
                    <tbody>`;

            const cars = Object.entries(race.events[event][session]).map(([car, data]) => ({ car, data }));

            const classified = cars.filter(({ data }) => !["NC", "DNF", "DNS", "DSQ"].includes(data.position));
            const nonClassified = cars.filter(({ data }) => ["NC", "DNF", "DNS", "DSQ"].includes(data.position));

            classified.sort((a, b) => (parseInt(a.data.position) || 9999) - (parseInt(b.data.position) || 9999));
            nonClassified.sort((a, b) => (b.data.other_info?.Laps || 0) - (a.data.other_info?.Laps || 0));

            [...classified, ...nonClassified].forEach(({ car, data }) => {
                const rowId = `details-${event}-${session}-${car}`;
                const teamName = data.team?.replaceAll("_", " ") ?? "N/A";
                const position = data.position ? `P${data.position}` : "N/A";
                const fastestLap = data.fastest_lap ?? "N/A";

                const drivers = data.drivers?.length
                    ? data.drivers.map(driver => `<a class="text-blue-400 underline" href="driver.html?id=${driver}">${driver.replaceAll("_", " ")}</a>`).join(", ")
                    : "N/A";

                const otherInfoHTML = Object.entries(data.other_info || {})
                    .map(([key, value]) => `<span class="mr-2"><strong>${key.replaceAll("_", " ")}:</strong> ${value}</span>`)
                    .join("");

                sessionHTML += `
                    <tr class="border border-gray-700 cursor-pointer">
                        <td class="p-2 border border-gray-600">${position}</td>
                        <td class="p-2 border border-gray-600">${car}</td>
                        <td class="p-2 border border-gray-600">
                            <a class="text-blue-400 underline" href="team.html?id=${data.team}">${teamName}</a>
                        </td>
                        <td class="p-2 border border-gray-600">${drivers}</td>
                        <td class="p-2 border border-gray-600">${fastestLap}</td>
                        <td class="p-2 border border-gray-600">
                            <button class="text-blue-400 underline" onclick="toggleDetails('${rowId}')">Show Details</button>
                            <span id="${rowId}" class="hidden ml-2">${otherInfoHTML || "No additional info"}</span>
                        </td>
                    </tr>`;
            });

            sessionHTML += "</tbody></table>";
            eventHTML += sessionHTML;
        });

        resultsContainer.innerHTML += eventHTML;
    });
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
    const datasets = Object.entries(averageByDriver).map(([driver, data], i) => ({
        label: driver.replaceAll("_", " "),
        data,
        borderColor: colors[i % colors.length],
        backgroundColor: colors[i % colors.length],
        tension: 0.3,
        spanGaps: true,
        pointRadius: 5,
        pointHoverRadius: 6,
        hidden: i >= 5
    }));

    const ctx = document.getElementById("driverComparisonChart").getContext("2d");
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
                    },
                    x: {
                        title: {
                            display: true,
                            text: "Events"
                        },
                        ticks: {
                            font: {
                                size: window.innerWidth < 768 ? 7 : 12 // Adjust font size for mobile
                            }
                        }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw ?? "N/A"}`;
                        }
                    }
                },
                legend: {
                    position: window.innerWidth < 768 ? "right" : "bottom",
                    labels: {
                        color: "white",
                        boxWidth: 10, // Reduce box size for legend items
                        font: {
                            size: window.innerWidth < 768 ? 7 : 12 // Adjust font size for mobile
                        }
                    }
                }
            }
        }
    });
}
