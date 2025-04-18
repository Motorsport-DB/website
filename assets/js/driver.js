document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const driverId = urlParams.get("id");

    let driver = await fetchData("getDrivers.php", driverId);
    driver = driver[0];
    if (!driver) {
        document.getElementById("driverDetail").innerHTML = "<p id='text_error' class='text-red-500'>Driver not found.</p>";
        return;
    }
    driver.age = getAge(driver.dateOfBirth, driver.dateOfDeath);
    displayMainDriverInfo(driver);
    displayDriverResults(driver);
    displayDriverPerformanceChart(driver);
    displayDriverPointsChart(driver);
});

function displayMainDriverInfo(driver) {
    document.getElementById("driverDetail").innerHTML = `
        <img src="${driver.picture}" class="w-40 h-40 object-contain aspect-[3/2] rounded-lg mr-6" alt="Picture of ${driver.firstName} ${driver.lastName}">
        <div>
            <h1 class="text-3xl font-bold">${driver.firstName} ${driver.lastName}</h1>
            <p class="text-lg text-gray-300">${driver.nickname ? `Nickname: ${driver.nickname}` : ""}</p>
            ${driver.dateOfBirth ? `<p>Date of Birth: ${driver.dateOfBirth} (Age: ${driver.age})</p>` : ""}
            ${driver.dateOfDeath ? `<p>Date of Death: ${driver.dateOfDeath}</p>` : ""}
            <div id="country_flag" class="flex items-center mt-2">
                
            </div>
        </div>
    `;
    if (driver.country) {
        document.getElementById("country_flag").innerHTML += `<img src="assets/flags/${driver.country.toLowerCase()+".png"}" class="w-10 aspect-[3/2] rounded" alt="Country Flag">`;
    } else {
        document.getElementById("country_flag").innerHTML += `<img src="assets/flags/default.png" class="w-10 aspect-[3/2] rounded" alt="Country Flag">`;
    }
}

