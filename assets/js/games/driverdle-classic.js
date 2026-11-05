/**
 * DRIVERDLE CLASSIC - Wordle-like: guess the last name of the driver of the day.
 *
 * The tiles show the length of the answer, but a guess may be shorter or
 * longer: any known driver last name is accepted. Letters typed beyond the
 * last tile can only be orange (in the name, elsewhere) or gray.
 *
 * COLORS: green = right place, orange = elsewhere in the name, gray = absent.
 * Keyboard priority: CORRECT > PRESENT > ABSENT, a key never downgrades.
 * Everything runs client-side from the driverdle data (driverdle-data.js).
 */

import { loadDriverdleData, dailyPick, todayUTC, fold, mountDriverBrowser } from './driverdle-data.js';

{
  const MAX_ATTEMPTS = 5;
  const MAX_LETTERS  = 24;
  const STORAGE_KEY  = 'driverdle_classic';
  const STATS_KEY    = 'driverdle_classic_stats';
  const TODAY        = todayUTC();

  const LETTER_STATE = { CORRECT: 'correct', PRESENT: 'present', ABSENT: 'absent', DEFAULT: 'default' };
  const STATE_PRIORITY = { correct: 3, present: 2, absent: 1, default: 0 };
  const STATE_CLASSES = {
    correct: ['bg-green-500', 'dark:bg-green-700', 'text-white', 'border-green-500'],
    present: ['bg-yellow-400', 'dark:bg-yellow-600', 'text-white', 'border-yellow-400'],
    absent:  ['bg-gray-500', 'dark:bg-gray-600', 'text-white', 'border-gray-500'],
  };
  const CELL_BASE = 'border-2 font-bold flex items-center justify-center uppercase rounded shadow transition-all flex-shrink-0';
  const CELL_EMPTY = ['border-gray-400', 'dark:border-gray-600', 'bg-white', 'dark:bg-gray-800'];

  const board = document.getElementById('driverdle-board');

  let solution = null;      // { id, firstname, lastname, pattern, letters }
  let validNames = new Set();
  let attempts = [];        // guesses, letters only ("VERSTAPPEN")
  let currentInput = [];
  let keyboardState = {};
  let finished = false;

  // ==================== STORAGE ====================
  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
  }
  function saveState(patch) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...loadState(), ...patch })); } catch { /* ignore */ }
  }

  // ==================== VERIFICATION ====================
  /**
   * Letter states of a guess against the answer (both letters only, any lengths).
   * Pass 1 marks the exact positions, pass 2 the letters present elsewhere,
   * counting duplicates. A letter beyond the answer length cannot be green.
   */
  function verifyGuess(guess, answer) {
    const result = [];
    const used = Array(answer.length).fill(false);
    for (let i = 0; i < guess.length; i++) {
      if (i < answer.length && guess[i] === answer[i]) {
        result[i] = { letter: guess[i], state: LETTER_STATE.CORRECT };
        used[i] = true;
      } else {
        result[i] = { letter: guess[i], state: null };
      }
    }
    for (let i = 0; i < guess.length; i++) {
      if (result[i].state) continue;
      const j = [...answer].findIndex((ch, k) => !used[k] && ch === guess[i]);
      if (j >= 0) used[j] = true;
      result[i].state = j >= 0 ? LETTER_STATE.PRESENT : LETTER_STATE.ABSENT;
    }
    return result;
  }

  function updateKeyboardState(states) {
    for (const { letter, state } of states) {
      if (STATE_PRIORITY[state] > STATE_PRIORITY[keyboardState[letter] || 'default']) {
        keyboardState[letter] = state;
      }
    }
  }

  function renderKeyboard() {
    document.querySelectorAll('.key[data-key]').forEach((key) => {
      const letter = key.dataset.key;
      if (letter === 'ENTER' || letter === 'BACKSPACE') return;
      const state = keyboardState[letter] || 'default';
      key.classList.remove('correct', 'present', 'absent', 'bg-gray-300', 'bg-gray-400', 'dark:bg-gray-600', 'hover:bg-gray-400', 'dark:hover:bg-gray-500');
      if (state !== 'default') key.classList.add(state);
      else key.classList.add('bg-gray-300', 'dark:bg-gray-600', 'hover:bg-gray-400', 'dark:hover:bg-gray-500');
    });
  }

  // ==================== GRID ====================
  function makeCell(extra = false) {
    const cell = document.createElement('div');
    cell.className = CELL_BASE;
    cell.classList.add(...CELL_EMPTY);
    if (extra) {
      cell.dataset.extra = '1';
      cell.classList.add('border-dashed');
      cell.title = 'Beyond the length of the name: orange or gray only';
    }
    return cell;
  }

  function drawGrid() {
    board.innerHTML = '';
    for (let r = 0; r < MAX_ATTEMPTS; r++) {
      const row = document.createElement('div');
      row.className = 'flex justify-center gap-1 my-1';
      for (const ch of solution.pattern) {
        const cell = makeCell();
        if (!/[A-Z]/.test(ch)) {
          cell.textContent = ch === ' ' ? '' : ch;
          cell.dataset.static = '1';
          cell.classList.remove('bg-white', 'dark:bg-gray-800');
          cell.classList.add('bg-gray-300', 'dark:bg-gray-700', 'text-gray-500');
        }
        row.appendChild(cell);
      }
      board.appendChild(row);
    }
  }

  /** Letter cells of a row (static separators excluded), adding dashed cells if needed. */
  function letterCells(row, count) {
    let cells = [...row.children].filter((c) => c.dataset.static !== '1');
    while (cells.length < count) {
      const cell = makeCell(true);
      row.appendChild(cell);
      cells.push(cell);
    }
    return cells;
  }

  /** Remove the unused dashed cells of a row. */
  function trimExtra(row, count) {
    const cells = [...row.children].filter((c) => c.dataset.static !== '1');
    for (let i = cells.length - 1; i >= Math.max(count, solution.letters.length); i--) cells[i].remove();
  }

  /** Tile size of each row, so that a long guess still fits the board width. */
  function resizeBoard() {
    const gap = 4;
    const avail = (board.clientWidth || 320) - 8;
    for (const row of board.children) {
      const n = Math.max(row.children.length, solution.pattern.length, 1);
      const size = Math.max(16, Math.min(48, Math.floor((avail - gap * (n - 1)) / n)));
      for (const cell of row.children) {
        cell.style.width = cell.style.height = `${size}px`;
        cell.style.fontSize = `${Math.round(size * 0.5)}px`;
      }
    }
  }

  function paintCell(cell, letter, state) {
    cell.textContent = letter;
    cell.classList.remove(...CELL_EMPTY, 'cell-input', 'opacity-40',
      ...STATE_CLASSES.correct, ...STATE_CLASSES.present, ...STATE_CLASSES.absent);
    if (state) cell.classList.add(...STATE_CLASSES[state]);
  }

  function renderGuessInGrid(row, guess, animate) {
    const states = verifyGuess(guess, solution.letters);
    const cells = letterCells(row, guess.length);
    trimExtra(row, guess.length);
    cells.forEach((cell, i) => {
      if (i >= guess.length) {
        // shorter guess: the tiles left are shown as unused
        cell.textContent = '';
        cell.classList.remove('cell-input');
        cell.classList.add('opacity-40');
        return;
      }
      const apply = () => {
        paintCell(cell, states[i].letter, states[i].state);
        if (animate) cell.classList.add('animate-flip');
      };
      animate ? setTimeout(apply, i * 100) : apply();
    });
    updateKeyboardState(states);
    renderKeyboard();
    resizeBoard();
  }

  function updateCurrentRow() {
    const row = board.children[attempts.length];
    if (!row) return;
    const cells = letterCells(row, currentInput.length);
    trimExtra(row, currentInput.length);
    [...row.children].filter((c) => c.dataset.static !== '1').forEach((cell, i) => {
      cell.textContent = currentInput[i] || '';
      cell.classList.toggle('cell-input', i === currentInput.length);
    });
    if (cells.length) resizeBoard();
  }

  // ==================== INPUT ====================
  function handleKeyPress(key) {
    if (finished) return;
    if (key === 'BACKSPACE') {
      if (currentInput.length) { currentInput.pop(); updateCurrentRow(); }
    } else if (key === 'ENTER') {
      submitGuess();
    } else if (/^[A-Z]$/.test(key) && currentInput.length < MAX_LETTERS) {
      currentInput.push(key);
      updateCurrentRow();
    }
  }

  function setupKeyboard() {
    document.querySelectorAll('#virtual-keyboard .key').forEach((key) => {
      key.addEventListener('click', () => handleKeyPress(key.dataset.key));
    });
    document.addEventListener('keydown', (e) => {
      // typing in the driver list filter must not play
      if (e.target.closest?.('input, textarea, select') || e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toUpperCase();
      if (/^[A-Z]$/.test(key) || key === 'BACKSPACE' || key === 'ENTER') {
        e.preventDefault();
        handleKeyPress(key);
      }
    });
    document.getElementById('guess-form').addEventListener('submit', (e) => {
      e.preventDefault();
      submitGuess();
    });
  }

  function submitGuess() {
    if (finished) return;
    const guess = currentInput.join('');
    if (guess.length < 2) {
      showError('Type a driver last name');
      return;
    }
    if (!validNames.has(guess)) {
      showError('This is not the last name of a known driver.');
      return;
    }
    const row = board.children[attempts.length];
    attempts.push(guess);
    currentInput = [];
    saveState({ attempts });
    renderGuessInGrid(row, guess, true);

    const delay = guess.length * 100 + 300;
    if (guess === solution.letters) {
      finish(true, delay);
    } else if (attempts.length >= MAX_ATTEMPTS) {
      finish(false, delay);
    } else {
      updateCurrentRow();
    }
  }

  function finish(won, delay = 0) {
    finished = true;
    const st = loadState();
    if (!st.counted) {
      incrementStats(won);
      saveState({ counted: true });
    }
    setTimeout(() => { showEndMessage(won); disableInput(); }, delay);
  }

  // ==================== UI ====================
  function showError(message) {
    const el = document.getElementById('error-message');
    el.textContent = message;
    el.classList.remove('hidden');
    el.classList.add('animate-shake');
    clearTimeout(showError.timer);
    showError.timer = setTimeout(() => { el.classList.add('hidden'); el.classList.remove('animate-shake'); }, 2000);
  }

  function showEndMessage(won) {
    const box = document.getElementById('driverdle-result');
    box.classList.remove('hidden');
    box.classList.add('animate-bounce-in');
    box.textContent = '';
    const name = `${solution.firstname} ${solution.lastname}`;
    const prefix = won ? '🎉 Congratulations! It was ' : `${loadState().gaveUp ? '🏳️ You gave up.' : '❌ Game Over!'} It was `;
    const link = document.createElement('a');
    link.href = `/driver?id=${encodeURIComponent(solution.id)}`;
    link.target = '_blank';
    link.className = 'underline text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300';
    link.textContent = 'View profile';
    box.append(`${prefix}${name}. `, link);
  }

  function disableInput() {
    document.getElementById('give-up-btn')?.remove();
    document.querySelectorAll('#virtual-keyboard .key').forEach((key) => {
      key.style.opacity = '0.5';
      key.style.cursor = 'not-allowed';
    });
    const submit = document.querySelector('#guess-form button[type="submit"]');
    if (submit) submit.disabled = true;
  }

  function setupGiveUp() {
    const form = document.getElementById('guess-form');
    if (!form || document.getElementById('give-up-btn')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'give-up-btn';
    btn.textContent = 'Give up';
    btn.className = 'mt-3 px-4 py-2 text-sm font-medium rounded-lg border border-red-300 text-red-700 ' +
      'hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/30 transition-colors';
    btn.addEventListener('click', () => {
      if (!confirm("Give up and reveal today's driver?")) return;
      saveState({ gaveUp: true });
      finish(false);
    });
    form.after(btn);
  }

  function showLoader(on) {
    const el = document.getElementById('driverdle-loader');
    if (el) el.style.opacity = on ? '1' : '0';
  }

  // ==================== STATS ====================
  function readStats() {
    try { return JSON.parse(localStorage.getItem(STATS_KEY)) || { played: 0, wins: 0, streak: 0, lastWon: '' }; }
    catch { return { played: 0, wins: 0, streak: 0, lastWon: '' }; }
  }
  function renderStats(stats = readStats()) {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('played-count', stats.played);
    set('win-count', stats.wins);
    set('streak-count', stats.streak);
  }
  function incrementStats(won) {
    const stats = readStats();
    stats.played++;
    if (won) {
      stats.wins++;
      const prev = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      stats.streak = stats.lastWon === prev ? stats.streak + 1 : 1;
      stats.lastWon = TODAY;
    } else {
      stats.streak = 0;
    }
    try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch { /* ignore */ }
    renderStats(stats);
  }

  // ==================== INIT ====================
  async function init() {
    renderStats();
    showLoader(true);
    let data;
    try {
      data = await loadDriverdleData();
    } catch {
      showLoader(false);
      showError("Unable to load today's driver");
      return;
    }
    showLoader(false);

    // drivers still racing (last season this year or last year)
    const minYear = new Date().getUTCFullYear() - 1;
    const pool = data.classic.filter((d) => d[4] >= minYear);
    const pick = dailyPick(pool, '');
    if (!pick) { showError("Unable to load today's driver"); return; }
    const [id, firstname, lastname, pattern] = pick;
    solution = { id, firstname, lastname, pattern, letters: pattern.replace(/[^A-Z]/g, '') };
    validNames = new Set(data.names);

    let state = loadState();
    if (state.date !== TODAY) {
      state = { date: TODAY, attempts: [] };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
    }
    // older saves kept the separators ("DE VRIES"): letters only now
    attempts = (state.attempts || []).map((a) => String(a).toUpperCase().replace(/[^A-Z]/g, '')).filter(Boolean).slice(0, MAX_ATTEMPTS);
    keyboardState = {};

    drawGrid();
    attempts.forEach((guess, i) => renderGuessInGrid(board.children[i], guess, false));
    setupKeyboard();
    renderKeyboard();
    resizeBoard();
    window.addEventListener('resize', resizeBoard);

    mountDriverBrowser(document.getElementById('driver-browser'), pool.map(([pid, f, l, p, lastYear]) => {
      const letters = p.replace(/[^A-Z]/g, '');
      return {
        id: pid, label: `${f} ${l}`, letters,
        sortKey: fold(`${l} ${f}`), search: fold(`${f} ${l}`),
        meta: `${letters.length} letters · last season ${lastYear}`,
      };
    }).map((it) => ({ ...it, letters: it.letters.length, value: it.letters })), {
      title: 'Browse the drivers who can be the answer',
      lettersFilter: true,
      onPick: (it) => {
        if (finished) return;
        currentInput = [...it.value].slice(0, MAX_LETTERS);
        updateCurrentRow();
      },
    });

    if (state.gaveUp || attempts.length >= MAX_ATTEMPTS || attempts.includes(solution.letters)) {
      finished = true;
      showEndMessage(attempts.includes(solution.letters));
      disableInput();
    } else {
      setupGiveUp();
      updateCurrentRow();
    }
  }

  init();
}
