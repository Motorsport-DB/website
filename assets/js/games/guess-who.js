const API_CREATE = "/assets/php/games/guess-who/create_game.php";
const API_JOIN = "/assets/php/games/guess-who/join_game.php";

const list_championships = [];

async function createGame() {
  console.log("🎮 Creating game...");
  
  if (list_championships.length == 0) {
    console.log("📊 Loading championships...");
    const response = await fetch("/assets/php/games/guess-who/get_championships.php");
    const data = await response.json();
    console.log("📊 Championships data:", data);
    
    if (data.success) {
      if (typeof data.championships === "object" && data.championships !== null) {
        Object.entries(data.championships).forEach(([name, arr]) => {
          if (Array.isArray(arr)) {
            arr.forEach(year => list_championships.push({ year, name }));
          }
        });
        console.log(`✅ Loaded ${list_championships.length} championships`);
      } else {
        console.error("❌ data.championships is not an object:", data.championships);
      }
    } else {
      console.error("❌ Error loading championships");
      alert("Error loading championships.");
      return;
    }
  }
  
  const championshipSelect = document.getElementById("championships");
  if (!championshipSelect) {
    console.error("❌ Element 'championships' not found!");
    return;
  }
  console.log("✅ Championship select element found");
  
  const listDriversEl = document.getElementById("list_drivers");
  if (listDriversEl) {
    console.log("✅ Showing championship selector");
    listDriversEl.classList.remove("hidden");
  } else {
    console.warn("⚠️ Element 'list_drivers' not found (optional)");
  }
  
  championshipSelect.classList.add("block", "bg-white", "dark:bg-gray-800", "text-black", "dark:text-white", "border", "border-gray-300", "dark:border-gray-600", "rounded", "p-2", "mt-2");
  championshipSelect.innerHTML = list_championships.map(champ => `
    <option value='${JSON.stringify([champ.name, champ.year])}'>${champ.name} - ${champ.year}</option>
  `).join("");
  console.log(`✅ Populated ${list_championships.length} championship options`);
}

async function startGame() {
  const selectedChampionships = getSelectedChampionships();
  console.log("🎮 Starting game with championships:", selectedChampionships);
  
  const response = await fetch(API_CREATE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ championships: selectedChampionships })
  });
  const data = await response.json();
  console.log("📦 Server response:", data);
  
  if (data.success) {
    console.log(`✅ Game created, redirecting to session ${data.session_id}`);
    // Use proper PHP path, not .html
    window.location.href = `/games/guess-who?session=${data.session_id}&player=1`;
  } else {
    console.error("❌ Error creating game:", data);
    alert("Error creating the game.");
  }
}

async function joinGame() {
  const sessionId = prompt("Session code?");
  if (!sessionId) return;
  console.log(`🔗 Joining game session: ${sessionId}`);
  // Use proper PHP path, not .html
  window.location.href = `/games/guess-who?session=${sessionId}&player=2`;
}

async function loadGame() {
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get("session");
  const player = urlParams.get("player");

  console.log(`🎮 Loading game - Session: ${sessionId}, Player: ${player}`);

  if (!sessionId || !player) {
    console.warn("⚠️ Missing session or player parameter");
    return;
  }

  const response = await fetch(`${API_JOIN}?session=${encodeURIComponent(sessionId)}&player=${encodeURIComponent(player)}`);
  const data = await response.json();
  console.log("📦 Game data received:", data);
  
  if (!data.success) {
    console.error("❌ Invalid or expired session");
    alert("Invalid or expired session.");
    return;
  }

  // Show game section, hide menu
  const gameEl = document.getElementById("game");
  const menuEl = document.getElementById("menu");
  if (gameEl) gameEl.classList.remove("hidden");
  if (menuEl) menuEl.classList.add("hidden");

  console.log("👥 Pilots data:", data.pilots);
  let pilotsHtml = "";
  if (typeof data.pilots === "object" && data.pilots !== null) {
    const pilotEntries = Object.entries(data.pilots);
    console.log(`✅ Found ${pilotEntries.length} pilots`);
    pilotsHtml = pilotEntries.map(([id, pilot]) => {
      if (typeof pilot === "object" && pilot !== null && pilot.picture) {
        return `
          <div class="border border-gray-300 dark:border-gray-600 rounded p-2 text-center bg-white dark:bg-gray-800 shadow flex flex-col pilot-card transition-all duration-200 text-black dark:text-white hover:scale-105 cursor-pointer"
               data-pilot-id="${id}" onclick="this.classList.toggle('opacity-50'); this.classList.toggle('grayscale'); this.classList.toggle('bg-gray-200'); this.classList.toggle('dark:bg-gray-700');">
            <img src="${pilot.picture}" alt="${id}" class="w-48 h-48 mx-auto mb-2 object-contain rounded pointer-events-none select-none">
            <p class="pointer-events-none select-none">${id.replace(/_/g, " ")}</p>
          </div>
        `;
      }
      return '';
    }).filter(Boolean).join("");
  }
  
  if (!pilotsHtml) {
    pilotsHtml = "<div class='col-span-4 text-center text-red-600 dark:text-red-400'>No drivers found.</div>";
    console.error("❌ No pilots HTML generated");
  }
  
  gameEl.innerHTML = `
    <div class="mb-4 text-gray-800 dark:text-gray-200">
      <span class="font-semibold">Game code:</span>
      <span class="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-blue-700 dark:text-blue-400">${sessionId}</span>
    </div>
    <h2 class="text-xl font-bold mb-4 text-gray-900 dark:text-white">
      Your opponent must guess:
      <span class="text-red-600 dark:text-red-400">${data.secret_pilot ? data.secret_pilot.replace(/_/g, " ") : 'Unknown'}</span>
    </h2>
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      ${pilotsHtml}
    </div>
  `;
  console.log("✅ Game interface rendered");
}

window.onload = () => {
  console.log("🚀 Page loaded");
  console.log("📍 URL:", window.location.href);
  console.log("📍 Search params:", window.location.search);
  
  if (window.location.search.includes("session")) {
    console.log("🎮 Session detected, loading game...");
    loadGame();
  } else {
    console.log("📋 No session, showing menu");
  }
}

function getSelectedChampionships() {
  const championshipSelect = document.getElementById("championships");
  const selectedOptions = Array.from(championshipSelect.selectedOptions);
  return selectedOptions.map(option => JSON.parse(option.value));
}
