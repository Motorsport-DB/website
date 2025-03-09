document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const teamId = urlParams.get("id");

    if (!teamId) {
        document.getElementById("teamDetail").innerHTML = "<p class='text-red-500'>No team specified.</p>";
        return;
    }

    let team = await fetchData("getTeams.php", teamId);
    team = team[0];
    if (!team) {
        document.getElementById("teamDetail").innerHTML = "<p class='text-red-500'>Team not found.</p>";
        return;
    }

    displayTeamInfo(team);
    displayTeamResults(team);
});

function displayTeamInfo(team) {
    document.getElementById("teamDetail").innerHTML = `
        <img src="teams/picture/${team.picture || "default.png"}" class="w-40 h-40 object-cover rounded-lg mr-6" alt="Picture of ${team.name}">
        <div>
            <h1 class="text-3xl font-bold">${team.name}</h1>
            <div class="flex items-center mt-2">
                <img src="assets/flags/${team.country.toLowerCase()+".png" || "default.png"}" class="w-8 h-6 mr-2 rounded" alt="Country Flag">
            </div>
        </div>
    `;
}

function displayTeamResults(team) {
    const resultsContainer = document.getElementById("resultsContainer");

    for (const season in team.seasons) {
        let seasonHTML = `<h2 class="text-xl font-bold mt-6">${season}</h2>`;
        
        for (const championship in team.seasons[season]) {
            let standing = team.seasons[season][championship].standing;
            let standingHTML = standing ? `<span class='text-blue-400'>Standing: P${standing.position} | Total Points: ${standing.points}</span>` : "";

            seasonHTML += `<h3 class="text-lg font-semibold mt-4">${championship} ${standingHTML}</h3>`;

            for (const event in team.seasons[season][championship]) {
                seasonHTML += `<h4 class="text-md font-semibold mt-2 text-gray-300">${event}</h4>`;

                let races = {};
                for (const session in team.seasons[season][championship][event]) {
                    for (const car in team.seasons[season][championship][event][session]) {
                        if (!races[session]) races[session] = [];
                        races[session].push({ car, ...team.seasons[season][championship][event][session][car] });
                    }
                }

                seasonHTML += `<table class="w-full mt-2 bg-gray-800 text-white border border-gray-700">
                                <thead>
                                    <tr class="bg-gray-700">
                                        <th class="p-2 border border-gray-600">Session</th>
                                        <th class="p-2 border border-gray-600">Car #</th>
                                        <th class="p-2 border border-gray-600">Position</th>
                                        <th class="p-2 border border-gray-600">Fastest Lap</th>
                                        <th class="p-2 border border-gray-600">Drivers</th>
                                        <th class="p-2 border border-gray-600">Other Info</th>
                                    </tr>
                                </thead>
                                <tbody>`;

                for (const session in races) {
                    let firstRow = true;
                    let rowspan = races[session].length;

                    races[session].forEach((data, index) => {
                        let position = data.position ?? "N/A";
                        let fastestLap = data.fastest_lap ?? "N/A";
                        let drivers = data.drivers ? data.drivers.join(", ") : "N/A";

                        let otherInfoHTML = Object.entries(data.other_info || {})
                            .map(([key, value]) => `<span class="mr-2"><strong>${key.replace(/_/g, " ")}:</strong> ${value}</span>`)
                            .join("");

                        let rowId = `details-${season}-${championship}-${event}-${session}-${index}`;

                        seasonHTML += `<tr class="border border-gray-700 cursor-pointer">`;
                        if (firstRow) {
                            seasonHTML += `<td class="p-2 border border-gray-600" rowspan="${rowspan}">${session}</td>`;
                            firstRow = false;
                        }
                        seasonHTML += `
                                <td class="p-2 border border-gray-600">${data.car}</td>
                                <td class="p-2 border border-gray-600">P${position}</td>
                                <td class="p-2 border border-gray-600">${fastestLap}</td>
                                <td class="p-2 border border-gray-600">${drivers}</td>
                                <td class="p-2 border border-gray-600">
                                    <button class="text-blue-400 underline focus:outline-none" onclick="toggleDetails('${rowId}')">Show Details</button>
                                    <span id="${rowId}" class="hidden ml-2">${otherInfoHTML || "No additional info"}</span>
                                </td>
                            </tr>`;
                    });
                }

                seasonHTML += `</tbody></table>`;
            }
        }
        resultsContainer.innerHTML += seasonHTML;
    }
}

