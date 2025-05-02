document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const teamId = urlParams.get("id");

    let team = (await fetchData("getTeams.php", teamId))[0];
    if (!team) {
        document.getElementById("resultsContainer").innerHTML = "<p id='text_error' class='text-red-500'>Team not found.</p>";
        return;
    }

    const container = document.getElementById("resultsContainer");
    container.style.opacity = 0;
    requestAnimationFrame(() => {
        container.style.transition = "opacity 0.5s ease";
        container.style.opacity = 1;
    });

    displayTeamInfo(team);
    displayTeamStats(team);
    displayTeamResults(team);
    displayTeamPerformanceChart(team);
    // Differed loading of links to avoid blocking the main thread
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

function displayTeamInfo(team) {
    document.getElementById("team-name").innerText = team.name.replaceAll("_", " ");
    if (team.country) document.getElementById("team-country-img").src = "assets/flags/" + team.country.toLowerCase() + ".png";
    if (team.picture) document.getElementById("team-logo").src = team.picture;

    document.getElementById("team-founded").innerText = "";
    for (let i = 0; i < team.creationDate.length; i++) {
        let age = 0;
        try {
            age = getAge(team.creationDate[i], team.endDate[i]);
        } catch (error) {
            age = getAge(team.creationDate[i]);
        }
        document.getElementById("team-founded").innerText += team.creationDate[i] + " (" + age + " years) \n";
    }

    const otherTeamsContainer = document.getElementById("other_teams");
    if (team.previous && team.previous.length > 0) {
        otherTeamsContainer.innerHTML += `
            <div>
            <h3 class="text-lg font-semibold mt-4 text-gray-800 dark:text-gray-200">Previous Teams</h3>
            <ul class="list-disc list-inside text-gray-800 dark:text-gray-300">
                ${team.previous.flat().map(previousTeam => `
                <li class="relative group">
                    <a ${previousTeam == "?" ? 'href=#' : `href="team.html?id=${previousTeam}"`} class="text-blue-600 dark:text-blue-400 hover:underline">
                        ${previousTeam.replaceAll("_", " ")}
                    </a>
                </li>
                `).join("")}
            </ul>
            </div>
        `;
    }

    if (team.next && team.next.length > 0) {
        otherTeamsContainer.innerHTML += `
            <div>
                <h3 class="text-lg font-semibold mt-4 text-gray-800 dark:text-gray-200">Next Teams</h3>
                <ul class="list-disc list-inside text-gray-800 dark:text-gray-300">
                    ${team.next.flat().map(nextTeam => `
                        <li class="relative group">
                            <a ${nextTeam == "?" ? 'href=#' : `href="team.html?id=${nextTeam}"`} class="text-blue-600 dark:text-blue-400 hover:underline">
                                ${nextTeam.replaceAll("_", " ")}
                            </a>
                        </li>
                    `).join("")}
                </ul>
            </div>
        `;
    }
}

