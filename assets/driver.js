document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const driverId = urlParams.get("id");
    
    if (!driverId) {
        document.getElementById("driverDetail").innerHTML = "<p class='text-red-500'>No driver specified.</p>";
        return;
    }

    const response = await fetch(`getDrivers.php?driver=${driverId}`);
    let driver = await response.json();
    driver = driver[0];
    
    if (!driver) {
        document.getElementById("driverDetail").innerHTML = "<p class='text-red-500'>Driver not found.</p>";
        return;
    }

    // Calculate Age
    const birthDate = new Date(driver.dateOfBirth);
    const deathDate = driver.dateOfDeath ? new Date(driver.dateOfDeath) : new Date();
    const age = deathDate.getFullYear() - birthDate.getFullYear();
    
    // Set driver details
    document.getElementById("driverImage").src = `drivers/picture/${driver.picture}`;
    document.getElementById("driverName").textContent = `${driver.firstName} ${driver.lastName}`;
    document.getElementById("driverNickname").textContent = `Nickname: ${driver.Nickname || "N/A"}`;
    document.getElementById("driverBirth").textContent = `Date of Birth: ${driver.dateOfBirth} (Age: ${age})`;
    driver.dateOfDeath ? document.getElementById("driverDeath").textContent = `Date of Death: ${driver.dateOfDeath}` : "";
    document.getElementById("driverCountry").textContent = driver.country;
    document.getElementById("countryFlag").src = `assets/flags/${driver.country.toLowerCase().replace(/ /g, "_")}.png`;
    
    // Generate grouped results
    const resultsContainer = document.getElementById("resultsContainer");

    for (const season in driver.seasons) {
        for (const championship in driver.seasons[season]) {
            if (championship === "standing") continue;
            
            let standing = driver.seasons[season][championship].standing;
            let standingHTML = standing ? `<span class='text-blue-400'>Standing: P${standing.position} | Total Points: ${standing.points}</span>` : "";
            
            let seasonHTML = `<h3 class="text-lg font-semibold mt-4">${season} - ${championship} ${standingHTML}</h3>`;
            
            let races = {};
            for (const race in driver.seasons[season][championship]) {
                if (race === "standing") continue;
                
                for (const session in driver.seasons[season][championship][race]) {
                    if (!races[race]) races[race] = [];
                    races[race].push({ session, ...driver.seasons[season][championship][race][session] });
                }
            }
            
            seasonHTML += `<table class="w-full mt-2 bg-gray-800 text-white border border-gray-700">
                            <thead>
                                <tr class="bg-gray-700">
                                    <th class="p-2 border border-gray-600">Race</th>
                                    <th class="p-2 border border-gray-600">Session</th>
                                    <th class="p-2 border border-gray-600">Position</th>
                                    <th class="p-2 border border-gray-600">Fastest Lap</th>
                                    <th class="p-2 border border-gray-600">Fastest Speed</th>
                                    <th class="p-2 border border-gray-600">Laps</th>
                                    <th class="p-2 border border-gray-600">Points</th>
                                    <th class="p-2 border border-gray-600">Team</th>
                                </tr>
                            </thead>
                            <tbody>`;
            
            for (const race in races) {
                let firstRow = true;
                let rowspan = races[race].length;
                races[race].forEach((data, index) => {
                    let position = data.position !== undefined ? `P${data.position}` : "N/A";
                    let fastestLap = data.fastest_lap !== undefined ? data.fastest_lap : "N/A";
                    let fastestSpeed = data.other_info?.fastest_speed || "N/A";
                    let laps = data.other_info?.laps || "N/A";
                    let points = data.points !== undefined ? data.points : "N/A";
                    let team = data.team !== undefined ? data.team : "N/A";

                    seasonHTML += `<tr class="border border-gray-700">`;
                    if (firstRow) {
                        seasonHTML += `<td class="p-2 border border-gray-600" rowspan="${rowspan}">${race}</td>`;
                        firstRow = false;
                    }
                    seasonHTML += `
                            <td class="p-2 border border-gray-600">${data.session}</td>
                            <td class="p-2 border border-gray-600">${position}</td>
                            <td class="p-2 border border-gray-600">${fastestLap}</td>
                            <td class="p-2 border border-gray-600">${fastestSpeed}</td>
                            <td class="p-2 border border-gray-600">${laps}</td>
                            <td class="p-2 border border-gray-600">${points}</td>
                            <td class="p-2 border border-gray-600">${team}</td>
                        </tr>`;
                });
            }
            seasonHTML += `</tbody></table>`;
            resultsContainer.innerHTML += seasonHTML;
        }
    }
});