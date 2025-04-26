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
});

function displayTeamInfo(team) {
    document.getElementById("team-name").innerText = team.name;
    document.getElementById("team-country-img").src = "assets/flags/" + team.country + ".png";
    document.getElementById("team-logo").src = team.picture;

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

    /**
    document.getElementById("teamDetail").innerHTML = `
        <img src="${team.picture}" class="w-40 h-40 object-contain aspect-[3/2] rounded-lg mr-6" alt="Picture of ${team.name}">
        <div>
            <h1 class="text-3xl font-bold">${team.name.replaceAll("_", " ")}</h1>
            ${team.nickname ? `<p class="text-lg text-gray-300">${team.nickname}</p>` : ""}
            ${team.creationDate ? `<p>Date of creation: ${team.creationDate} (Age: ${team.age})</p>` : ""}
            ${team.endDate ? `<p>Date of end: ${team.endDate}</p>` : ""}
            <div id="country_flag" class="flex items-center mt-2">
                
            </div>

            <div id="other_teams">
            </div>
        </div>
    `;
    **/

    const otherTeamsContainer = document.getElementById("other_teams");
    if (team.previous && team.previous.length > 0) {
        otherTeamsContainer.innerHTML += `
            <div>
            <h3 class="text-lg font-semibold mt-4">Previous Teams</h3>
            <ul class="list-disc list-inside">
                ${team.previous.flat().map(previousTeam => `
                <li>
                    <a ${previousTeam == "?" ? 'href=#' : `href="team.html?id=${previousTeam}"`} class="text-blue-600 underline">
                        ${previousTeam.replace("_", " ")}
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
                <h3 class="text-lg font-semibold mt-4">Next Teams</h3>
                <ul class="list-disc list-inside">
                    ${team.next.flat().map(nextTeam => `
                        <li>
                            <a ${nextTeam == "?" ? 'href=#' : `href="team.html?id=${nextTeam}"`} class="text-blue-600 underline">
                                ${nextTeam.replace("_", " ")}
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
            <div class="bg-white rounded-xl p-6 my-8 shadow-md border border-gray-200">
                <h2 class="text-2xl font-bold text-blue-600 mb-4">
                    <a href="race.html?id=${championship}&year=${season}" class="hover:underline">${season} - ${championship.replace("_", " ")}</a>
                </h2>
                ${standingHTML}
                <div class="overflow-x-auto mt-6">
                    <table class="min-w-full table-auto text-sm text-gray-800">
                        <thead class="bg-blue-100 text-blue-700">
                            <tr>
                                <th class="p-3 text-left">Event</th>
                                <th class="p-3 text-left">Session</th>
                                <th class="p-3 text-left">Car #</th>
                                <th class="p-3 text-left">Position</th>
                                <th class="p-3 text-left">Fastest Lap</th>
                                <th class="p-3 text-left">Drivers</th>
                                <th class="p-3 text-left">Other Info</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-400">
            `;

            Object.entries(data).filter(([key]) => key !== "standing").forEach(([event, sessions]) => {
                const eventRowSpan = Object.values(sessions).reduce((sum, cars) => sum + Object.keys(cars).length, 0);
                let eventHTML = `<tr><td class="p-3 font-semibold" rowspan="${eventRowSpan}">${event}</td>`;

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
                            ${isFirstSession && index === 0 ? "" : "<tr>"}
                            ${index === 0 ? `<td class="p-3 font-semibold" rowspan="${Object.keys(cars).length}">${session}</td>` : ""}
                            <td class="p-3">${car}</td>
                            <td class="p-3">${position !== "N/A" ? `P${position}` : position}</td>
                            <td class="p-3">${fastestLap}</td>
                            <td class="p-3">
                                ${details.drivers ? details.drivers.map(driver => `<a class="text-blue-600 hover:underline" href="driver.html?id=${driver}">${driver.replace("_", " ")}</a>`).join(", ") : "N/A"}
                            </td>
                            <td class="p-3">
                                <button onclick="toggleDetails('${rowId}')" class="text-blue-600 hover:underline">Show</button>
                                <div id="${rowId}" class="hidden mt-2 text-sm text-gray-600">${otherInfoHTML || "No additional info"}</div>
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