function displayTeamResults(team) {
    const resultsContainer = document.getElementById("resultsContainer");
    const seasonsInFileOrder = Object.keys(team.seasons).sort((a, b) => b - a);

    resultsContainer.innerHTML = seasonsInFileOrder.map(season => {
        return Object.entries(team.seasons[season]).map(([championship, data]) => {
            const standing = data.standing;
            const standingHTML = standing ? `<p class="text-sm text-blue-500 mt-2">Standing: P${standing.position} • ${standing.points} points</p>` : "";

            let seasonHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-xl p-6 my-8 shadow-md border border-gray-200 dark:border-gray-700 z-0">
                <h2 class="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-4 z-0">
                    <span class="relative group">
                        <a href="race.html?id=${championship}&year=${season}" class="hover:underline">${season} - ${championship.replaceAll("_", " ")}</a>
                    </span>
                </h2>
                ${standingHTML}
                <div class="mt-6 relative z-0 overflow-x-auto sm:overflow-visible">
                    <table class="min-w-full table-auto text-sm text-gray-800 dark:text-gray-300 relative z-10">
                        <thead class="bg-blue-100 dark:bg-gray-700 text-blue-700 dark:text-blue-300">
                            <tr>
                                <th class="p-3 text-left border-b border-gray-300 dark:border-gray-600">Event</th>
                                <th class="p-3 text-left border-b border-gray-300 dark:border-gray-600">Session</th>
                                <th class="p-3 text-left border-b border-gray-300 dark:border-gray-600">Car #</th>
                                <th class="p-3 text-left border-b border-gray-300 dark:border-gray-600">Position</th>
                                <th class="p-3 text-left border-b border-gray-300 dark:border-gray-600">Fastest Lap</th>
                                <th class="p-3 text-left border-b border-gray-300 dark:border-gray-600">Drivers</th>
                                <th class="p-3 text-left border-b border-gray-300 dark:border-gray-600">Other Info</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-400 dark:divide-gray-600">
            `;

            Object.entries(data).filter(([key]) => key !== "standing").forEach(([event, sessions]) => {
                const eventRowSpan = Object.values(sessions).reduce((sum, cars) => sum + Object.keys(cars).length, 0);
                let eventHTML = `<tr class="hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer transition"><td class="p-3 font-semibold" rowspan="${eventRowSpan}">${event}</td>`;

                let isFirstSession = true;
                Object.entries(sessions).forEach(([session, cars]) => {
                    Object.entries(cars).forEach(([car, details], index) => {
                        const position = details.position ?? "N/A";
                        const fastestLap = details.fastest_lap ?? "N/A";
                        const otherInfoHTML = Object.entries(details.other_info || {})
                            .map(([key, value]) => `<span class="mr-2"><strong>${key.replace(/_/g, " ")}:</strong> ${value}</span>`)
                            .join("");

                        const rowId = `details-${season}-${championship}-${event}-${session}-${index}`;

                        eventHTML += `
                            ${isFirstSession && index === 0 ? "" : `<tr class="hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer transition">`}
                            ${index === 0 ? `<td class="p-3 font-semibold" rowspan="${Object.keys(cars).length}">${session}</td>` : ""}
                            <td class="p-3">${car}</td>
                            <td class="p-3">${position !== "N/A" ? `P${position}` : position}</td>
                            <td class="p-3">${fastestLap}</td>
                            <td class="p-3">
                                <ul>
                                    ${details.drivers ? details.drivers.map(driver => `<li class="relative group"><a class="text-blue-600 dark:text-blue-400 hover:underline" href="driver.html?id=${driver}">${driver.replaceAll("_", " ")}</a></li>`).join("") : "N/A"}
                                </ul>
                            </td>
                            <td class="p-3">
                                <button onclick="toggleDetails('${rowId}')" class="text-blue-600 dark:text-blue-400 hover:underline">Show</button>
                                <div id="${rowId}" class="hidden mt-2 text-sm text-gray-600 dark:text-gray-400">${otherInfoHTML || "No additional info"}</div>
                            </td>
                            </tr>
                        `;
                    });
                    isFirstSession = false;
                });

                seasonHTML += eventHTML;
            });

            seasonHTML += `
                        </tbody>
                    </table>
                </div>
            </div>`;

            return seasonHTML;
        }).join("");
    }).join("");
}

function displayTeamPerformanceChart(team) {
    const averageBySeason = {};

    for (const season in team.seasons) {
        let total = 0, count = 0;
        for (const championship in team.seasons[season]) {
            if (championship === "standing") continue;
            const events = team.seasons[season][championship];
            for (const event in events) {
                if (event === "standing") continue;
                for (const session in events[event]) {
                    for (const results in events[event][session]) {
                        const position = parseInt(events[event][session][results].position);
                        if (!isNaN(position)) {
                            total += position;
                            count++;
                        }
                    }
                }
            }
        }
        if (count > 0) averageBySeason[season] = total / count;
    }

    const sortedSeasons = Object.keys(averageBySeason).sort();
    const averagePositions = sortedSeasons.map(season => averageBySeason[season].toFixed(0));
    const maxPosition = Math.max(...Object.values(averageBySeason).map(pos => Math.ceil(pos)));

    const ctx = document.getElementById('performanceChart').getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedSeasons,
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
                    max: maxPosition,
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

function displayTeamStats(team) {
    let totalRaces = 0;
    let totalWins = 0;
    let totalPodiums = 0;
    let totalChampionships = 0;

    for (const season in team.seasons) {
        for (const championship in team.seasons[season]) {
            if (championship === "standing") continue;

            totalChampionships++;
            const races = team.seasons[season][championship];

            for (const race in races) {
                if (race === "standing") continue;

                for (const session in races[race]) {
                    if (session.toLowerCase().includes("race")) {
                        totalRaces++;
                        for (const driver in races[race][session]) {
                            const position = parseInt(races[race][session][driver].position);
                            if (position === 1) totalWins++;
                            else if (position <= 3) totalPodiums++;
                        }
                    }
                }
            }
        }
    }

    document.getElementById("totalRaces").innerText = totalRaces;
    document.getElementById("totalWins").innerText = totalWins;
    document.getElementById("totalPodiums").innerText = totalPodiums;
    document.getElementById("totalChampionships").innerText = totalChampionships;
}
