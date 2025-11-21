document.addEventListener("DOMContentLoaded", () => {
  const maxAttempts = 5;
  const storageKey = "driverdle_attempts";
  const solutionKey = "driverdle_solution";
  const keyboardStateKey = "driverdle_keyboard";
  const today = new Date().toISOString().slice(0, 10);
  let solution = null;
  let attempts = [];
  let currentInput = [];
  let currentAttempt = 0;
  let keyboardState = {};

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
      localStorage.setItem(keyboardStateKey, JSON.stringify({}));
      attempts = [];
      keyboardState = {};
    } else {
      solution = saved;
      attempts = JSON.parse(localStorage.getItem(storageKey)) || [];
      keyboardState = JSON.parse(localStorage.getItem(keyboardStateKey)) || {};
      currentAttempt = attempts.length;
    }

    const normalizedLastName = normalize(solution.lastname);
    const board = document.getElementById("driverdle-board");
    board.innerHTML = "";
    board.dataset.length = normalizedLastName.length;
    drawGrid(board, normalizedLastName, maxAttempts);
    renderPastAttempts(attempts, normalizedLastName);
    updateKeyboardColors();

    // Setup form and keyboard
    document.getElementById("guess-form").onsubmit = handleSubmit;
    setupVirtualKeyboard();

    if (attempts.length >= maxAttempts) {
      showEndMessage(false);
      disableInput();
    } else if (attempts.some(a => normalize(a) === normalize(solution.lastname))) {
      showEndMessage(true);
      disableInput();
    }
  }

  function drawGrid(container, normalized, rows) {
    for (let i = 0; i < rows; i++) {
      const row = document.createElement("div");
      row.className = "flex justify-center space-x-1 my-1";
      for (let j = 0; j < normalized.length; j++) {
        const char = normalized[j];
        const cell = document.createElement("div");
        cell.className = "w-10 h-10 sm:w-12 sm:h-12 border-2 border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-800 text-lg sm:text-2xl font-bold flex items-center justify-center uppercase rounded shadow transition-all";
        cell.dataset.col = j;
        
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
      if (row) renderAttempt(row, normalize(guess), solution, false);
    });
  }

  function renderAttempt(row, guess, solution, animate = true) {
    const solutionArr = solution.split("");
    const guessArr = guess.split("");
    const matched = Array(solution.length).fill(false);
    const letterStates = {};

    // First pass: greens (correct position)
    for (let i = 0; i < solution.length; i++) {
      const cell = row.children[i];
      if (cell.dataset.static === "1") continue;
      const letter = guessArr[i];
      
      if (letter === solutionArr[i]) {
        matched[i] = true;
        letterStates[letter] = 'correct';
        
        if (animate) {
          setTimeout(() => {
            cell.textContent = letter;
            cell.classList.add("bg-green-500", "dark:bg-green-700", "text-gray-700", "dark:text-gray-100", "border-gray-500", "animate-flip");
            cell.classList.remove("bg-white");
          }, i * 100);
        } else {
          cell.textContent = letter;
          cell.classList.add("bg-green-500", "dark:bg-green-700", "text-gray-700", "dark:text-gray-100", "border-gray-500");
          cell.classList.remove("bg-white");
        }
      }
    }

    // Second pass: yellows (present but wrong position) and grays (absent)
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
      
      if (animate) {
        setTimeout(() => {
          cell.textContent = letter;
          if (found) {
            cell.classList.add("bg-yellow-400", "dark:bg-yellow-600", "text-white", "border-yellow-400", "animate-flip");
            if (letterStates[letter] !== 'correct') {
              letterStates[letter] = 'present';
            }
          } else {
            cell.classList.add("bg-gray-500", "text-white", "border-gray-500", "animate-flip");
            if (!letterStates[letter]) {
              letterStates[letter] = 'absent';
            }
          }
        }, i * 100);
      } else {
        cell.textContent = letter;
        if (found) {
          cell.classList.add("bg-yellow-400", "dark:bg-yellow-600", "text-gray-700", "dark:text-gray-100", "border-gray-500");
          if (letterStates[letter] !== 'correct') {
            letterStates[letter] = 'present';
          }
        } else {
          cell.classList.add("bg-gray-500", "text-gray-700", "dark:text-gray-100", "border-gray-500");
          if (!letterStates[letter]) {
            letterStates[letter] = 'absent';
          }
        }
      }
    }

    // Update keyboard state
    Object.keys(letterStates).forEach(letter => {
      if (!keyboardState[letter] || 
          (keyboardState[letter] === 'absent' && letterStates[letter] !== 'absent') ||
          (keyboardState[letter] === 'present' && letterStates[letter] === 'correct')) {
        keyboardState[letter] = letterStates[letter];
      }
    });

    if (animate) {
      setTimeout(() => {
        updateKeyboardColors();
        localStorage.setItem(keyboardStateKey, JSON.stringify(keyboardState));
      }, solution.length * 100 + 100);
    }
  }

  function setupVirtualKeyboard() {
    const keyboard = document.getElementById("virtual-keyboard");
    const keys = keyboard.querySelectorAll(".key");

    keys.forEach(key => {
      key.addEventListener("click", () => {
        const keyValue = key.dataset.key;
        handleKeyPress(keyValue);
      });
    });

    // Also handle physical keyboard
    document.addEventListener("keydown", (e) => {
      if (currentAttempt >= maxAttempts) return;
      
      const key = e.key.toUpperCase();
      if (/^[A-Z]$/.test(key)) {
        handleKeyPress(key);
      } else if (key === "BACKSPACE") {
        handleKeyPress("BACKSPACE");
      } else if (key === "ENTER") {
        handleKeyPress("ENTER");
      }
    });
  }

  function handleKeyPress(key) {
    if (currentAttempt >= maxAttempts) return;

    const board = document.getElementById("driverdle-board");
    const row = board.children[currentAttempt];
    const expectedLength = parseInt(board.dataset.length);
    const normalizedLastName = normalize(solution.lastname);

    if (key === "BACKSPACE") {
      if (currentInput.length > 0) {
        currentInput.pop();
        updateCurrentRow(row, normalizedLastName);
      }
    } else if (key === "ENTER") {
      document.getElementById("guess-form").dispatchEvent(new Event("submit"));
    } else if (/^[A-Z]$/.test(key)) {
      // Count only letter positions (not static characters)
      let letterCount = 0;
      for (let i = 0; i < normalizedLastName.length; i++) {
        if (/[A-Z]/.test(normalizedLastName[i])) letterCount++;
      }

      if (currentInput.length < letterCount) {
        currentInput.push(key);
        updateCurrentRow(row, normalizedLastName);
      }
    }
  }

  function updateCurrentRow(row, normalizedLastName) {
    let inputIndex = 0;
    
    for (let i = 0; i < normalizedLastName.length; i++) {
      const cell = row.children[i];
      if (cell.dataset.static === "1") continue;

      if (inputIndex < currentInput.length) {
        cell.textContent = currentInput[inputIndex];
        cell.classList.add("cell-input");
      } else {
        cell.textContent = "";
        cell.classList.remove("cell-input");
      }
      inputIndex++;
    }

    // Highlight current input cell
    if (inputIndex < row.children.length) {
      const cells = Array.from(row.children).filter(c => c.dataset.static !== "1");
      cells.forEach((cell, idx) => {
        if (idx === currentInput.length) {
          cell.classList.add("cell-input");
        } else {
          cell.classList.remove("cell-input");
        }
      });
    }
  }

  function updateKeyboardColors() {
    Object.keys(keyboardState).forEach(letter => {
      const key = document.querySelector(`.key[data-key="${letter}"]`);
      if (key) {
        key.classList.remove('absent', 'present', 'correct');
        key.classList.add(keyboardState[letter]);
      }
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    const board = document.getElementById("driverdle-board");
    const expectedLength = parseInt(board.dataset.length);
    const normalizedLastName = normalize(solution.lastname);
    
    // Count expected letters (excluding static characters)
    let expectedLetters = 0;
    for (let i = 0; i < normalizedLastName.length; i++) {
      if (/[A-Z]/.test(normalizedLastName[i])) expectedLetters++;
    }

    if (currentInput.length !== expectedLetters) {
      showError(`Please enter all ${expectedLetters} letters`);
      return;
    }

    // Reconstruct the guess with static characters
    let guessArray = [];
    let inputIndex = 0;
    
    for (let i = 0; i < normalizedLastName.length; i++) {
      if (/[A-Z]/.test(normalizedLastName[i])) {
        guessArray.push(currentInput[inputIndex]);
        inputIndex++;
      } else {
        guessArray.push(normalizedLastName[i]);
      }
    }
    
    const guessRaw = guessArray.join("");
    const submitBtn = e.target.querySelector('button[type="submit"]');

    // Disable input during validation
    submitBtn.disabled = true;
    submitBtn.textContent = "Checking...";

    const valid = await validateGuess(guessRaw);
    
    // Re-enable input
    submitBtn.disabled = false;
    submitBtn.textContent = "OK";
    
    if (!valid) {
      showError("This driver is unknown or invalid.");
      return;
    }

    // Add attempt
    attempts.push(guessRaw);
    localStorage.setItem(storageKey, JSON.stringify(attempts));
    
    const row = board.children[currentAttempt];
    renderAttempt(row, normalize(guessRaw), normalize(solution.lastname), true);

    currentAttempt++;
    currentInput = [];

    // Check win/lose conditions
    if (normalize(guessRaw) === normalize(solution.lastname)) {
      setTimeout(() => {
        showEndMessage(true);
        disableInput();
      }, normalizedLastName.length * 100 + 300);
    } else if (currentAttempt >= maxAttempts) {
      setTimeout(() => {
        showEndMessage(false);
        disableInput();
      }, normalizedLastName.length * 100 + 300);
    }
  }

  function showError(message) {
    const errorDiv = document.getElementById("error-message");
    errorDiv.textContent = message;
    errorDiv.classList.remove("hidden");
    errorDiv.classList.add("animate-shake");
    
    setTimeout(() => {
      errorDiv.classList.add("hidden");
      errorDiv.classList.remove("animate-shake");
    }, 2000);
  }

  function showEndMessage(won) {
    const resultBox = document.getElementById("driverdle-result");
    resultBox.classList.remove("hidden");
    resultBox.classList.add("animate-bounce-in");

    const id = (solution.raw || `${solution.firstname}_${solution.lastname}`)
    const link = `/driver.html?id=${id}`;

    if (won) {
      resultBox.innerHTML = `🎉 Congratulations! It was ${solution.firstname} ${solution.lastname}. <a href="${link}" class="underline text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300" target="_blank">View profile</a>`;
    } else {
      resultBox.innerHTML = `❌ Game Over! It was ${solution.firstname} ${solution.lastname}. <a href="${link}" class="underline text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300" target="_blank">View profile</a>`;
    }
  }

  function disableInput() {
    const keys = document.querySelectorAll("#virtual-keyboard .key");
    keys.forEach(key => {
      key.style.opacity = "0.5";
      key.style.cursor = "not-allowed";
      key.onclick = null;
    });
  }

  async function fetchDriverOfToday() {
    const res = await fetch("assets/php/games/driverdle/getDriverOfToday.php");
    return await res.json();
  }

  async function validateGuess(guess) {
    const res = await fetch("assets/php/games/driverdle/validateGuess.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guess }),
    });
    const json = await res.json();
    return json.success === true;
  }

  init();
});
