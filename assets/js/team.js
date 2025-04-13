document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const teamId = urlParams.get("id");

    let team = (await fetchData("getTeams.php", teamId))[0];
    if (!team) {
        document.getElementById("teamDetail").innerHTML = "<p class='text-red-500'>Team not found.</p>";
        return;
    }

    const container = document.getElementById("teamDetail");
    container.style.opacity = 0;
    requestAnimationFrame(() => {
      container.style.transition = "opacity 0.5s ease";
      container.style.opacity = 1;
    });

    team.age = getAge(team.creationDate, team.endDate)
    displayTeamInfo(team);
    displayTeamResults(team);
});

function displayTeamInfo(team) {
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
    if (team.country) {
        document.getElementById("country_flag").innerHTML += `<img src="assets/flags/${team.country.toLowerCase()+".png"}" class="w-10 aspect-[3/2] rounded" alt="Country Flag">`;
    } else {
        document.getElementById("country_flag").innerHTML += `<img src="assets/flags/default.png" class="w-10 aspect-[3/2] rounded" alt="Country Flag">`;
    }

    const otherTeamsContainer = document.getElementById("other_teams");
    if (team.previous && team.previous.length > 0) {
        otherTeamsContainer.innerHTML += `
            <div>
                <h3 class="text-lg font-semibold mt-4">Previous Teams</h3>
                <ul class="list-disc list-inside">
                    ${team.previous.flat().map(previousTeam => `
                        <li>
                            <a href="team.html?id=${previousTeam}" class="text-blue-400 underline">
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
                            <a href="team.html?id=${nextTeam}" class="text-blue-400 underline">
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
            const standingHTML = standing ? `<span class='text-blue-400'>Standing: P${standing.position} | Total Points: ${standing.points}</span>` : "";

            let seasonHTML = `<h3><a href="race.html?id=${championship}&year=${season}" class="text-lg font-semibold mt-4 text-blue-400 underline">${season} - ${championship.replace("_", " ")} ${standingHTML}</a></h3>`;

            seasonHTML += Object.entries(data).filter(([key]) => key !== "standing").map(([event, sessions]) => {
                let eventHTML = `<h4 class="text-md font-semibold mt-2 text-gray-300">${event}</h4>`;
                const races = {};

                Object.entries(sessions).forEach(([session, cars]) => {
                    Object.entries(cars).forEach(([car, details]) => {
                        if (!races[session]) races[session] = [];
                        races[session].push({ car, ...details });
                    });
                });

                eventHTML += `
                    <table class="table-fixed w-full mt-2 bg-gray-800 text-white border border-gray-700">
                        <thead>
                            <tr class="bg-gray-700">
                                <th class="w-1/6 p-2 border border-gray-600">Session</th>
                                <th class="w-1/12 p-2 border border-gray-600">Car #</th>
                                <th class="w-1/12 p-2 border border-gray-600">Position</th>
                                <th class="w-1/6 p-2 border border-gray-600">Fastest Lap</th>
                                <th class="w-1/6 p-2 border border-gray-600">Drivers</th>
                                <th class="w-1/6 p-2 border border-gray-600">Other Info</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(races).map(([session, raceData]) => {
                                return raceData.map((data, index) => {
                                    const position = data.position ?? "N/A";
                                    const fastestLap = data.fastest_lap ?? "N/A";
                                    const drivers = data.drivers ? data.drivers.join(", ") : "N/A";
                                    const otherInfoHTML = Object.entries(data.other_info || {})
                                        .map(([key, value]) => `<span class="mr-2"><strong>${key.replace(/_/g, " ")}:</strong> ${value}</span>`)
                                        .join("");

                                    const rowId = `details-${season}-${championship}-${event}-${session}-${index}`;
                                    return `
                                        <tr class="border border-gray-700 cursor-pointer">
                                            ${index === 0 ? `<td class="p-2 border border-gray-600" rowspan="${raceData.length}">${session}</td>` : ""}
                                            <td class="p-2 border border-gray-600">${data.car}</td>
                                            <td class="p-2 border border-gray-600">P${position}</td>
                                            <td class="p-2 border border-gray-600">${fastestLap}</td>
                                            <td class="p-2 border border-gray-600">
                                                <a class="text-blue-400 underline focus:outline-none" href="driver.html?id=${drivers}">${drivers.replace("_", " ")}</a>
                                            </td>
                                            <td class="p-2 border border-gray-600">
                                                <button class="text-blue-400 underline focus:outline-none" onclick="toggleDetails('${rowId}')">Show Details</button>
                                                <span id="${rowId}" class="hidden ml-2">${otherInfoHTML || "No additional info"}</span>
                                            </td>
                                        </tr>
                                    `;
                                }).join("");
                            }).join("")}
                        </tbody>
                    </table>
                `;
                return eventHTML;
            }).join("");

            return seasonHTML;
        }).join("");
    }).join("");
}
