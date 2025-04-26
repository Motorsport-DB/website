document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const driverId = urlParams.get("id");

    let driver = await fetchData("getDrivers.php", driverId);
    driver = driver[0];
    if (!driver) {
        document.getElementById("resultsContainer").innerHTML = "<p id='text_error' class='text-red-500'>Driver not found.</p>";
        return;
    }
    driver.age = getAge(driver.dateOfBirth, driver.dateOfDeath);
    displayMainDriverInfo(driver);
    displayDriverStats(driver);
    displayDriverResults(driver);
    displayDriverPerformanceChart(driver);
});

function displayMainDriverInfo(driver) {
    // BASIC INFORMATION
    document.getElementById("driver-name").innerText = driver.firstName + " " + driver.lastName;
    // document.getElementById("driver-country").innerText = driver.country;
    document.getElementById("driver-country-img").src = "assets/flags/"+ driver.country + ".png";
    document.getElementById("driver-picture").src = driver.picture;
    document.getElementById("driver-dob").innerText = driver.dateOfBirth + ` (${driver.age} years old)`; 
    
    
    /**
    document.getElementById("driverDetail").innerHTML = `
        <div class="flex flex-col md:flex-row items-center md:items-start gap-6 bg-gray-800 rounded-2xl p-6 shadow-lg">
            <img src="${driver.picture}" class="w-40 h-40 object-cover rounded-xl" alt="Picture of ${driver.firstName} ${driver.lastName}">
            <div class="flex-1">
                <h1 class="text-4xl font-bold mb-2">${driver.firstName} ${driver.lastName}</h1>
                ${driver.nickname ? `<p class="text-blue-400 mb-2">"${driver.nickname}"</p>` : ""}
                ${driver.dateOfBirth ? `<p class="text-gray-300">Born: ${driver.dateOfBirth} (${driver.age} years old)</p>` : ""}
                ${driver.dateOfDeath ? `<p class="text-gray-300">Died: ${driver.dateOfDeath}</p>` : ""}
                <div id="country_flag" class="flex items-center mt-4"></div>
            </div>
        </div>
    `;
    **/
}

function displayDriverResults(driver) {
    const resultsContainer = document.getElementById("resultsContainer");

    const seasons = Object.keys(driver.seasons).sort((a, b) => b - a);
    for (const season of seasons) {
        for (const championship in driver.seasons[season]) {
            if (championship === "standing") continue;

            const standing = driver.seasons[season][championship].standing;
            const standingHTML = standing ? `<p class="text-sm text-blue-500 mt-2">Standing: P${standing.position} • ${standing.points} points</p>` : "";

            let seasonHTML = `
            <div class="bg-white rounded-xl p-6 my-8 shadow-md border border-gray-200">
                <h2 class="text-2xl font-bold text-blue-600 mb-4">
                    <a href="race.html?id=${championship}&year=${season}" class="hover:underline">${season} - ${championship.replace("_", " ")}</a>
                </h2>
                ${standingHTML}
                <div class="overflow-x-auto mt-6">
                    <table class="min-w-full table-auto text-sm text-gray-800">
                        <thead class="bg-blue-100 text-blue-700">
                            <tr>
                                <th class="p-3 text-left">Race</th>
                                <th class="p-3 text-left">Session</th>
                                <th class="p-3 text-left">Position</th>
                                <th class="p-3 text-left">Fastest Lap</th>
                                <th class="p-3 text-left">Team</th>
                                <th class="p-3 text-left">Other Info</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-400">
            `;

            const races = {};

            for (const race in driver.seasons[season][championship]) {
                if (race === "standing") continue;

                for (const session in driver.seasons[season][championship][race]) {
                    if (!races[race]) races[race] = [];
                    races[race].push({ session, ...driver.seasons[season][championship][race][session] });
                }
            }

            for (const race in races) {
                let firstRow = true;
                const rowspan = races[race].length;
                races[race].forEach((data, index) => {
                    const rowId = `details-${season}-${championship}-${race}-${index}`;

                    seasonHTML += `<tr class="hover:bg-gray-200 cursor-pointer transition">`;
                    if (firstRow) {
                        seasonHTML += `<td class="p-3 font-semibold" rowspan="${rowspan}">${race}</td>`;
                        firstRow = false;
                    }
                    seasonHTML += `
                        <td class="p-3">${data.session}</td>
                        <td class="p-3">${data.position ? `P${data.position}` : "N/A"}</td>
                        <td class="p-3">${data.fastest_lap ?? "N/A"}</td>
                        <td class="p-3">
                            <a href="team.html?id=${data.team}" class="text-blue-600 hover:underline">${data.team?.replaceAll("_", " ") ?? "N/A"}</a>
                        </td>
                        <td class="p-3">
                            <button onclick="toggleDetails('${rowId}')" class="text-blue-600 hover:underline">Show</button>
                            <div id="${rowId}" class="hidden mt-2 text-sm text-gray-600">${formatOtherInfo(data.other_info)}</div>
                        </td>
                    </tr>`;
                });
            }

            seasonHTML += `
                        </tbody>
                    </table>
                </div>
            </div>`;

            resultsContainer.innerHTML += seasonHTML;
        }
    }
}

