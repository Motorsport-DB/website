const API_CREATE = "assets/php/games/guess-who/create_game.php";
const API_JOIN = "assets/php/games/guess-who/join_game.php";

const list_championships = [];

async function createGame() {
  if (list_championships.length == 0) {
    const response = await fetch("assets/php/games/guess-who/get_championships.php");
    const data = await response.json();
    if (data.success) {
      if (typeof data.championships === "object" && data.championships !== null) {
        Object.entries(data.championships).forEach(([name, arr]) => {
          if (Array.isArray(arr)) {
            arr.forEach(year => list_championships.push({ year, name }));
          }
        });
      } else {
        console.error("data.championships is not an object:", data.championships);
      }
    } else {
      alert("Error loading championships.");
    }
  }
  const championshipSelect = document.getElementById("championships");
  document.getElementById("list_drivers").classList.remove("hidden");
  championshipSelect.classList.add("block", "bg-white", "dark:bg-gray-800", "text-black", "dark:text-white", "border", "border-gray-300", "dark:border-gray-600", "rounded", "p-2", "mt-2");
  championshipSelect.innerHTML = list_championships.map(champ => `
    <option value='${JSON.stringify([champ.name, champ.year])}'>${champ.name} - ${champ.year}</option>
  `).join("");
}

async function startGame() {
  const selectedChampionships = getSelectedChampionships();
  const response = await fetch(API_CREATE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ championships: selectedChampionships })
  });
  const data = await response.json();
  console.log(data);
  if (data.success) {
    window.location.href = `guess-who.html?session=${data.session_id}&player=1`;
  } else {
    alert("Error creating the game.");
  }
}

async function joinGame() {
  const sessionId = prompt("Session code?");
  if (!sessionId) return;
  window.location.href = `guess-who.html?session=${sessionId}&player=2`;
}

async function loadGame() {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get("session");
  const player = urlParams.get("player");

  if (!sessionId || !player) return;

  const response = await fetch(`${API_JOIN}?session=${encodeURIComponent(sessionId)}&player=${encodeURIComponent(player)}`);
  const data = await response.json();
  if (!data.success) {
    alert("Invalid or expired session.");
    return;
  }

  console.log(data.pilots);
  let pilotsHtml = "";
  if (typeof data.pilots === "object" && data.pilots !== null) {
    pilotsHtml = Object.entries(data.pilots).map(([id, pilot]) => {
      if (typeof pilot === "object" && pilot !== null && pilot.picture) {
        return `
          <div class="border border-gray-300 dark:border-gray-600 rounded p-2 text-center bg-white dark:bg-gray-800 shadow flex flex-col pilot-card transition-all duration-200 text-black dark:text-white hover:scale-105 cursor-pointer"
               data-pilot-id="${id}" onclick="this.classList.toggle('opacity-50'); this.classList.toggle('grayscale'); this.classList.toggle('bg-gray-200'); this.classList.toggle('dark:bg-gray-700');">
            <img src="${pilot.picture}" alt="${id}" class="w-48 h-48 mx-auto mb-2 object-contain rounded pointer-events-none select-none">
            <p class="pointer-events-none select-none">${id.replace(/_/g, " ")}</p>
          </div>
        `;
      }
    }).join("");
  } else {
    pilotsHtml = "<div class='col-span-4 text-center text-red-600 dark:text-red-400'>No drivers found.</div>";
  }
  document.getElementById("game").innerHTML = `
    <div class="mb-4 text-gray-800 dark:text-gray-200">
      <span class="font-semibold">Game code:</span>
      <span class="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-blue-700 dark:text-blue-400">${sessionId}</span>
    </div>
    <h2 class="text-xl font-bold mb-4 text-gray-900 dark:text-white">
      Your opponent must guess:
      <span class="text-red-600 dark:text-red-400">${data.secret_pilot.replace(/_/g, " ")}</span>
    </h2>
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      ${pilotsHtml}
    </div>
  `;
}

window.onload = () => {
  if (window.location.search.includes("session")) {
    loadGame();
    document.getElementById("menu").classList.add("hidden");
  }
}

function getSelectedChampionships() {
  const championshipSelect = document.getElementById("championships");
  const selectedOptions = Array.from(championshipSelect.selectedOptions);
  return selectedOptions.map(option => JSON.parse(option.value));
}
