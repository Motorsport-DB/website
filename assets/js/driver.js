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
        dodElem.innerText = `${driver_proposal.dateOfDeath} (${getAge(driver_proposal.dateOfBirth, driver.dateOfDeath)} years old) ⚠️`;
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
    try {
        if(document.getElementById("input-dob").value != "") formData.append("dateOfBirth", document.getElementById("input-dob").value);
        if(document.getElementById("input-dod").value != "") formData.append("dateOfDeath", document.getElementById("input-dod").value);
    } catch (error) {
        console.warn("Error retrieving date of birth or death:", error);
    }
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

    const seasons = Object.keys(driver.seasons).sort((a, b) => b - a);
    for (const season of seasons) {
        for (const championship in driver.seasons[season]) {
            if (championship === "standing") continue;

            const standing = driver.seasons[season][championship].standing;
            const standingHTML = standing ? `<p class="text-sm text-blue-500 dark:text-blue-400 mt-2">Standing: P${standing.position} • ${standing.points} points</p>` : "";

            let seasonHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-xl p-6 my-8 shadow-md border border-gray-200 dark:border-gray-700 z-0">
                <h2 class="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-4 z-0">
                    <span class="relative group">
                        <a href="race.html?id=${championship}&year=${season}" class="hover:underline">${season} - ${championship.replaceAll("_", " ")}</a>
                    </span>
                </h2>
                ${standingHTML}
                <div class="mt-6 relative z-0 overflow-x-auto sm:overflow-visible">
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