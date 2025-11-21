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
    displayResultsDistributionChart(team);
    displayWinRateChart(team);
    displayPodiumRateChart(team);
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
    
    // Add global toggle button
    const toggleAllBtn = document.createElement('div');
    toggleAllBtn.className = 'text-center mb-6';
    toggleAllBtn.innerHTML = `
        <button id="toggle-all-results" class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-all duration-200">
            📂 Collapse All Results
        </button>
    `;
    resultsContainer.appendChild(toggleAllBtn);

    resultsContainer.innerHTML += seasonsInFileOrder.map(season => {
        return Object.entries(team.seasons[season]).map(([championship, data]) => {
            const standing = data.standing;
            const standingHTML = standing ? `<p class="text-sm text-blue-500 mt-2">Standing: P${standing.position} • ${standing.points} points</p>` : "";
            
            const sectionId = `section-${season}-${championship.replace(/[^a-zA-Z0-9]/g, '_')}`;
            const hasRaceResults = Object.keys(data).some(event => {
                if (event === "standing") return false;
                return Object.keys(data[event]).some(session => 
                    session.toLowerCase().includes("race")
                );
            });

            let seasonHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-xl p-6 my-8 shadow-md border border-gray-200 dark:border-gray-700 z-0">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-2xl font-bold text-blue-600 dark:text-blue-400 z-0">
                        <span class="relative group">
                            <a href="race.html?id=${championship}&year=${season}" class="hover:underline">${season} - ${championship.replaceAll("_", " ")}</a>
                        </span>
                    </h2>
                    <button onclick="toggleSection('${sectionId}')" class="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-all duration-200 flex items-center gap-2">
                        <svg class="w-5 h-5 toggle-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                        </svg>
                        <span class="toggle-text">${hasRaceResults ? 'Collapse' : 'Expand'}</span>
                    </button>
                </div>
                ${standingHTML}
                <div id="${sectionId}" class="mt-6 relative z-0 overflow-x-auto sm:overflow-visible ${hasRaceResults ? '' : 'hidden'}">
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
        document.querySelectorAll('[onclick^="toggleSection"]').forEach(btn => {
            const text = btn.querySelector('.toggle-text');
            const icon = btn.querySelector('.toggle-icon path');
            if (allHidden) {
                text.textContent = 'Collapse';
                icon.setAttribute('d', 'M19 9l-7 7-7-7');
            } else {
                text.textContent = 'Expand';
                icon.setAttribute('d', 'M9 5l7 7-7 7');
            }
        });
        
        this.textContent = allHidden ? '📁 Collapse All Results' : '📂 Expand All Results';
    });
}

function displayTeamPerformanceChart(team) {
    const raceAverageBySeason = {};
    const qualifyingAverageBySeason = {};

    for (const season in team.seasons) {
        let raceTotal = 0, raceCount = 0;
        let qualTotal = 0, qualCount = 0;
        
        for (const championship in team.seasons[season]) {
            if (championship === "standing") continue;
            const events = team.seasons[season][championship];
            for (const event in events) {
                if (event === "standing") continue;
                for (const session in events[event]) {
                    for (const results in events[event][session]) {
                        const position = parseInt(events[event][session][results].position);
                        if (!isNaN(position)) {
                            if (session.toLowerCase().includes("race")) {
                                raceTotal += position;
                                raceCount++;
                            } else if (session.toLowerCase().includes("qualifying") || session.toLowerCase().includes("practice")) {
                                qualTotal += position;
                                qualCount++;
                            }
                        }
                    }
                }
            }
        }
        if (raceCount > 0) raceAverageBySeason[season] = raceTotal / raceCount;
        if (qualCount > 0) qualifyingAverageBySeason[season] = qualTotal / qualCount;
    }

    const sortedSeasons = Object.keys(raceAverageBySeason).sort();
    const raceAveragePositions = sortedSeasons.map(season => raceAverageBySeason[season] ? raceAverageBySeason[season].toFixed(2) : null);
    const qualifyingAveragePositions = sortedSeasons.map(season => qualifyingAverageBySeason[season] ? qualifyingAverageBySeason[season].toFixed(2) : null);
    
    if (sortedSeasons.length === 0) {
        console.warn('No data available for performance chart');
        return;
    }

    const canvas = document.getElementById('performanceChart');
    if (!canvas) {
        console.error('Canvas element "performanceChart" not found');
        return;
    }
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedSeasons,
            datasets: [
                {
                    label: 'Average Race Position',
                    data: raceAveragePositions,
                    borderColor: "rgb(59, 130, 246)",
                    backgroundColor: "rgb(59, 130, 246)",
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: false,
                    spanGaps: true
                },
                {
                    label: 'Average Qualifying Position',
                    data: qualifyingAveragePositions,
                    borderColor: "rgb(245, 158, 11)",
                    backgroundColor: "rgb(245, 158, 11)",
                    borderWidth: 2,
                    tension: 0.4,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: false,
                    spanGaps: true
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
                    beginAtZero: false,
                    min: 1,
                    reverse: true,
                    title: { 
                        display: true, 
                        text: 'Average Position'
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
                        text: 'Season' 
                    },
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    position: "bottom",
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

function displayResultsDistributionChart(team) {
    const racePositionCounts = {};
    const qualifyingPositionCounts = {};
    
    for (const season in team.seasons) {
        for (const championship in team.seasons[season]) {
            if (championship === "standing") continue;
            const events = team.seasons[season][championship];
            
            for (const event in events) {
                if (event === "standing") continue;
                for (const session in events[event]) {
                    for (const results in events[event][session]) {
                        const position = parseInt(events[event][session][results].position);
                        if (!isNaN(position)) {
                            if (session.toLowerCase().includes("race")) {
                                racePositionCounts[position] = (racePositionCounts[position] || 0) + 1;
                            } else if (session.toLowerCase().includes("qualifying") || session.toLowerCase().includes("practice")) {
                                qualifyingPositionCounts[position] = (qualifyingPositionCounts[position] || 0) + 1;
                            }
                        }
                    }
                }
            }
        }
    }
    
    if (Object.keys(racePositionCounts).length === 0 && Object.keys(qualifyingPositionCounts).length === 0) {
        console.warn('No results data available');
        return;
    }
    
    // Get all unique positions from both race and qualifying
    const allPositions = new Set([...Object.keys(racePositionCounts), ...Object.keys(qualifyingPositionCounts)]);
    const sortedPositions = Array.from(allPositions).sort((a, b) => parseInt(a) - parseInt(b));
    
    const raceCounts = sortedPositions.map(pos => racePositionCounts[pos] || 0);
    const qualifyingCounts = sortedPositions.map(pos => qualifyingPositionCounts[pos] || 0);
    
    // Mobile: Combined chart
    const canvasMobile = document.getElementById('resultsDistributionChartMobile');
    if (canvasMobile) {
        const ctxMobile = canvasMobile.getContext('2d');
        new Chart(ctxMobile, {
            type: 'bar',
            data: {
                labels: sortedPositions.map(p => `P${p}`),
                datasets: [
                    {
                        label: 'Race Finishes',
                        data: raceCounts,
                        backgroundColor: 'rgba(59, 130, 246, 0.6)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Qualifying Positions',
                        data: qualifyingCounts,
                        backgroundColor: 'rgba(245, 158, 11, 0.6)',
                        borderColor: 'rgba(245, 158, 11, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Number of Occurrences' },
                        ticks: { stepSize: 1 },
                        grid: { color: 'rgba(156, 163, 175, 0.2)' }
                    },
                    x: {
                        title: { display: true, text: 'Position' },
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { 
                        display: true,
                        position: 'bottom'
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
    
    // Desktop: Separate charts
    const sortedRacePositions = Object.keys(racePositionCounts).sort((a, b) => parseInt(a) - parseInt(b));
    const sortedQualPositions = Object.keys(qualifyingPositionCounts).sort((a, b) => parseInt(a) - parseInt(b));
    
    // Race distribution chart
    const canvasRace = document.getElementById('raceDistributionChart');
    if (canvasRace) {
        const ctxRace = canvasRace.getContext('2d');
        new Chart(ctxRace, {
            type: 'bar',
            data: {
                labels: sortedRacePositions.map(p => `P${p}`),
                datasets: [{
                    label: 'Number of finishes',
                    data: sortedRacePositions.map(pos => racePositionCounts[pos]),
                    backgroundColor: 'rgba(59, 130, 246, 0.6)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Number of Finishes' },
                        ticks: { stepSize: 1 },
                        grid: { color: 'rgba(156, 163, 175, 0.2)' }
                    },
                    x: {
                        title: { display: true, text: 'Position' },
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false },
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
    
    // Qualifying distribution chart
    const canvasQual = document.getElementById('qualifyingDistributionChart');
    if (canvasQual) {
        const ctxQual = canvasQual.getContext('2d');
        new Chart(ctxQual, {
            type: 'bar',
            data: {
                labels: sortedQualPositions.map(p => `P${p}`),
                datasets: [{
                    label: 'Number of positions',
                    data: sortedQualPositions.map(pos => qualifyingPositionCounts[pos]),
                    backgroundColor: 'rgba(245, 158, 11, 0.6)',
                    borderColor: 'rgba(245, 158, 11, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: { display: true, text: 'Number of Positions' },
                        ticks: { stepSize: 1 },
                        grid: { color: 'rgba(156, 163, 175, 0.2)' }
                    },
                    x: {
                        title: { display: true, text: 'Position' },
                        grid: { display: false }
                    }
                },
                plugins: {
                    legend: { display: false },
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
}

function displayPodiumRateChart(team) {
    const seasonPodiums = {};
    const seasonRaces = {};
    
    for (const season in team.seasons) {
        seasonPodiums[season] = 0;
        seasonRaces[season] = 0;
        
        for (const championship in team.seasons[season]) {
            if (championship === "standing") continue;
            const events = team.seasons[season][championship];
            
            for (const event in events) {
                if (event === "standing") continue;
                for (const session in events[event]) {
                    if (session.toLowerCase().includes("race")) {
                        for (const results in events[event][session]) {
                            seasonRaces[season]++;
                            const position = parseInt(events[event][session][results].position);
                            if (position <= 3) {
                                seasonPodiums[season]++;
                            }
                        }
                    }
                }
            }
        }
    }
    
    const canvas = document.getElementById('podiumRateChart');
    if (!canvas) {
        console.error('Canvas element "podiumRateChart" not found');
        return;
    }
    
    const sortedSeasons = Object.keys(seasonPodiums).sort();
    const podiumRates = sortedSeasons.map(s => {
        return seasonRaces[s] > 0 ? ((seasonPodiums[s] / seasonRaces[s]) * 100).toFixed(1) : 0;
    });
    
    if (sortedSeasons.length === 0) {
        console.warn('No podium rate data available');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedSeasons,
            datasets: [{
                label: 'Podium Rate (%)',
                data: podiumRates,
                backgroundColor: 'rgba(16, 185, 129, 0.6)',
                borderColor: 'rgba(16, 185, 129, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: { display: true, text: 'Podium Rate (%)' },
                    ticks: { stepSize: 10 },
                    grid: { color: 'rgba(156, 163, 175, 0.2)' }
                },
                x: {
                    title: { display: true, text: 'Season' },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: "#111827",
                    titleColor: "#ffffff",
                    bodyColor: "#d1d5db",
                    borderColor: "#3B82F6",
                    borderWidth: 1,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const season = context.label;
                            const podiums = seasonPodiums[season];
                            const races = seasonRaces[season];
                            return `Podium Rate: ${context.parsed.y}% (${podiums}/${races})`;
                        }
                    }
                }
            }
        }
    });
}

function toggleDetails(id) {
    const element = document.getElementById(id);
    element?.classList.toggle("hidden");
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
function displayWinRateChart(team) {
    const seasonWins = {};
    const seasonRaces = {};
    
    for (const season in team.seasons) {
        seasonWins[season] = 0;
        seasonRaces[season] = 0;
        
        for (const championship in team.seasons[season]) {
            if (championship === "standing") continue;
            const events = team.seasons[season][championship];
            
            for (const event in events) {
                if (event === "standing") continue;
                for (const session in events[event]) {
                    if (session.toLowerCase().includes("race")) {
                        for (const results in events[event][session]) {
                            seasonRaces[season]++;
                            const position = parseInt(events[event][session][results].position);
                            if (position === 1) {
                                seasonWins[season]++;
                            }
                        }
                    }
                }
            }
        }
    }
    
    const canvas = document.getElementById('winRateChart');
    if (!canvas) {
        console.error('Canvas element "winRateChart" not found');
        return;
    }
    
    const sortedSeasons = Object.keys(seasonWins).sort();
    const winRates = sortedSeasons.map(s => {
        return seasonRaces[s] > 0 ? ((seasonWins[s] / seasonRaces[s]) * 100).toFixed(1) : 0;
    });
    
    if (sortedSeasons.length === 0) {
        console.warn('No win rate data available');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedSeasons,
            datasets: [{
                label: 'Win Rate (%)',
                data: winRates,
                backgroundColor: 'rgba(239, 68, 68, 0.6)',
                borderColor: 'rgba(239, 68, 68, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: { display: true, text: 'Win Rate (%)' },
                    ticks: { stepSize: 10 },
                    grid: { color: 'rgba(156, 163, 175, 0.2)' }
                },
                x: {
                    title: { display: true, text: 'Season' },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: "#111827",
                    titleColor: "#ffffff",
                    bodyColor: "#d1d5db",
                    borderColor: "#3B82F6",
                    borderWidth: 1,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const season = context.label;
                            const wins = seasonWins[season];
                            const races = seasonRaces[season];
                            return `Win Rate: ${context.parsed.y}% (${wins}/${races})`;
                        }
                    }
                }
            }
        }
    });
}
