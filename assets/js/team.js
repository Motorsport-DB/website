let proposalModification = false;

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
    let team_proposal = await fetchTeamProposal(team);
    if (team_proposal != null) displayProposalInfo(team, team_proposal);

    document.getElementById("edit-team-btn").addEventListener("click", () => {
        proposalModification = !proposalModification;
        displayModifProposal(team);
    });
    document.getElementById("save-team-btn").addEventListener("click", async () => {
        saveModifProposal(team);
    });

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

async function displayProposalInfo(team, team_proposal) {
    if (team_proposal.picture && !team.picture ) {
        const pictureElem = document.getElementById("team-picture");
        pictureElem.classList.remove("border-blue-600", "dark:border-blue-400");
        pictureElem.classList.add("border-yellow-500", "border-4");
        pictureElem.src = team_proposal.picture;
        team.picture = team_proposal.picture;

        pictureElem.style.cursor = "pointer";
        pictureElem.addEventListener("click", () => {
            alert("This picture is a user proposal and has not been verified.");
        });
    }

    if (team_proposal.country && !team.country) {
        const countryElem = document.getElementById("team-country-img");
        countryElem.src = "assets/flags/" + team_proposal.country.toLowerCase() + ".png";
        countryElem.classList.remove("border-blue-600", "dark:border-blue-400");
        countryElem.classList.add("border-yellow-500", "border-4", "rounded-full");
        team.country = team_proposal.country;
        
        countryElem.style.cursor = "pointer";
        countryElem.addEventListener("click", () => {
            alert("This country is a user proposal and has not been verified.");
        });
    }

    document.getElementById("warning-information").classList.remove("hidden");
}

async function fetchTeamProposal(team){
  try {
    const response = await fetch(`assets/php/proposal/getTeam.php?id=${encodeURIComponent(team.name)}`);
    if (!response.ok) {
      console.error(`Request failed with status ${response.status}`);
      return null;
    }

    const result = await response.json();

    if (!result.success) {
      console.warn("Server responded with success: false.");
      return null;
    }

    const hasData = result.data && Object.keys(result.data).length > 0;
    const hasPicture = result.picture && typeof result.picture === "string";

    if (!hasData && !hasPicture) {
        return null;
    }
    return result.data;
  } catch (error) {
    console.error("Error fetching proposal data:", error);
    return null;
  }
}


async function saveModifProposal(team) {
    let formData = new FormData();
    let team_picture = document.getElementById("team-picture");
    if(document.getElementById("team-country-img").value != "" && document.getElementById("team-country-img").value != undefined) formData.append("country", document.getElementById("team-country-img").value);
    if (team_picture && team_picture.type === "file" && team_picture.files.length > 0) formData.append("picture", team_picture.files[0]);

    if ([...formData.entries()].length >= 1) {
        formData.append("id", team.name);

        let data = await setData("assets/php/proposal/setTeam.php", formData);
        console.log(data);
        alert(data.success ? "Proposal saved!" : "Error");
        window.location.reload();
    } else {
        console.log(formData);
        console.log("No changes made to the team profile.");
    }
}

function displayModifProposal(team) {
    if (proposalModification) {
        document.getElementById("save-team-btn").classList.remove("hidden");
        document.getElementById("edit-team-btn").innerText = "Cancel";
        if (!team.country) {
            document.getElementById("team-country-img").outerHTML = `
                <input type="text" id="team-country-img" placeholder="Country" class="border p-1 rounded" />
            `;
        }
        if (!team.picture) {
            document.getElementById("team-picture").outerHTML = `
                <input type="file" id="team-picture" accept="image/*" class="border p-1 rounded" />
            `;
        }
    } else {
        document.getElementById("save-team-btn").classList.add("hidden");
        document.getElementById("edit-team-btn").innerText = "Edit";
        document.getElementById("team-country-img").outerHTML = `
            <img id="team-country-img" src="assets/flags/default.png" alt="Team Country"
                class="inline-block h-6 w-6 m-2 object-contain">
        `;
        document.getElementById("team-picture").outerHTML = `
            <img id="team-picture" src="teams/picture/default.png" alt="Team Picture"
                class="w-48 h-48 object-contain rounded-full border-4 border-blue-600 dark:border-blue-400">
        `;
        window.location.reload();
    }
}

function displayTeamInfo(team) {
    document.getElementById("team-name").innerText = team.name.replaceAll("_", " ");
    if (team.country) document.getElementById("team-country-img").src = "assets/flags/" + team.country.toLowerCase() + ".png";
    if (team.picture) document.getElementById("team-picture").src = team.picture;

    // Calculate creationDate and endDate from seasons
    const seasons = Object.keys(team.seasons).map(Number).filter(y => !isNaN(y));
    let creationDate = "";
    let endDate = "";
    if (seasons.length > 0) {
        creationDate = Math.min(...seasons).toString();
        endDate = Math.max(...seasons).toString();
        document.getElementById("team-founded").innerText = `${creationDate} (${getAge(creationDate, endDate)} years)`;
    } else {
        document.getElementById("team-founded").innerText = "Unknown";
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
