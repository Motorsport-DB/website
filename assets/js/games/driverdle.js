/**
 * DRIVERDLE GAME - v3.0.8
 * Daily driver name guessing game with Wordle-like mechanics
 * 
 * COLOR PRIORITY SYSTEM:
 * - CORRECT (green): Letter in correct position
 * - PRESENT (orange): Letter exists but wrong position  
 * - ABSENT (gray): Letter not in solution
 * - DEFAULT: Not yet guessed
 * 
 * Priority: CORRECT > PRESENT > ABSENT > DEFAULT
 * Once a letter reaches a priority level, it NEVER downgrades
 */

document.addEventListener("DOMContentLoaded", () => {
<<<<<<< HEAD
  // ==================== CONSTANTS ====================
  const MAX_ATTEMPTS = 5;
  const STORAGE_KEYS = {
    attempts: "driverdle_attempts",
    solution: "driverdle_solution",
    keyboard: "driverdle_keyboard"
  };
  const TODAY = new Date().toISOString().slice(0, 10);
  
  const LETTER_STATE = {
    CORRECT: 'correct',   // Green - exact match
    PRESENT: 'present',   // Orange - exists elsewhere
    ABSENT: 'absent',     // Gray - not in word
    DEFAULT: 'default'    // Not yet guessed
  };
  
  const STATE_PRIORITY = {
    [LETTER_STATE.CORRECT]: 3,
    [LETTER_STATE.PRESENT]: 2,
    [LETTER_STATE.ABSENT]: 1,
    [LETTER_STATE.DEFAULT]: 0
  };

  // ==================== STATE VARIABLES ====================
=======
  const maxAttempts = 5;
  const storageKey = "driverdle_attempts";
  const solutionKey = "driverdle_solution";
  const keyboardStateKey = "driverdle_keyboard";
  const today = new Date().toISOString().slice(0, 10);
>>>>>>> origin/main
  let solution = null;
  let attempts = [];
  let currentInput = [];
  let currentAttempt = 0;
<<<<<<< HEAD
  let keyboardState = {}; // { letter: 'correct' | 'present' | 'absent' }
=======
  let keyboardState = {};
>>>>>>> origin/main

  // ==================== UTILITY FUNCTIONS ====================
  
  /**
   * Normalize string: remove accents and uppercase
   */
  /**
   * Normalize string: remove accents and uppercase
   */
  function normalize(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  }

  /**
   * CORE VERIFICATION FUNCTION
   * Analyzes a guess against the solution and returns letter states
   * 
   * @param {string} guess - The user's guess (normalized)
   * @param {string} solution - The correct answer (normalized)
   * @returns {Array<{letter: string, state: string}>} - State for each position
   * 
   * ALGORITHM:
   * 1. First pass: Mark all CORRECT (exact position match)
   * 2. Second pass: Mark PRESENT (exists elsewhere) or ABSENT
   * 3. Handle duplicates: Only mark as many oranges as available letters
   */
  function verifyGuess(guess, solution) {
    const guessArr = guess.split("");
    const solutionArr = solution.split("");
    const result = [];
    const solutionUsed = Array(solution.length).fill(false);
    
    console.log(`🔍 Verifying: "${guess}" vs "${solution}"`);
    
    // PASS 1: Find all CORRECT letters (green)
    for (let i = 0; i < guessArr.length; i++) {
      if (guessArr[i] === solutionArr[i]) {
        result[i] = { letter: guessArr[i], state: LETTER_STATE.CORRECT };
        solutionUsed[i] = true;
        console.log(`  ✅ Position ${i}: "${guessArr[i]}" CORRECT`);
      } else {
        result[i] = { letter: guessArr[i], state: null }; // Placeholder
      }
    }
    
    // PASS 2: Find PRESENT (orange) and ABSENT (gray)
    for (let i = 0; i < guessArr.length; i++) {
      if (result[i].state === LETTER_STATE.CORRECT) continue; // Skip already correct
      
      const letter = guessArr[i];
      let foundElsewhere = false;
      
      // Search for unused occurrence of this letter in solution
      for (let j = 0; j < solutionArr.length; j++) {
        if (!solutionUsed[j] && letter === solutionArr[j]) {
          solutionUsed[j] = true;
          foundElsewhere = true;
          console.log(`  🟡 Position ${i}: "${letter}" PRESENT (found at ${j})`);
          break;
        }
      }
      
      result[i].state = foundElsewhere ? LETTER_STATE.PRESENT : LETTER_STATE.ABSENT;
      if (!foundElsewhere) {
        console.log(`  ⚫ Position ${i}: "${letter}" ABSENT`);
      }
    }
    
    return result;
  }

  /**
   * Update keyboard state with priority system
   * CORRECT > PRESENT > ABSENT > DEFAULT
   * 
   * @param {Array<{letter, state}>} letterStates - Results from verifyGuess
   */
  function updateKeyboardState(letterStates) {
    letterStates.forEach(({ letter, state }) => {
      const currentState = keyboardState[letter] || LETTER_STATE.DEFAULT;
      const currentPriority = STATE_PRIORITY[currentState];
      const newPriority = STATE_PRIORITY[state];
      
      // Only upgrade, never downgrade
      if (newPriority > currentPriority) {
        console.log(`  🎹 Keyboard "${letter}": ${currentState} → ${state}`);
        keyboardState[letter] = state;
      } else {
        console.log(`  🎹 Keyboard "${letter}": keeping ${currentState} (not ${state})`);
      }
    });
  }

  /**
   * Render keyboard colors based on current state
   */
  function renderKeyboard() {
    console.log("🎨 Rendering keyboard with state:", keyboardState);
    
    const allKeys = document.querySelectorAll('.key[data-key]');
    
    allKeys.forEach(key => {
      const letter = key.dataset.key;
      
      // Skip special keys
      if (letter === 'ENTER' || letter === 'BACKSPACE') return;
      
      const state = keyboardState[letter] || LETTER_STATE.DEFAULT;
      
      // Remove all state classes
      key.classList.remove('correct', 'present', 'absent');
      
      // Remove default Tailwind classes
      key.classList.remove(
        'bg-gray-300', 'bg-gray-400', 'dark:bg-gray-600', 
        'hover:bg-gray-400', 'dark:hover:bg-gray-500'
      );
      
      if (state !== LETTER_STATE.DEFAULT) {
        // Add state class (CSS handles colors with !important)
        key.classList.add(state);
      } else {
        // Restore default styling
        key.classList.add('bg-gray-300', 'dark:bg-gray-600', 'hover:bg-gray-400', 'dark:hover:bg-gray-500');
      }
    });
    
    console.log("✅ Keyboard rendered");
  }

  /**
   * Render a guess in the grid
   * 
   * @param {HTMLElement} row - The row element
   * @param {string} guess - The guess (normalized)
   * @param {string} solution - The solution (normalized)
   * @param {boolean} animate - Whether to animate
   */
  function renderGuessInGrid(row, guess, solution, animate = false) {
    const letterStates = verifyGuess(guess, solution);
    
    console.log(`🎨 Rendering grid for "${guess}":`, letterStates);
    
    let guessIdx = 0;
    for (let i = 0; i < row.children.length; i++) {
      const cell = row.children[i];
      
      // Skip static cells (spaces, hyphens)
      if (cell.dataset.static === "1") continue;
      
      const { letter, state } = letterStates[guessIdx];
      
      const applyStyle = () => {
        cell.textContent = letter;
        
        // Remove old classes
        cell.classList.remove(
          'bg-white', 'dark:bg-gray-800',
          'bg-green-500', 'dark:bg-green-700', 'border-green-500',
          'bg-yellow-400', 'dark:bg-yellow-600', 'border-yellow-400',
          'bg-gray-500', 'dark:bg-gray-600', 'border-gray-500'
        );
        
        // Apply new style based on state
        if (state === LETTER_STATE.CORRECT) {
          cell.classList.add('bg-green-500', 'dark:bg-green-700', 'text-white', 'border-green-500');
        } else if (state === LETTER_STATE.PRESENT) {
          cell.classList.add('bg-yellow-400', 'dark:bg-yellow-600', 'text-white', 'border-yellow-400');
        } else if (state === LETTER_STATE.ABSENT) {
          cell.classList.add('bg-gray-500', 'dark:bg-gray-600', 'text-white', 'border-gray-500');
        }
        
        if (animate) {
          cell.classList.add('animate-flip');
        }
      };
      
      if (animate) {
        setTimeout(applyStyle, i * 100);
      } else {
        applyStyle();
      }
      
      guessIdx++;
    }
    
    // Update keyboard state after rendering grid
    updateKeyboardState(letterStates);
    renderKeyboard();
    
    // Save keyboard state
    localStorage.setItem(STORAGE_KEYS.keyboard, JSON.stringify(keyboardState));
  }

  // ==================== INITIALIZATION ====================
  
  /**
   * Initialize the game
   * - Load or fetch solution
   * - Load previous attempts
   * - Render grid and past attempts
   * - Setup keyboard
   */
  async function init() {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.solution));
    
    if (!saved || saved.date !== TODAY) {
      // New day - fetch new solution
      solution = await fetchDriverOfToday();
<<<<<<< HEAD
      if (!solution || !solution.lastname) {
        showError("Unable to load today's driver");
        return;
      }
      
      // Save new solution
      localStorage.setItem(STORAGE_KEYS.solution, JSON.stringify({ ...solution, date: TODAY }));
      localStorage.setItem(STORAGE_KEYS.attempts, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.keyboard, JSON.stringify({}));
      
      attempts = [];
      keyboardState = {};
      keyboardState = {};
=======
      if (!solution || !solution.lastname) return;
      localStorage.setItem(solutionKey, JSON.stringify({ ...solution, date: today }));
      localStorage.setItem(storageKey, JSON.stringify([]));
      localStorage.setItem(keyboardStateKey, JSON.stringify({}));
      attempts = [];
      keyboardState = {};
>>>>>>> origin/main
    } else {
      // Load existing game state
      solution = saved;
<<<<<<< HEAD
      attempts = JSON.parse(localStorage.getItem(STORAGE_KEYS.attempts)) || [];
      keyboardState = JSON.parse(localStorage.getItem(STORAGE_KEYS.keyboard)) || {};
      currentAttempt = attempts.length;
      
      console.log("📂 Loaded game state:", { attempts, keyboardState });
=======
      attempts = JSON.parse(localStorage.getItem(storageKey)) || [];
      keyboardState = JSON.parse(localStorage.getItem(keyboardStateKey)) || {};
      currentAttempt = attempts.length;
>>>>>>> origin/main
    }

    const normalizedLastName = normalize(solution.lastname);
    const board = document.getElementById("driverdle-board");
    board.innerHTML = "";
    board.dataset.length = normalizedLastName.length;
<<<<<<< HEAD
    
    // Draw empty grid
    drawGrid(board, normalizedLastName, MAX_ATTEMPTS);
    
    // Render past attempts using new architecture
    renderPastAttempts(board, attempts, normalizedLastName);
    
    // Setup virtual keyboard
    setupVirtualKeyboard();
    
    // Setup form
    document.getElementById("guess-form").onsubmit = handleSubmit;
    
    // Check if game is over
    if (attempts.length >= MAX_ATTEMPTS) {
      showEndMessage(false);
      disableInput();
    } else if (attempts.some(a => normalize(a) === normalizedLastName)) {
      showEndMessage(true);
      disableInput();
      disableInput();
=======
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
>>>>>>> origin/main
    }
  }

  /**
   * Draw the empty grid
   */
  function drawGrid(container, normalizedName, rows) {
    for (let i = 0; i < rows; i++) {
      const row = document.createElement("div");
      row.className = "flex justify-center space-x-1 my-1";
      
      for (let j = 0; j < normalizedName.length; j++) {
        const char = normalizedName[j];
        const cell = document.createElement("div");
        cell.className = "w-10 h-10 sm:w-12 sm:h-12 border-2 border-gray-400 dark:border-gray-600 bg-white dark:bg-gray-800 text-lg sm:text-2xl font-bold flex items-center justify-center uppercase rounded shadow transition-all";
        cell.dataset.col = j;
        
<<<<<<< HEAD
        // Mark static cells (non-letters)
=======
>>>>>>> origin/main
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

<<<<<<< HEAD
  /**
   * Render all past attempts using new architecture
   */
  function renderPastAttempts(board, attempts, solution) {
    console.log("🔄 Rendering past attempts:", attempts);
    
    attempts.forEach((guess, index) => {
      const row = board.children[index];
      if (row) {
        renderGuessInGrid(row, normalize(guess), solution, false);
      }
    });
  }

  // ==================== KEYBOARD SETUP ====================
  
  function setupVirtualKeyboard() {
    const keyboard = document.getElementById("virtual-keyboard");
    if (!keyboard) {
      console.error("❌ Virtual keyboard element not found!");
      return;
=======
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
>>>>>>> origin/main
    }
    console.log("✅ Virtual keyboard found, setting up...");
    
    const keys = keyboard.querySelectorAll(".key");
    console.log(`✅ Found ${keys.length} keyboard keys`);

<<<<<<< HEAD
    keys.forEach(key => {
      key.addEventListener("click", () => {
        const keyValue = key.dataset.key;
        console.log(`🔤 Virtual key pressed: ${keyValue}`);
        handleKeyPress(keyValue);
      });
    });

    // Also handle physical keyboard
    document.addEventListener("keydown", (e) => {
      if (currentAttempt >= MAX_ATTEMPTS) return;
      
      const key = e.key.toUpperCase();
      if (/^[A-Z]$/.test(key)) {
        console.log(`⌨️  Physical key pressed: ${key}`);
        handleKeyPress(key);
      } else if (key === "BACKSPACE") {
        console.log("⌨️  Backspace pressed");
        handleKeyPress("BACKSPACE");
      } else if (key === "ENTER") {
        console.log("⌨️  Enter pressed");
        handleKeyPress("ENTER");
      }
=======
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
>>>>>>> origin/main
    });
  }

  function handleKeyPress(key) {
<<<<<<< HEAD
    if (currentAttempt >= MAX_ATTEMPTS) return;
=======
    if (currentAttempt >= maxAttempts) return;
>>>>>>> origin/main

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

<<<<<<< HEAD
  // ==================== FORM SUBMISSION ====================
  
=======
  function updateKeyboardColors() {
    Object.keys(keyboardState).forEach(letter => {
      const key = document.querySelector(`.key[data-key="${letter}"]`);
      if (key) {
        key.classList.remove('absent', 'present', 'correct');
        key.classList.add(keyboardState[letter]);
      }
    });
  }

>>>>>>> origin/main
  async function handleSubmit(e) {
    e.preventDefault();
    
    const board = document.getElementById("driverdle-board");
    const expectedLength = parseInt(board.dataset.length);
    const normalizedLastName = normalize(solution.lastname);
    
<<<<<<< HEAD
    console.log("📝 Submit attempt:");
    console.log(`  Solution lastname: ${solution.lastname}`);
    console.log(`  Normalized: ${normalizedLastName}`);
    console.log(`  Current input:`, currentInput);
    console.log(`  Input length: ${currentInput.length}`);
    
    // Count expected letters (excluding static characters like -, ', spaces)
=======
    // Count expected letters (excluding static characters)
>>>>>>> origin/main
    let expectedLetters = 0;
    for (let i = 0; i < normalizedLastName.length; i++) {
      if (/[A-Z]/.test(normalizedLastName[i])) expectedLetters++;
    }
<<<<<<< HEAD
    
    console.log(`  Expected letters: ${expectedLetters}`);

    if (currentInput.length !== expectedLetters) {
      console.warn(`❌ Length mismatch: got ${currentInput.length}, expected ${expectedLetters}`);
=======

    if (currentInput.length !== expectedLetters) {
>>>>>>> origin/main
      showError(`Please enter all ${expectedLetters} letters`);
      return;
    }
    
    console.log("✅ Length validation passed");

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
    
<<<<<<< HEAD
    
    // Re-enable input
    submitBtn.disabled = false;
    submitBtn.textContent = "OK";
    
    if (!valid) {
      showError("This driver is unknown or invalid.");
      showError("This driver is unknown or invalid.");
      return;
    }

    // Add attempt and save
    attempts.push(guessRaw);
    localStorage.setItem(STORAGE_KEYS.attempts, JSON.stringify(attempts));
    
    // Render the guess using new architecture
    const row = board.children[currentAttempt];
    renderGuessInGrid(row, normalize(guessRaw), normalizedLastName, true);
=======
    if (!valid) {
      showError("This driver is unknown or invalid.");
      return;
    }

    // Add attempt
    attempts.push(guessRaw);
    localStorage.setItem(storageKey, JSON.stringify(attempts));
    
    const row = board.children[currentAttempt];
    renderAttempt(row, normalize(guessRaw), normalize(solution.lastname), true);
>>>>>>> origin/main

    currentAttempt++;
    currentInput = [];

    // Check win/lose conditions
<<<<<<< HEAD
    if (normalize(guessRaw) === normalizedLastName) {
=======
    if (normalize(guessRaw) === normalize(solution.lastname)) {
>>>>>>> origin/main
      setTimeout(() => {
        showEndMessage(true);
        disableInput();
      }, normalizedLastName.length * 100 + 300);
<<<<<<< HEAD
    } else if (currentAttempt >= MAX_ATTEMPTS) {
=======
    } else if (currentAttempt >= maxAttempts) {
>>>>>>> origin/main
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
<<<<<<< HEAD
    resultBox.classList.add("animate-bounce-in");

    const id = (solution.raw || `${solution.firstname}_${solution.lastname}`)
    const link = `/driver?id=${id}`;

    if (won) {
      resultBox.innerHTML = `🎉 Congratulations! It was ${solution.firstname} ${solution.lastname}. <a href="${link}" class="underline text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300" target="_blank">View profile</a>`;
      resultBox.innerHTML = `🎉 Congratulations! It was ${solution.firstname} ${solution.lastname}. <a href="${link}" class="underline text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300" target="_blank">View profile</a>`;
    } else {
      resultBox.innerHTML = `❌ Game Over! It was ${solution.firstname} ${solution.lastname}. <a href="${link}" class="underline text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300" target="_blank">View profile</a>`;
      resultBox.innerHTML = `❌ Game Over! It was ${solution.firstname} ${solution.lastname}. <a href="${link}" class="underline text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300" target="_blank">View profile</a>`;
=======

    const id = (solution.raw || `${solution.firstname}_${solution.lastname}`)
    const link = `/driver.html?id=${id}`;

    if (won) {
      resultBox.innerHTML = `🎉 Congratulations! It was ${solution.firstname} ${solution.lastname}. <a href="${link}" class="underline text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300" target="_blank">View profile</a>`;
    } else {
      resultBox.innerHTML = `❌ Game Over! It was ${solution.firstname} ${solution.lastname}. <a href="${link}" class="underline text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300" target="_blank">View profile</a>`;
>>>>>>> origin/main
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

<<<<<<< HEAD
  function disableInput() {
    const keys = document.querySelectorAll("#virtual-keyboard .key");
    keys.forEach(key => {
      key.style.opacity = "0.5";
      key.style.cursor = "not-allowed";
      key.onclick = null;
    });
  }

=======
>>>>>>> origin/main
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