function displayDriverResults(driver) {
    const resultsContainer = document.getElementById("resultsContainer");

    const seasonsInFileOrder = Object.keys(driver.seasons).sort((a, b) => b - a);
    for (const season of seasonsInFileOrder) {
        for (const championship in driver.seasons[season]) {
            if (championship === "standing") continue;
    
            let standing = driver.seasons[season][championship].standing;
            let standingHTML = standing ? `<span class='text-blue-400'>Standing: P${standing.position} | Total Points: ${standing.points}</span>` : "";
    
            let seasonHTML = `<h3><a href="race.html?id=${championship}&year=${season}" class="text-lg font-semibold mt-4 text-blue-400 underline">${season} - ${championship.replace("_", " ")} ${standingHTML}</a></h3>`;
    
            let races = {};
            for (const race in driver.seasons[season][championship]) {
                if (race === "standing") continue;
    
                for (const session in driver.seasons[season][championship][race]) {
                    if (!races[race]) races[race] = [];
                    races[race].push({ session, ...driver.seasons[season][championship][race][session] });
                }
            }
    
            seasonHTML += `<table class="table-fixed w-full mt-2 bg-gray-800 text-white border border-gray-700">
                            <thead>
                                <tr class="bg-gray-700">
                                    <th class="w-1/4 p-2 border border-gray-600">Race</th>
                                    <th class="w-1/6 p-2 border border-gray-600">Session</th>
                                    <th class="w-1/12 p-2 border border-gray-600">Position</th>
                                    <th class="w-1/6 p-2 border border-gray-600">Fastest Lap</th>
                                    <th class="w-1/6 p-2 border border-gray-600">Team</th>
                                    <th class="w-1/6 p-2 border border-gray-600">Other Info</th>
                                </tr>
                            </thead>
                            <tbody>`;

            for (const race in races) {
                let firstRow = true;
                let rowspan = races[race].length;
                races[race].forEach((data, index) => {
                    let position = data.position ?? "N/A";
                    let fastestLap = data.fastest_lap ?? "N/A";
                    let team = data.team ?? "N/A";

                    let otherInfoHTML = Object.entries(data.other_info || {})
                        .map(([key, value]) => `<span class="mr-2"><strong>${key.replace(/_/g, " ")}:</strong>${value}</span>`)
                        .join("");

                    let rowId = `details-${season}-${championship}-${race}-${index}`;

                    seasonHTML += `<tr class="border border-gray-700 cursor-pointer">`;
                    if (firstRow) {
                        seasonHTML += `<td class="p-2 border border-gray-600" rowspan="${rowspan}">${race}</td>`;
                        firstRow = false;
                    }
                    seasonHTML += `
                            <td class="p-2 border border-gray-600">${data.session}</td>
                            <td class="p-2 border border-gray-600">P${position}</td>
                            <td class="p-2 border border-gray-600">${fastestLap}</td>
                            <td class="p-2 border border-gray-600">
                                <a class="text-blue-400 underline focus:outline-none" href='team.html?id=${team}')">${team.replace("_", " ")}</a>
                            </td>
                            <td class="p-2 border border-gray-600">
                                <button class="text-blue-400 underline focus:outline-none" onclick="toggleDetails('${rowId}')">Show Details</button>
                                <span id="${rowId}" class="hidden ml-2">${otherInfoHTML || "No additional info"}</span>
                            </td>
                        </tr>`;
                });
            }

            seasonHTML += `</tbody></table>`;
            resultsContainer.innerHTML += seasonHTML;
        }
    }
}
function displayDriverPerformanceChart(driver) {
    const averageByYear = {};

    for (const season of Object.keys(driver.seasons)) {
        let totalPositions = 0;
        let count = 0;

        for (const championship of Object.keys(driver.seasons[season])) {
            if (championship === "standing") continue;

            const races = driver.seasons[season][championship];
            for (const race of Object.keys(races)) {
                if (race === "standing") continue;

                for (const session of Object.keys(races[race])) {
                    const sessionData = races[race][session];
                    const position = parseInt(sessionData.position);

                    if (!isNaN(position)) {
                        totalPositions += position;
                        count++;
                    }
                }
            }
        }

        if (count > 0) {
            averageByYear[season] = totalPositions / count;
        }
    }

    const sortedYears = Object.keys(averageByYear).sort();
    const averagePositions = sortedYears.map(year => averageByYear[year].toFixed(0));
    const maxPosition = Math.max(...Object.values(averageByYear).map(pos => Math.ceil(pos)));

    const ctx = document.getElementById('performanceChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedYears,
            datasets: [{
                label: 'Average position',
                data: averagePositions,
                borderColor: "rgb(59, 130, 246)",
                backgroundColor: "rgb(147, 197, 253)",
                tension: 0.3,
                pointRadius: 5,
                pointHoverRadius: 6,
            }]
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
                        text: 'Average position'
                    },
                    ticks: {
                        stepSize: 1 
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Season'
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(ctx) {
                            return `P${ctx.raw}`;
                        }
                    }
                },
                legend: {
                    position: "bottom",
                    labels: {
                        color: "white"
                    }
                }
            }
        }
    });
}

function displayDriverPointsChart(driver) {
    const pointsByYear = {};

    for (const season of Object.keys(driver.seasons)) {
        let totalPoints = 0;

        for (const championship of Object.keys(driver.seasons[season])) {
            if (championship === "standing") continue;

            const standing = driver.seasons[season][championship]?.standing;
            if (standing && !isNaN(parseFloat(standing.points))) {
                totalPoints += parseFloat(standing.points);
            }
        }

        pointsByYear[season] = totalPoints;
    }
    if (Object.values(pointsByYear).every(points => points === 0)) {
        document.getElementById('pointsChart').style.display = 'none';
        return;
    }

    const sortedYears = Object.keys(pointsByYear).sort();
    const points = sortedYears.map(year => pointsByYear[year]);

    const ctx = document.getElementById('pointsChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedYears,
            datasets: [{
                label: 'Points',
                data: points,
                borderColor: "rgb(59, 130, 246)",
                backgroundColor: "rgb(147, 197, 253)",
                tension: 0.3,
                pointRadius: 5,
                pointHoverRadius: 6
            }]
        },
        options: {
            scales: {
                y: {
                    min: 1,
                    max: maxPosition,
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Points'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Season'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}
