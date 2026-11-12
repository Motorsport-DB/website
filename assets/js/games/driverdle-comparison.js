/**
 * DRIVERDLE COMPARISON GAME
 * Mode is set by data-mode="f1" or data-mode="all" on <div id="comparison-game">.
 * Everything runs client-side from the driverdle data downloaded once.
 */

import { loadDriverdleData, dailyPick, todayUTC, ageOf, lastnameLength, fold, createDriverPicker, driverThumb } from './driverdle-data.js';

{
  const container = document.getElementById('comparison-game');
  const mode = container?.dataset.mode || 'f1';
  const TODAY       = todayUTC();
  const STORAGE_KEY = `driverdle_comparison_${mode}`;

  // State
  let guesses       = [];
  let won           = false;
  let gaveUp        = null; // revealed target after giving up
  let drivers       = [];   // eligible drivers of the mode (stats objects)
  let byId          = new Map();
  let target        = null;
  let teamNames     = {};
  let pictures      = {};
  let countries     = {};
  let picker        = null;

  const COLUMNS_F1 = [
    { key: 'firstF1Year',    label: '1st F1 Year',  type: 'number' },
    { key: 'lastF1Year',     label: 'Last F1 Year', type: 'number' },
    { key: 'teams',          label: 'Teams',         type: 'list'   },
    { key: 'f1Wins',         label: 'F1 Wins',       type: 'number' },
    { key: 'country',        label: 'Nationality',   type: 'country' },
    { key: 'age',            label: 'Age',           type: 'number' },
    { key: 'lastnameLength', label: 'Name Length',   type: 'number' },
    { key: 'otherChamps',    label: 'Other Series',  type: 'list'   },
  ];

  const COLUMNS_ALL = [
    { key: 'firstYear',      label: '1st Year',     type: 'number' },
    { key: 'lastYear',       label: 'Last Year',    type: 'number' },
    { key: 'series',         label: 'Series',        type: 'list'   },
    { key: 'wins',           label: 'Wins',          type: 'number' },
    { key: 'country',        label: 'Nationality',   type: 'country' },
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

  // ── Data ──────────────────────────────────────────────────────────────────────
  function toStats(row) {
    if (mode === 'f1') {
      const [id, firstname, lastname, dob, dod, firstF1Year, lastF1Year, teams, f1Wins, otherChamps] = row;
      return { id, firstname, lastname, age: ageOf(dob, dod), lastnameLength: lastnameLength(lastname),
        country: countries[id] || '', firstF1Year, lastF1Year, teams, f1Wins, otherChamps };
    }
    const [id, firstname, lastname, dob, dod, firstYear, lastYear, series, wins] = row;
    return { id, firstname, lastname, age: ageOf(dob, dod), lastnameLength: lastnameLength(lastname),
      country: countries[id] || '', firstYear, lastYear, series, wins };
  }

  function compareNumeric(guessVal, targetVal, threshold) {
    if (guessVal === null || guessVal === undefined || targetVal === null || targetVal === undefined) {
      return { result: 'red', arrow: null };
    }
    const diff = Math.abs(guessVal - targetVal);
    return {
      result: diff === 0 ? 'green' : diff <= threshold ? 'orange' : 'red',
      arrow: guessVal === targetVal ? null : targetVal > guessVal ? 'up' : 'down',
    };
  }

  function compareLists(guessList, targetList) {
    const g = [...new Set(guessList)].sort();
    const t = new Set(targetList);
    if (g.length === t.size && g.every((x) => t.has(x))) return { result: 'green' };
    return g.some((x) => t.has(x)) ? { result: 'orange' } : { result: 'red' };
  }

  function compareStats(guess, tgt) {
    const common = {
      age:            compareNumeric(guess.age, tgt.age, 3),
      lastnameLength: compareNumeric(guess.lastnameLength, tgt.lastnameLength, 1),
      country:        { result: guess.country && guess.country === tgt.country ? 'green' : 'red' },
    };
    if (mode === 'f1') {
      return {
        firstF1Year: compareNumeric(guess.firstF1Year, tgt.firstF1Year, 3),
        lastF1Year:  compareNumeric(guess.lastF1Year, tgt.lastF1Year, 3),
        teams:       compareLists(guess.teams, tgt.teams),
        f1Wins:      compareNumeric(guess.f1Wins, tgt.f1Wins, 10),
        ...common,
        otherChamps: compareLists(guess.otherChamps, tgt.otherChamps),
      };
    }
    return {
      firstYear: compareNumeric(guess.firstYear, tgt.firstYear, 3),
      lastYear:  compareNumeric(guess.lastYear, tgt.lastYear, 3),
      series:    compareLists(guess.series, tgt.series),
      wins:      compareNumeric(guess.wins, tgt.wins, 10),
      ...common,
    };
  }

  function guessResult(id) {
    const guess = byId.get(id);
    return {
      won: id === target.id,
      guessStats: guess,
      comparison: compareStats(guess, target),
    };
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  async function init() {
    renderHeaders();
    loadStats();

    try {
      const data = await loadDriverdleData();
      countries = data.countries || {};
      drivers   = data[mode].map(toStats);
      teamNames = data.teams || {};
      pictures  = data.pictures || {};
    } catch {
      showError("Could not load today's driver. Please refresh.");
      return;
    }
    byId   = new Map(drivers.map((d) => [d.id, d]));
    target = dailyPick(drivers, mode);
    if (!target) { showError('No drivers available'); return; }

    const saved = loadSavedGuesses();
    won    = saved.won;
    gaveUp = saved.gaveUp ? { id: target.id, firstname: target.firstname, lastname: target.lastname } : null;
    // results are recomputed from the ids: always consistent with today's data
    const ids = (saved.guesses || []).map((g) => (typeof g === 'string' ? g : g?.guessStats?.id)).filter((id) => byId.has(id));
    guesses = ids.map(guessResult);
    won = guesses.some((g) => g.won);

    saveGuesses();

    for (const g of guesses) renderGuessRow(g);

    if (won) showWinBanner();
    else if (gaveUp) showGiveUpBanner();

    setupGiveUp();
    setupPicker();
    updateGuessCount();
  }

  function setupPicker() {
    const items = drivers.map((d) => ({
      id: d.id,
      label: `${d.firstname} ${d.lastname}`,
      sortKey: fold(`${d.lastname} ${d.firstname}`),
      search: fold(`${d.firstname} ${d.lastname} ${d.id}`),
      picture: pictures[d.id],
      meta: mode === 'f1' ? `F1 ${d.firstF1Year}–${d.lastF1Year}` : `${d.firstYear}–${d.lastYear}`,
    }));
    picker = createDriverPicker(items, {
      input: searchInput,
      dropdown,
      isUsed: (it) => guesses.some((g) => g.guessStats.id === it.id),
      onPick: (it) => selectDriver(it.id),
    });
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

  // ── Submit a guess ────────────────────────────────────────────────────────────
  function selectDriver(id) {
    picker?.hide();
    searchInput.value = '';
    if (won || gaveUp || !byId.has(id)) return;

    if (guesses.some(g => g.guessStats.id === id)) {
      showError('Already guessed this driver!');
      return;
    }
    clearError();

    const data = guessResult(id);
    guesses.push(data);
    won = data.won;

    renderGuessRow(data);
    saveGuesses();
    updateGuessCount();

    if (data.won) {
      incrementStats(true);
      showWinBanner();
    } else {
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
    photoTd.appendChild(driverThumb(pictures[guessStats.id], 'w-10 h-10 border border-gray-200 dark:border-gray-600'));
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

    if (col.type === 'country') {
      const name = value ? formatSeriesName(value) : '?';
      if (value) {
        const img = document.createElement('img');
        img.src = `/assets/flags/${value.toLowerCase()}.png`;
        img.alt = '';
        img.className = 'h-4 aspect-[3/2] object-contain rounded-sm';
        img.onerror = () => img.remove();
        div.appendChild(img);
      }
      const span = document.createElement('span');
      span.className = 'text-xs leading-tight text-center';
      span.textContent = name;
      div.appendChild(span);
    } else if (col.type === 'list') {
      const display = Array.isArray(value) && value.length
        ? value.map((v) => formatSeriesName(col.key === 'teams' ? (teamNames[v] || v) : v)).join(', ')
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
    document.getElementById('give-up-btn')?.remove();
    winBanner.classList.remove('hidden');
    guessCount.textContent = guesses.length;
    searchInput.disabled   = true;
    searchInput.placeholder = 'Found it!';
  }

  // ── Give up ───────────────────────────────────────────────────────────────────
  function setupGiveUp() {
    if (won || gaveUp) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'give-up-btn';
    btn.textContent = 'Give up';
    btn.className = 'mt-3 px-4 py-2 text-sm font-medium rounded-lg border border-red-300 text-red-700 ' +
      'hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/30 transition-colors';
    btn.addEventListener('click', () => {
      if (!confirm("Give up and reveal today's driver?")) return;
      gaveUp = { id: target.id, firstname: target.firstname, lastname: target.lastname };
      incrementStats(false);
      saveGuesses();
      showGiveUpBanner();
    });
    searchInput.closest('div').after(btn);
  }

  function showGiveUpBanner() {
    document.getElementById('give-up-btn')?.remove();
    searchInput.disabled = true;
    searchInput.placeholder = 'Game over';
    const box = document.createElement('div');
    box.className = 'bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-xl p-4 text-center text-gray-900 dark:text-white';
    const link = document.createElement('a');
    link.href = `/driver.php?id=${encodeURIComponent(gaveUp.id)}`;
    link.className = 'font-semibold underline text-blue-600 dark:text-blue-400';
    link.textContent = `${gaveUp.firstname} ${gaveUp.lastname}`;
    box.append("You gave up. Today's driver was ", link, '. Come back tomorrow!');
    winBanner.after(box);
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
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: TODAY, guesses: guesses.map(g => g.guessStats.id), won, gaveUp: !!gaveUp }));
    } catch { /* private mode: the game still works for this page view */ }
  }

  function loadSavedGuesses() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { guesses: [], won: false };
      const parsed = JSON.parse(raw);
      // Stale day → start fresh
      if (parsed.date !== TODAY) return { guesses: [], won: false };
      return parsed;
    } catch {
      return { guesses: [], won: false };
    }
  }

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const STATS_KEY = `driverdle_comparison_stats_${mode}`;

  function readStats() {
    try {
      return JSON.parse(localStorage.getItem(STATS_KEY)) || { played: 0, wins: 0, streak: 0, lastWon: '' };
    } catch {
      return { played: 0, wins: 0, streak: 0, lastWon: '' };
    }
  }

  function loadStats() {
    const stats = readStats();
    if (statsPlayed) statsPlayed.textContent = stats.played;
    if (statsWins)   statsWins.textContent   = stats.wins;
    if (statsStreak) statsStreak.textContent = stats.streak;
    return stats;
  }

  function incrementStats(didWin) {
    const stats = readStats();
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
    try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch { /* ignore */ }
    if (statsPlayed) statsPlayed.textContent = stats.played;
    if (statsWins)   statsWins.textContent   = stats.wins;
    if (statsStreak) statsStreak.textContent = stats.streak;
  }

  init();
}
