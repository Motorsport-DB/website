let proposalModification = false;

document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const driverId = urlParams.get("id");

    let driver = await fetchData("getDrivers.php", driverId);
    driver = driver[0];
    if (!driver) {
        document.getElementById("resultsContainer").innerHTML = "<p id='text_error' class='text-red-500 dark:text-red-400'>Driver not found.</p>";
        return;
    }
    driver.age = getAge(driver.dateOfBirth, driver.dateOfDeath);
    displayMainDriverInfo(driver);
    displayDriverStats(driver);
    displayDriverResults(driver);
    displayDriverPerformanceChart(driver);
    displayFinishRateChart(driver);
    displayResultsDistributionChart(driver);
    displayPerformanceRadarChart(driver);
    let driver_proposal = await fetchDriverProposal(driver);
    if (driver_proposal != null) displayProposalInfo(driver, driver_proposal);

    document.getElementById("edit-driver-btn").addEventListener("click", () => {
        proposalModification = !proposalModification;
        displayModifProposal(driver);
    });
    document.getElementById("save-driver-btn").addEventListener("click", async () => {
        saveModifProposal(driver);
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

async function displayProposalInfo(driver, driver_proposal) {
    console.log("Driver proposal data:", driver_proposal);
    console.log("Driver data:", driver);
    if (driver_proposal.picture && !driver.picture ) {
        const pictureElem = document.getElementById("driver-picture");
        pictureElem.classList.remove("border-blue-600", "dark:border-blue-400");
        pictureElem.classList.add("border-yellow-500", "border-4");
        pictureElem.src = driver_proposal.picture;
        driver.picture = driver_proposal.picture;

        pictureElem.style.cursor = "pointer";
        pictureElem.addEventListener("click", () => {
            alert("This picture is a user proposal and has not been verified.");
        });
    }

    if (driver_proposal.country && !driver.country) {
        const countryElem = document.getElementById("driver-country-img");
        countryElem.src = "assets/flags/" + driver_proposal.country.toLowerCase() + ".png";
        countryElem.classList.remove("border-blue-600", "dark:border-blue-400");
        countryElem.classList.add("border-yellow-500", "border-4", "rounded-full");
        driver.country = driver_proposal.country;
        
        countryElem.style.cursor = "pointer";
        countryElem.addEventListener("click", () => {
            alert("This country is a user proposal and has not been verified.");
        });
    }

    if (driver_proposal.dateOfBirth && !driver.dateOfBirth) {
        const dobElem = document.getElementById("driver-dob");
        dobElem.innerText = `${driver_proposal.dateOfBirth} (${getAge(driver_proposal.dateOfBirth, driver.dateOfDeath)} years old) ⚠️`;
        dobElem.classList.add(
            "border-4",
            "border-yellow-500",
            "rounded",
            "px-2",
            "cursor-pointer"
        );
        driver.dateOfBirth = driver_proposal.dateOfBirth;

        dobElem.style.cursor = "pointer";
        dobElem.addEventListener("click", () => {
            alert("This date of birth is a user proposal and has not been verified.");
        });
    }

    if (driver_proposal.dateOfDeath && !driver.dateOfDeath) {
        const dodElem = document.getElementById("driver-dod");
        dodElem.innerText = `${driver_proposal.dateOfDeath} ⚠️`;
        dodElem.classList.add(
            "border-4",
            "border-yellow-500",
            "rounded",
            "px-2",
            "cursor-pointer"
        );
        driver.dateOfDeath = driver_proposal.dateOfDeath;

        dodElem.style.cursor = "pointer";
        dodElem.addEventListener("click", () => {
            alert("This date of death is a user proposal and has not been verified.");
        });
    }
    document.getElementById("warning-information").classList.remove("hidden");
}

async function fetchDriverProposal(driver){
  try {
    const response = await fetch(`assets/php/proposal/getDriver.php?id=${encodeURIComponent(driver.firstName + "_" + driver.lastName)}`);
    if (!response.ok) {
      console.error(`Request failed with status ${response.status}`);
      return null;
    }

    const result = await response.json();

    if (!result.success) {
      console.warn("Server responded with success: false.");
      console.warn("Response data:", result);
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


async function saveModifProposal(driver) {
    let formData = new FormData();
    let driver_picture = document.getElementById("driver-picture");
    if(document.getElementById("driver-country-img").value != "" && document.getElementById("driver-country-img").value != undefined) formData.append("country", document.getElementById("driver-country-img").value);
    try { if(document.getElementById("input-dob").value != "") formData.append("dateOfBirth", document.getElementById("input-dob").value); } catch (error) {
        console.warn("Error retrieving date of birth:", error); }
    try { if(document.getElementById("input-dod").value != "") formData.append("dateOfDeath", document.getElementById("input-dod").value); } catch (error) {
        console.warn("Error retrieving date of death:", error); }

    if (driver_picture && driver_picture.type === "file" && driver_picture.files.length > 0) formData.append("picture", driver_picture.files[0]);

    if ([...formData.entries()].length >= 1) {
        formData.append("id", driver.firstName + "_" + driver.lastName);

        let data = await setData("assets/php/proposal/setDriver.php", formData);
        console.log(data);
        alert(data.success ? "Proposal saved!" : "Error");
        window.location.reload();
    } else {
        console.log(formData);
        console.log("No changes made to the driver profile.");
    }
}

function displayModifProposal(driver) {
    if (proposalModification) {
        document.getElementById("save-driver-btn").classList.remove("hidden");
        document.getElementById("edit-driver-btn").innerText = "Cancel";
        if (!driver.country) {
            document.getElementById("driver-country-img").outerHTML = `
                <input type="text" id="driver-country-img" placeholder="Country" class="border p-1 rounded" />
            `;
        }
        if (!driver.picture) {
            document.getElementById("driver-picture").outerHTML = `
                <input type="file" id="driver-picture" accept="image/*" class="border p-1 rounded" />
            `;
        }
        if (!driver.dateOfBirth) {
            document.getElementById("driver-dob").innerHTML = `
                <div id="driver-dob" class="text-gray-500 dark:text-gray-400 ml-2">
                    <label for="input-dob" class="block mb-1">Date of Birth:</label>    
                    <input type="date" id="input-dob" class="border p-1 rounded" />
                </div>
            `;
        }
        if (!driver.dateOfDeath) {
            document.getElementById("driver-dod").innerHTML = `
                <div id="driver-dod" class="text-gray-500 dark:text-gray-400 ml-2">
                    <label for="input-dod" class="block mb-1">Date of Death:</label>    
                    <input type="date" id="input-dod" class="border p-1 rounded" />
                </div>
            `;
        }
    } else {
        document.getElementById("save-driver-btn").classList.add("hidden");
        document.getElementById("edit-driver-btn").innerText = "Edit";
        document.getElementById("driver-country-img").outerHTML = `
            <img id="driver-country-img" src="assets/flags/default.png" alt="Driver Country"
                class="inline-block h-6 w-6 m-2 object-contain">
        `;
        document.getElementById("driver-picture").outerHTML = `
            <img id="driver-picture" src="drivers/picture/default.png" alt="Driver Picture"
                class="w-48 h-48 object-contain rounded-full border-4 border-blue-600 dark:border-blue-400">
        `;
        document.getElementById("driver-dob").outerHTML = `
            <span id="driver-dob" class="font-semibold text-gray-700 dark:text-gray-300">?</span>
        `;
        document.getElementById("driver-dod").outerHTML = `
            <span id="driver-dod" class="font-semibold text-gray-700 dark:text-gray-300">?</span>
        `;
        window.location.reload();
    }
}

function displayMainDriverInfo(driver) {
    document.getElementById("driver-name").innerText = driver.firstName + " " + driver.lastName;
    if (driver.country) {
        document.getElementById("driver-country-img").src = "assets/flags/" + driver.country.toLowerCase() + ".png";
    }
    if (driver.picture) {
        document.getElementById("driver-picture").src = driver.picture;
    } 
    if (driver.dateOfBirth) {
        document.getElementById("driver-dob").innerText = driver.dateOfBirth + ` (${driver.age} years old)`;
    }
    if (driver.dateOfDeath) {
        document.getElementById("driver-dod").innerText = driver.dateOfDeath;
    }
}

function displayDriverResults(driver) {
    const resultsContainer = document.getElementById("resultsContainer");
    
    // Add global toggle button
    const toggleAllBtn = document.createElement('div');
    toggleAllBtn.className = 'text-center mb-6';
    toggleAllBtn.innerHTML = `
        <button id="toggle-all-results" class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-md transition-all duration-200">
            📂 Collapse All Results
        </button>
    `;
    resultsContainer.appendChild(toggleAllBtn);

    const seasons = Object.keys(driver.seasons).sort((a, b) => b - a);
    for (const season of seasons) {
        for (const championship in driver.seasons[season]) {
            if (championship === "standing") continue;

            const standing = driver.seasons[season][championship].standing;
            const standingHTML = standing ? `<p class="text-sm text-blue-500 dark:text-blue-400 mt-2">Standing: P${standing.position} • ${standing.points} points</p>` : "";
            
            const sectionId = `section-${season}-${championship.replace(/[^a-zA-Z0-9]/g, '_')}`;
            const hasRaceResults = Object.keys(driver.seasons[season][championship]).some(race => {
                if (race === "standing") return false;
                return Object.keys(driver.seasons[season][championship][race]).some(session => 
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
                    <table class="min-w-full table-auto text-sm text-gray-800 dark:text-gray-200 relative z-10">
                        <thead class="bg-blue-100 dark:bg-gray-700 text-blue-700 dark:text-blue-300">
                            <tr>
                                <th class="p-3 text-left border-b border-gray-300 dark:border-gray-600">Race</th>
                                <th class="p-3 text-left border-b border-gray-300 dark:border-gray-600">Session</th>
                                <th class="p-3 text-left border-b border-gray-300 dark:border-gray-600">Position</th>
                                <th class="p-3 text-left border-b border-gray-300 dark:border-gray-600">Fastest Lap</th>
                                <th class="p-3 text-left border-b border-gray-300 dark:border-gray-600">Team</th>
                                <th class="p-3 text-left border-b border-gray-300 dark:border-gray-600">Other Info</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-400 dark:divide-gray-600">
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

                    seasonHTML += `<tr class="hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer transition">`;
                    if (firstRow) {
                        seasonHTML += `<td class="p-3 font-semibold" rowspan="${rowspan}">${race}</td>`;
                        firstRow = false;
                    }
                    seasonHTML += `
                        <td class="p-3">${data.session}</td>
                        <td class="p-3">${data.position ? `P${data.position}` : "N/A"}</td>
                        <td class="p-3">${data.fastest_lap ?? "N/A"}</td>
                        <td class="p-3 relative group min-w-[8rem] overflow-visible z-30">
                            <a href="team.html?id=${data.team}" class="text-blue-600 dark:text-blue-400 hover:underline">
                                ${data.team?.replaceAll("_", " ") ?? "N/A"}
                            </a>
                        </td>
                        <td class="p-3">
                            <button onclick="toggleDetails('${rowId}')" class="text-blue-600 dark:text-blue-400 hover:underline">Show</button>
                            <div id="${rowId}" class="hidden mt-2 text-sm text-gray-600 dark:text-gray-300">${formatOtherInfo(data.other_info)}</div>
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

function displayDriverPerformanceChart(driver) {
    const raceAverageByYear = {};
    const qualifyingAverageByYear = {};

    for (const season in driver.seasons) {
        let raceTotal = 0, raceCount = 0;
        let qualTotal = 0, qualCount = 0;
        
        for (const championship in driver.seasons[season]) {
            if (championship === "standing") continue;

            const races = driver.seasons[season][championship];
            for (const race in races) {
                if (race === "standing") continue;
                for (const session in races[race]) {
                    const pos = parseInt(races[race][session].position);
                    if (!isNaN(pos)) {
                        if (session.toLowerCase().includes("race")) {
                            raceTotal += pos;
                            raceCount++;
                        } else if (session.toLowerCase().includes("qualifying") || session.toLowerCase().includes("practice")) {
                            qualTotal += pos;
                            qualCount++;
                        }
                    }
                }
            }
        }
        if (raceCount > 0) raceAverageByYear[season] = raceTotal / raceCount;
        if (qualCount > 0) qualifyingAverageByYear[season] = qualTotal / qualCount;
    }

    const sortedYears = Object.keys(raceAverageByYear).sort();
    const raceAveragePositions = sortedYears.map(year => raceAverageByYear[year] ? raceAverageByYear[year].toFixed(2) : null);
    const qualifyingAveragePositions = sortedYears.map(year => qualifyingAverageByYear[year] ? qualifyingAverageByYear[year].toFixed(2) : null);

    if (sortedYears.length === 0) {
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
            labels: sortedYears,
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

function displayFinishRateChart(driver) {
    let top10Count = 0;
    let totalRaces = 0;

    for (const season in driver.seasons) {
        for (const championship in driver.seasons[season]) {
            if (championship === "standing") continue;

            const races = driver.seasons[season][championship];

            for (const race in races) {
                if (race === "standing") continue;

                for (const session in races[race]) {
                    if (session.toLowerCase().includes("race")) {
                        totalRaces++;
                        const position = parseInt(races[race][session].position);

                        if (!isNaN(position) && position <= 10) {
                            top10Count++;
                        }
                    }
                }
            }
        }
    }

    const top10Rate = totalRaces > 0 ? ((top10Count / totalRaces) * 100).toFixed(1) : 0;
    const outsideTop10Rate = totalRaces > 0 ? (100 - top10Rate).toFixed(1) : 0;

    const canvas = document.getElementById('finishRateChart');
    if (!canvas) {
        console.error('Canvas element "finishRateChart" not found');
        return;
    }

    if (totalRaces === 0) {
        console.warn('No race data available for finish rate chart');
        return;
    }

    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Top 10 Finishes', 'Outside Top 10'],
            datasets: [{
                label: 'Finish Rate',
                data: [top10Rate, outsideTop10Rate],
                backgroundColor: ['#10B981', '#EF4444'],
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        padding: 15
                    }
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
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const count = label.includes('Top 10') ? top10Count : (totalRaces - top10Count);
                            return `${label}: ${value}% (${count}/${totalRaces} races)`;
                        }
                    }
                }
            }
        }
    });
}

function displayResultsDistributionChart(driver) {
    const racePositionCounts = {};
    const qualifyingPositionCounts = {};
    
    for (const season in driver.seasons) {
        for (const championship in driver.seasons[season]) {
            if (championship === "standing") continue;
            const races = driver.seasons[season][championship];
            
            for (const race in races) {
                if (race === "standing") continue;
                for (const session in races[race]) {
                    const position = parseInt(races[race][session].position);
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
    
    if (Object.keys(racePositionCounts).length === 0 && Object.keys(qualifyingPositionCounts).length === 0) {
        console.warn('No race results data available');
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

function displayPerformanceRadarChart(driver) {
    let totalRaces = 0, wins = 0, podiums = 0, top5 = 0, top10 = 0, dnfs = 0;
    
    for (const season in driver.seasons) {
        for (const championship in driver.seasons[season]) {
            if (championship === "standing") continue;
            const races = driver.seasons[season][championship];
            
            for (const race in races) {
                if (race === "standing") continue;
                for (const session in races[race]) {
                    if (session.toLowerCase().includes("race")) {
                        totalRaces++;
                        const position = parseInt(races[race][session].position);
                        
                        if (isNaN(position)) {
                            dnfs++;
                        } else {
                            if (position === 1) wins++;
                            if (position <= 3) podiums++;
                            if (position <= 5) top5++;
                            if (position <= 10) top10++;
                        }
                    }
                }
            }
        }
    }
    
    const canvas = document.getElementById('performanceRadarChart');
    if (!canvas) {
        console.error('Canvas element "performanceRadarChart" not found');
        return;
    }
    
    if (totalRaces === 0) {
        console.warn('No race data for radar chart');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Wins', 'Podiums', 'Top 5', 'Top 10', 'Reliability'],
            datasets: [{
                label: 'Performance Metrics',
                data: [
                    (wins / totalRaces * 100).toFixed(1),
                    (podiums / totalRaces * 100).toFixed(1),
                    (top5 / totalRaces * 100).toFixed(1),
                    (top10 / totalRaces * 100).toFixed(1),
                    ((totalRaces - dnfs) / totalRaces * 100).toFixed(1)
                ],
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 2,
                pointBackgroundColor: 'rgba(59, 130, 246, 1)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgba(59, 130, 246, 1)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: { stepSize: 20 },
                    grid: { color: 'rgba(156, 163, 175, 0.2)' }
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
                            return `${context.label}: ${context.parsed.r}%`;
                        }
                    }
                }
            }
        }
    });
}

