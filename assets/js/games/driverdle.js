document.addEventListener("DOMContentLoaded", () => {
  const maxAttempts = 5;
  const storageKey = "driverdle_attempts";
  const solutionKey = "driverdle_solution";
  const today = new Date().toISOString().slice(0, 10);
  let solution = null;
  let attempts = [];

  function normalize(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  }

  async function init() {
    const saved = JSON.parse(localStorage.getItem(solutionKey));
    if (!saved || saved.date !== today) {
      solution = await fetchDriverOfToday();
      if (!solution || !solution.lastname) return;
      localStorage.setItem(solutionKey, JSON.stringify({ ...solution, date: today }));
      localStorage.setItem(storageKey, JSON.stringify([]));
      attempts = [];
    } else {
      solution = saved;
      attempts = JSON.parse(localStorage.getItem(storageKey)) || [];
    }

    const normalizedLastName = normalize(solution.lastname);
    const board = document.getElementById("driverdle-board");
    board.innerHTML = "";
    board.dataset.length = normalizedLastName.length;
    drawGrid(board, normalizedLastName, maxAttempts);
    renderPastAttempts(attempts, normalizedLastName);
    document.getElementById("guess-form").onsubmit = handleGuess;

    if (attempts.length >= maxAttempts) {
      showEndMessage(false);
    } else if (attempts.includes(normalizedLastName)) {
      showEndMessage(true);
    }
  }

  function drawGrid(container, normalized, rows) {
    for (let i = 0; i < rows; i++) {
      const row = document.createElement("div");
      row.className = "flex justify-center space-x-1 my-1";
      for (let j = 0; j < normalized.length; j++) {
        const char = normalized[j];
        const cell = document.createElement("div");
        cell.className = "w-8 h-8 sm:w-10 sm:h-10 border border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-800 text-base sm:text-xl font-bold flex items-center justify-center uppercase rounded shadow";
        if (!/[A-Z]/.test(char)) {
          cell.textContent = char;
          cell.classList.add("bg-gray-300", "dark:bg-gray-700", "text-gray-500");
          cell.dataset.static = "1";
        }
        row.appendChild(cell);
      }
      container.appendChild(row);
    }
  }

  function renderPastAttempts(attempts, solution) {
    const board = document.getElementById("driverdle-board");
    attempts.forEach((guess, i) => {
      const row = board.children[i];
      if (row) renderAttempt(row, normalize(guess), solution);
    });
  }

  function renderAttempt(row, guess, solution) {
    const solutionArr = solution.split("");
    const guessArr = guess.split("");
    const matched = Array(solution.length).fill(false);

    // First pass: greens
    for (let i = 0; i < solution.length; i++) {
      const cell = row.children[i];
      if (cell.dataset.static === "1") continue;
      const letter = guessArr[i];
      cell.textContent = letter;
      if (letter === solutionArr[i]) {
        cell.classList.add("bg-green-500", "dark:bg-green-700", "text-white");
        matched[i] = true;
      }
    }

    // Second pass: yellows and grays
    for (let i = 0; i < solution.length; i++) {
      const cell = row.children[i];
      if (cell.dataset.static === "1" || cell.classList.contains("bg-green-500")) continue;
      const letter = guessArr[i];
      let found = false;
      for (let j = 0; j < solution.length; j++) {
        if (!matched[j] && letter === solutionArr[j]) {
          matched[j] = true;
          found = true;
          break;
        }
      }
      if (found) {
        cell.textContent = letter;
        cell.classList.add("bg-yellow-400", "dark:bg-yellow-600", "text-white");
      } else {
        cell.textContent = letter;
        cell.classList.add("bg-gray-500", "text-white");
      }
    }
  }

  async function handleGuess(e) {
    e.preventDefault();
    const input = document.getElementById("guess-input");
    const guessRaw = input.value.trim();
    const guess = normalize(guessRaw);
    const expectedLength = parseInt(document.getElementById("driverdle-board").dataset.length);

    if (guess.length !== expectedLength) {
      alert(`The name must contain exactly ${expectedLength} letters.`);
      return;
    }

    const valid = await validateGuess(guessRaw);
    console.log("Validation result:", valid);
    if (!valid) {
      alert("Ce pilote est inconnu ou invalide.");
      return;
    }

    attempts.push(guessRaw);
    localStorage.setItem(storageKey, JSON.stringify(attempts));
    const row = document.getElementById("driverdle-board").children[attempts.length - 1];
    renderAttempt(row, guess, normalize(solution.lastname));

    if (guess === normalize(solution.lastname)) {
      showEndMessage(true);
    } else if (attempts.length >= maxAttempts) {
      showEndMessage(false);
    }

    input.value = "";
  }

  function showEndMessage(won) {
    const resultBox = document.getElementById("driverdle-result");
    resultBox.classList.remove("hidden");

    const id = (solution.raw || `${solution.firstname}_${solution.lastname}`)
      .toLowerCase()
      .replace(/[\s\-'.]/g, "_");

    const link = `/driver.html?id=${id}`;

    if (won) {
      resultBox.innerHTML = `🎉 Congratulations! It was ${solution.firstname} ${solution.lastname}. <a href="${link}" class="underline text-blue-600 dark:text-blue-400" target="_blank">View profile</a>`;
    } else {
      resultBox.innerHTML = `❌ Missed! It was ${solution.firstname} ${solution.lastname}. <a href="${link}" class="underline text-blue-600 dark:text-blue-400" target="_blank">View profile</a>`;
    }
  }

  async function fetchDriverOfToday() {
    const res = await fetch("/assets/php/games/driverdle/getDriverOfToday.php");
    return await res.json();
  }

  async function validateGuess(guess) {
    const res = await fetch("/assets/php/games/driverdle/validateGuess.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guess }),
    });
    const json = await res.json();
    return json.success === true;
  }

  init();
});
