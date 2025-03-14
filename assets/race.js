document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const raceId = urlParams.get("id");
    const year = urlParams.get("year");

    if (!raceId || !year) {
        document.getElementById("raceDetail").innerHTML = "<p class='text-red-500'>No race specified.</p>";
        return;
    }

    let race = await fetchData("getRaces.php", raceId, year);
    if (!race) {
        document.getElementById("raceDetail").innerHTML = "<p class='text-red-500'>Race not found.</p>";
        return;
    }

    displayMainRaceInfo(race);
    displayRaceResults(race);
});

function displayMainRaceInfo(race) {
    if (race.picture == undefined) {
        race.picture = "default.png";
    }

    document.getElementById("raceDetail").innerHTML = `
        <img src="races/picture/${race.picture}" class="w-40 h-40 object-cover rounded-lg mr-6" alt="Picture of ${race.name}">
        <div>
            <h1 class="text-3xl font-bold">${race.name}</h1>
            <p class="text-lg text-gray-300">${race.nickname ? `Nickname: ${race.nickname}` : ""}</p>
            <div id="country_flag" class="flex items-center mt-2">
            </div>
        </div>
    `;
    if (race.country) {
        document.getElementById("country_flag").innerHTML += `<img src="assets/flags/${race.country.toLowerCase()+".png"}" class="w-8 h-6 mr-2 rounded" alt="Country Flag">`;
    } else {
        document.getElementById("country_flag").innerHTML += `<img src="assets/flags/default.png" class="w-8 h-6 mr-2 rounded" alt="Country Flag">`;
    }
}

function displayRaceResults(race) {
    const resultsContainer = document.getElementById("resultsContainer");

    for (const event in race.events) {
        let eventHTML = `<h2 class="text-xl font-bold mt-6">${event}</h2>`;

        for (const session in race.events[event]) {
            let sessionHTML = `<h3 class="text-lg font-semibold mt-4">${session}</h3>`;

            sessionHTML += `<table class="w-full mt-2 bg-gray-800 text-white border border-gray-700">
                                <thead>
                                    <tr class="bg-gray-700">
                                        <th class="p-2 border border-gray-600">Position</th>
                                        <th class="p-2 border border-gray-600">Car #</th>
                                        <th class="p-2 border border-gray-600">Team</th>
                                        <th class="p-2 border border-gray-600">Drivers</th>
                                        <th class="p-2 border border-gray-600">Fastest Lap</th>
                                        <th class="p-2 border border-gray-600">Other Info</th>
                                    </tr>
                                </thead>
                                <tbody>`;

            for (const car in race.events[event][session]) {
                const data = race.events[event][session][car];
                let position = data.position !== undefined ? `P${data.position}` : "N/A";
                let fastestLap = data.fastest_lap !== undefined ? data.fastest_lap : "N/A";
                let drivers = data.drivers ? data.drivers.join(", ") : "N/A";

                let otherInfoHTML = Object.entries(data.other_info || {})
                    .map(([key, value]) => `<span class="mr-2"><strong>${key.replace(/_/g, " ")}:</strong> ${value}</span>`)
                    .join("");

                let rowId = `details-${event}-${session}-${car}`;

                sessionHTML += `<tr class="border border-gray-700 cursor-pointer">
                        <td class="p-2 border border-gray-600">${position}</td>
                        <td class="p-2 border border-gray-600">${car}</td>
                        <td class="p-2 border border-gray-600">${data.team}</td>
                        <td class="p-2 border border-gray-600">${drivers}</td>
                        <td class="p-2 border border-gray-600">${fastestLap}</td>
                        <td class="p-2 border border-gray-600">
                            <button class="text-blue-400 underline focus:outline-none" onclick="toggleDetails('${rowId}')">Show Details</button>
                            <span id="${rowId}" class="hidden ml-2">${otherInfoHTML || "No additional info"}</span>
                        </td>
                    </tr>`;
            }

            sessionHTML += `</tbody></table>`;
            eventHTML += sessionHTML;
        }

        resultsContainer.innerHTML += eventHTML;
    }
}


function toggleDetails(rowId) {
    document.getElementById(rowId).classList.toggle("hidden");
}