function formatOtherInfo(info) {
    if (!info || Object.keys(info).length === 0) {
        return "<p>No additional info</p>";
    }
    return Object.entries(info)
        .map(([key, value]) => `<p><strong>${key.replace(/_/g, " ")}:</strong> ${value}</p>`)
        .join("");
}

function toggleDetails(id) {
    const element = document.getElementById(id);
    element.classList.toggle("hidden");
}

function displayDriverPerformanceChart(driver) {
    const averageByYear = {};

    for (const season in driver.seasons) {
        let total = 0, count = 0;
        for (const championship in driver.seasons[season]) {
            if (championship === "standing") continue;

            const races = driver.seasons[season][championship];
            for (const race in races) {
                if (race === "standing") continue;
                for (const session in races[race]) {
                    const pos = parseInt(races[race][session].position);
                    if (!isNaN(pos)) {
                        total += pos;
                        count++;
                    }
                }
            }
        }
        if (count > 0) averageByYear[season] = total / count;
    }

    const sortedYears = Object.keys(averageByYear).sort();
    const averagePositions = sortedYears.map(year => averageByYear[year].toFixed(0));

    const ctx = document.getElementById('performanceChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedYears,
            datasets: [{
                label: 'Average Position',
                data: averagePositions,
                borderColor: "rgb(59, 130, 246)",
                backgroundColor: "rgb(147, 197, 253)",
                tension: 0.3,
                pointRadius: 5,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    min: 1,
                    reverse: true,
                    title: { display: true, text: 'Average Position' },
                    ticks: { stepSize: 1 }
                },
                x: {
                    title: { display: true, text: 'Season' }
                }
            },
            plugins: {
                legend: {
                    position: "bottom",
                }
            }
        }
    });
}

function displayDriverStats(driver) {
    let totalRaces = 0;
    let totalWins = 0;
    let totalPodiums = 0;
    let totalChampionships = 0;

    for (const season in driver.seasons) {
        for (const championship in driver.seasons[season]) {
            if (championship === "standing") continue;

            totalChampionships++;
            const races = driver.seasons[season][championship];

            for (const race in races) {
                if (race === "standing") continue;

                let hasPodium = false;

                for (const session in races[race]) {
                    if (session.toLowerCase().includes("race")) {
                        totalRaces++;
                        const position = parseInt(races[race][session].position);

                        if (position === 1) totalWins++;
                        if (position <= 3) hasPodium = true;
                    }
                }

                if (hasPodium) totalPodiums++;
            }
        }
    }

    document.getElementById("totalRaces").innerText = totalRaces;
    document.getElementById("totalWins").innerText = totalWins;
    document.getElementById("totalPodiums").innerText = totalPodiums;
    document.getElementById("totalChampionships").innerText = totalChampionships;
}