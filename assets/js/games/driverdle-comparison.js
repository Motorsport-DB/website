/**
 * DRIVERDLE COMPARISON GAME
 * Mode is set by data-mode="f1" or data-mode="all" on <div id="comparison-game">.
 */

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('comparison-game');
  const mode = container?.dataset.mode || 'f1';

  const ENDPOINTS = {
    f1: {
      today:   '/assets/php/games/driverdle/getDriverOfTodayF1.php',
      search:  '/assets/php/games/driverdle/searchDriversF1.php',
      compare: '/assets/php/games/driverdle/compareDriverF1.php',
    },
    all: {
      today:   '/assets/php/games/driverdle/getDriverOfTodayAll.php',
      search:  '/assets/php/games/driverdle/searchDriversAll.php',
      compare: '/assets/php/games/driverdle/compareDriverAll.php',
    },
  };

  const ep          = ENDPOINTS[mode];
  const TODAY       = new Date().toISOString().slice(0, 10);
  const STORAGE_KEY = `driverdle_comparison_${mode}`;
  const COOLDOWN_MS = 500; // min ms between submissions

  // State
  let guesses       = [];
  let won           = false;
  let targetName    = '';
  let targetId      = '';
  let isSubmitting  = false;
  let lastSubmitAt  = 0;

  const COLUMNS_F1 = [
    { key: 'firstF1Year',    label: '1st F1 Year',  type: 'number' },
    { key: 'lastF1Year',     label: 'Last F1 Year', type: 'number' },
    { key: 'teams',          label: 'Teams',         type: 'list'   },
    { key: 'f1Wins',         label: 'F1 Wins',       type: 'number' },
    { key: 'age',            label: 'Age',           type: 'number' },
    { key: 'lastnameLength', label: 'Name Length',   type: 'number' },
    { key: 'otherChamps',    label: 'Other Series',  type: 'list'   },
  ];

  const COLUMNS_ALL = [
    { key: 'firstYear',      label: '1st Year',     type: 'number' },
    { key: 'lastYear',       label: 'Last Year',    type: 'number' },
    { key: 'series',         label: 'Series',        type: 'list'   },
    { key: 'wins',           label: 'Wins',          type: 'number' },
    { key: 'age',            label: 'Age',           type: 'number' },
    { key: 'lastnameLength', label: 'Name Length',   type: 'number' },
  ];

  const COLUMNS = mode === 'f1' ? COLUMNS_F1 : COLUMNS_ALL;

  // DOM refs
  const searchInput  = document.getElementById('driver-search');
  const dropdown     = document.getElementById('search-dropdown');
  const guessesTable = document.getElementById('guesses-table');
  const guessesBody  = document.getElementById('guesses-body');
  const headerRow    = document.getElementById('header-row');
  const winBanner    = document.getElementById('win-banner');
  const guessCount   = document.getElementById('guess-count');
  const errorMsg     = document.getElementById('error-msg');
  const statsPlayed  = document.getElementById('stats-played');
  const statsWins    = document.getElementById('stats-wins');
  const statsStreak  = document.getElementById('stats-streak');

  // ── Init ─────────────────────────────────────────────────────────────────────
  async function init() {
    renderHeaders();
    loadStats();

    try {
      const res  = await fetch(ep.today);
      const data = await res.json();
      if (data.error) { showError(data.error); return; }
      targetName = data.name;
      targetId   = data.id ?? '';
    } catch {
      showError("Could not load today's driver. Please refresh.");
      return;
    }

    const saved = loadSavedGuesses();
    guesses  = saved.guesses;
    won      = saved.won;
    targetId = saved.targetId || targetId;

    // Persist targetId so it's available in localStorage for inspection
    saveGuesses();

    for (const g of guesses) renderGuessRow(g);

    if (won) showWinBanner();

    setupSearch();
    updateGuessCount();
  }

  // ── Table headers ─────────────────────────────────────────────────────────────
  function renderHeaders() {
    headerRow.innerHTML = '';

    // Photo column
    const photoTh = document.createElement('th');
    photoTh.className = 'px-2 py-2 w-12';
    headerRow.appendChild(photoTh);

    // Driver name column
    const nameTh = document.createElement('th');
    nameTh.className = 'px-3 py-2 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide min-w-[110px]';
    nameTh.textContent = 'Driver';
    headerRow.appendChild(nameTh);

    for (const col of COLUMNS) {
      const th = document.createElement('th');
      th.className = 'px-2 py-2 text-center text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide min-w-[80px]';
      th.textContent = col.label;
      headerRow.appendChild(th);
    }
  }

  // ── Search / autocomplete ─────────────────────────────────────────────────────
  function setupSearch() {
    let debounceTimer;

    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimer);
      const q = searchInput.value.trim();
      if (q.length < 2) { hideDropdown(); return; }
      debounceTimer = setTimeout(() => fetchSuggestions(q), 250);
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideDropdown();
      if (e.key === 'ArrowDown') {
        const first = dropdown.querySelector('.suggestion');
        if (first) { first.focus(); e.preventDefault(); }
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#search-container')) hideDropdown();
    });
  }

  async function fetchSuggestions(q) {
    try {
      const res  = await fetch(`${ep.search}?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      renderDropdown(data);
    } catch {
      hideDropdown();
    }
  }

  function renderDropdown(items) {
    dropdown.innerHTML = '';

    // Filter out already-guessed drivers
    const guessedIds = new Set(guesses.map(g => g.guessStats.id));
    const available  = items.filter(item => !guessedIds.has(item.id));

    if (!available.length) { hideDropdown(); return; }

    for (const item of available) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'suggestion w-full text-left px-4 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-700 focus:bg-blue-50 dark:focus:bg-gray-700 focus:outline-none transition-colors flex items-center gap-2';
      btn.dataset.id = item.id;

      // Small thumbnail in dropdown
      const thumb = driverPhotoEl(item.id, 'w-6 h-6 rounded-full object-cover flex-shrink-0');
      btn.appendChild(thumb);
      btn.append(item.name);

      btn.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') { (btn.nextElementSibling || btn).focus(); e.preventDefault(); }
        if (e.key === 'ArrowUp')   { (btn.previousElementSibling || btn).focus(); e.preventDefault(); }
        if (e.key === 'Enter')     { selectDriver(item.id, item.name); }
        if (e.key === 'Escape')    { hideDropdown(); searchInput.focus(); }
      });

      btn.addEventListener('click', () => selectDriver(item.id, item.name));
      dropdown.appendChild(btn);
    }

    dropdown.classList.remove('hidden');
  }

  function hideDropdown() {
    dropdown.classList.add('hidden');
  }

  // ── Driver photo helper ───────────────────────────────────────────────────────
  function driverPhotoEl(id, extraClass = '') {
    const img = document.createElement('img');
    img.alt   = '';
    img.className = `${extraClass} bg-gray-200 dark:bg-gray-700`;
    img.src   = `/drivers/picture/${id}.jpg`;

    img.onerror = function () {
      if (!this.dataset.triedPng) {
        this.dataset.triedPng = '1';
        this.src = `/drivers/picture/${id}.png`;
      } else {
        this.onerror = null;
        this.src = '/drivers/picture/default.png';
      }
    };

    return img;
  }

  // ── Submit a guess ────────────────────────────────────────────────────────────
  async function selectDriver(id, name) {
    hideDropdown();
    searchInput.value = '';
    if (won) return;

    // Already guessed
    if (guesses.some(g => g.guessStats.id === id)) {
      showError('Already guessed this driver!');
      return;
    }

    // Rate limit
    const now = Date.now();
    if (isSubmitting || now - lastSubmitAt < COOLDOWN_MS) {
      showError('Please wait a moment before guessing again.');
      return;
    }

    isSubmitting = true;
    lastSubmitAt = now;
    searchInput.disabled = true;
    clearError();

    try {
      const res = await fetch(ep.compare, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ guess: id }),
      });

      if (res.status === 404) { showError('Driver not found.'); return; }
      if (res.status === 422) { showError('This driver never started an F1 Race (qualifying only).'); return; }
      if (!res.ok)            { showError('Server error, please try again.'); return; }

      const data = await res.json();
      if (data.error) { showError(data.error); return; }

      guesses.push(data);
      won = data.won;

      renderGuessRow(data);
      saveGuesses();
      updateGuessCount();

      if (data.won) {
        incrementStats(true);
        showWinBanner();
      }
    } catch {
      showError('Network error. Please try again.');
    } finally {
      isSubmitting = false;
      if (!won) searchInput.disabled = false;
      searchInput.focus();
    }
  }

  // ── Render a guess row ────────────────────────────────────────────────────────
  function renderGuessRow(data) {
    const { guessStats, comparison } = data;
    const tr = document.createElement('tr');
    tr.className = 'border-t border-gray-200 dark:border-gray-700';

    // Photo cell
    const photoTd = document.createElement('td');
    photoTd.className = 'px-2 py-2';
    photoTd.appendChild(driverPhotoEl(guessStats.id, 'w-10 h-10 rounded-full object-cover border border-gray-200 dark:border-gray-600'));
    tr.appendChild(photoTd);

    // Name cell
    const nameTd = document.createElement('td');
    nameTd.className = 'px-3 py-2 text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap';
    nameTd.textContent = `${guessStats.firstname} ${guessStats.lastname}`;
    tr.appendChild(nameTd);

    // Property cells
    for (const col of COLUMNS) {
      const td = document.createElement('td');
      td.className = 'px-2 py-2 text-center';
      td.appendChild(buildCell(col, guessStats[col.key], comparison[col.key]));
      tr.appendChild(td);
    }

    // Newest guess at top
    if (guessesBody.firstChild) {
      guessesBody.insertBefore(tr, guessesBody.firstChild);
    } else {
      guessesBody.appendChild(tr);
    }

    guessesTable.classList.remove('hidden');
  }

  function buildCell(col, value, cmp) {
    const div = document.createElement('div');
    div.className = `inline-flex flex-col items-center justify-center rounded-lg px-2 py-1 min-w-[60px] min-h-[44px] text-white text-sm font-bold ${resultClass(cmp.result)}`;

    if (col.type === 'list') {
      const display = Array.isArray(value) && value.length
        ? value.map(formatSeriesName).join(', ')
        : '—';
      div.innerHTML = `<span class="text-xs leading-tight text-center">${escapeHtml(display)}</span>`;
    } else {
      const arrow = cmp.arrow === 'up' ? ' ↑' : cmp.arrow === 'down' ? ' ↓' : '';
      div.innerHTML = `<span>${value ?? '?'}${arrow}</span>`;
    }

    return div;
  }

  function resultClass(result) {
    switch (result) {
      case 'green':  return 'bg-green-500 dark:bg-green-600';
      case 'orange': return 'bg-orange-400 dark:bg-orange-500';
      default:       return 'bg-red-500 dark:bg-red-600';
    }
  }

  function formatSeriesName(name) {
    return name.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ── Win banner ────────────────────────────────────────────────────────────────
  function showWinBanner() {
    winBanner.classList.remove('hidden');
    guessCount.textContent = guesses.length;
    searchInput.disabled   = true;
    searchInput.placeholder = 'Found it!';
  }

  // ── Error display ─────────────────────────────────────────────────────────────
  function showError(msg) {
    errorMsg.textContent = msg;
    errorMsg.classList.remove('hidden');
    setTimeout(() => clearError(), 3000);
  }

  function clearError() {
    errorMsg.classList.add('hidden');
    errorMsg.textContent = '';
  }

  // ── Guess counter ─────────────────────────────────────────────────────────────
  function updateGuessCount() {
    const el = document.getElementById('current-guess-count');
    if (el) el.textContent = guesses.length;
  }

  // ── Persistence ───────────────────────────────────────────────────────────────
  function saveGuesses() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: TODAY, guesses, won, targetId }));
  }

  function loadSavedGuesses() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { guesses: [], won: false, targetId: '' };
      const parsed = JSON.parse(raw);
      // Stale day → start fresh
      if (parsed.date !== TODAY) return { guesses: [], won: false, targetId: '' };
      return parsed;
    } catch {
      return { guesses: [], won: false, targetId: '' };
    }
  }

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const STATS_KEY = `driverdle_comparison_stats_${mode}`;

  function loadStats() {
    const raw   = localStorage.getItem(STATS_KEY);
    const stats = raw ? JSON.parse(raw) : { played: 0, wins: 0, streak: 0, lastWon: '' };
    if (statsPlayed) statsPlayed.textContent = stats.played;
    if (statsWins)   statsWins.textContent   = stats.wins;
    if (statsStreak) statsStreak.textContent = stats.streak;
    return stats;
  }

  function incrementStats(didWin) {
    const raw   = localStorage.getItem(STATS_KEY);
    const stats = raw ? JSON.parse(raw) : { played: 0, wins: 0, streak: 0, lastWon: '' };
    stats.played++;
    if (didWin) {
      stats.wins++;
      const prevDay = new Date();
      prevDay.setDate(prevDay.getDate() - 1);
      stats.streak = stats.lastWon === prevDay.toISOString().slice(0, 10) ? stats.streak + 1 : 1;
      stats.lastWon = TODAY;
    } else {
      stats.streak = 0;
    }
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    if (statsPlayed) statsPlayed.textContent = stats.played;
    if (statsWins)   statsWins.textContent   = stats.wins;
    if (statsStreak) statsStreak.textContent = stats.streak;
  }

  init();
});
