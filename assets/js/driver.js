document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const driverId = urlParams.get("id");

    if (!driverId) {
        document.getElementById("driverDetail").innerHTML = "<p class='text-red-500'>No driver specified.</p>";
        return;
    }

    let driver = await fetchData("getDrivers.php", driverId);
    driver = driver[0];
    if (!driver) {
        document.getElementById("driverDetail").innerHTML = "<p class='text-red-500'>Driver not found.</p>";
        return;
    }
    driver.age = getAge(driver.dateOfBirth, driver.dateOfDeath);
    displayMainDriverInfo(driver);
    displayDriverResults(driver);
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
