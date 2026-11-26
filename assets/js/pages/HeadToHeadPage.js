/**
 * MotorsportDB - Head to Head Page
 *
 * Compare 2 to 5 drivers: side-by-side table (best value highlighted), duels
 * for every pair (races, qualifying, as teammates), rating over the seasons,
 * how the races ended, and the race-by-race list. The selection is kept in the
 * URL (?drivers=Max_Verstappen,Lewis_Hamilton&mode=common-races) to share it.
 */

import { apiService } from '../services/ApiService.js';
import { themeService } from '../services/ThemeService.js';
import { SearchComponent } from '../components/SearchComponent.js';
import { calculateAdvancedHeadToHead, MODES } from '../utils/headToHeadProcessor.js';
import { escapeHtml, formatDisplayName, getFlagImage, calculateAge } from '../utils/helpers.js';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const DEFAULT_PICTURE = '/drivers/picture/default.png';
const PAGE_SIZE = 30;

const esc = escapeHtml;
const label = (id) => formatDisplayName(id);

class HeadToHeadPage {
    constructor() {
        this.selected = [];
        this.maxDrivers = 5;
        this.mode = 'all';
        this.data = null;
        this.charts = new Map();
        this.raceFilter = { shared: true, year: '', championship: '', shown: PAGE_SIZE };

        try {
            themeService.initToggleButton();
        } catch (e) {
            console.warn(e);
        }
        this.initSearch();
        this.bindControls();
        this.restoreFromUrl();
    }

    /* ------------------------------------------------------------ selection */

    initSearch() {
        if (!document.getElementById('driver-search-container')) return;
        this.search = new SearchComponent('driver-search-container', {
            placeholder: 'Search and add drivers (up to 5)...',
            showImages: true,
            maxResults: 10,
            types: ['driver'],
            onSelect: (result) => {
                if (result.type && result.type !== 'driver') return;
                const m = result.metadata || {};
                this.addDriver({
                    id: result.id,
                    name: result.name,
                    image: result.image || DEFAULT_PICTURE,
                    country: m.country || '',
                    years: m.first ? (m.first === m.last ? `${m.first}` : `${m.first}–${m.last}`) : '',
                });
                this.search.clear();
            },
        });
    }

    bindControls() {
        document.getElementById('compare-btn')?.addEventListener('click', () => this.compare());
        const modeSelect = document.getElementById('comparison-mode');
        modeSelect?.addEventListener('change', (e) => {
            this.mode = e.target.value;
            if (this.data) this.compare();
        });
        document.getElementById('selected-drivers')?.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-remove]');
            if (btn) this.removeDriver(btn.dataset.remove);
        });
    }

    async restoreFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const ids = (params.get('drivers') || '').split(',').map((s) => s.trim()).filter(Boolean).slice(0, this.maxDrivers);
        const mode = params.get('mode');
        if (mode && MODES[mode]) {
            this.mode = mode;
            const select = document.getElementById('comparison-mode');
            if (select) select.value = mode;
        }
        if (!ids.length) return;
        const drivers = await Promise.all(ids.map((id) => apiService.getDriver(id).catch(() => null)));
        drivers.filter(Boolean).forEach((d) => this.addDriver(this.chipFromDriver(d), false));
        if (this.selected.length >= 2) this.compare();
    }

    chipFromDriver(d) {
        const years = Object.keys(d.seasons || {}).map(Number).filter(Number.isFinite);
        const first = years.length ? Math.min(...years) : null;
        const last = years.length ? Math.max(...years) : null;
        return {
            id: d.id,
            name: `${d.firstName || ''} ${d.lastName || ''}`.trim() || label(d.id),
            image: d.picture ? `/${String(d.picture).replace(/^\//, '')}` : DEFAULT_PICTURE,
            country: d.country || '',
            years: first ? (first === last ? `${first}` : `${first}–${last}`) : '',
        };
    }

    addDriver(driver, notify = true) {
        if (this.selected.some((d) => d.id === driver.id)) {
            if (notify) this.flash(`${driver.name} is already selected`);
            return;
        }
        if (this.selected.length >= this.maxDrivers) {
            if (notify) this.flash(`At most ${this.maxDrivers} drivers can be compared`);
            return;
        }
        this.selected.push(driver);
        this.renderSelection();
    }

    removeDriver(id) {
        this.selected = this.selected.filter((d) => d.id !== id);
        this.renderSelection();
        if (this.selected.length < 2) {
            this.data = null;
            document.getElementById('comparison-results')?.classList.add('hidden');
            this.updateUrl();
        } else if (this.data) {
            this.compare();
        }
    }

    flash(text) {
        const box = document.getElementById('selected-drivers');
        if (!box) return;
        const note = document.createElement('p');
        note.className = 'col-span-full text-center text-sm text-red-600 dark:text-red-400';
        note.textContent = text;
        box.appendChild(note);
        setTimeout(() => note.remove(), 3000);
    }

    renderSelection() {
        const box = document.getElementById('selected-drivers');
        if (!box) return;
        const btn = document.getElementById('compare-btn');
        if (btn) btn.disabled = this.selected.length < 2;

        if (!this.selected.length) {
            box.innerHTML = '<p class="text-gray-500 dark:text-gray-400 col-span-full text-center py-4">No drivers selected</p>';
            return;
        }
        box.innerHTML = this.selected.map((d, i) => `
            <div class="bg-white dark:bg-gray-700 rounded-lg p-3 shadow-md flex items-center gap-3 border-l-4" style="border-left-color:${COLORS[i]}">
                <img src="${esc(d.image)}" alt="" class="w-12 h-12 aspect-square flex-shrink-0 rounded-full object-cover object-top bg-gray-200 dark:bg-gray-600"
                     onerror="this.onerror=null;this.src='${DEFAULT_PICTURE}'">
                <div class="flex-1 min-w-0">
                    <a href="/driver?id=${encodeURIComponent(d.id)}" class="block font-semibold text-gray-900 dark:text-white truncate hover:underline">${esc(d.name)}</a>
                    <p class="text-xs text-gray-500 dark:text-gray-400 truncate flex items-center gap-1">
                        ${d.country ? `<img src="${esc(getFlagImage(d.country))}" alt="" class="w-4 h-3 object-cover" onerror="this.remove()">${esc(label(d.country))}` : ''}
                        ${d.country && d.years ? ' · ' : ''}${esc(d.years || '')}
                    </p>
                </div>
                <button type="button" data-remove="${esc(d.id)}" aria-label="Remove ${esc(d.name)}"
                        class="text-red-600 hover:text-red-700 dark:text-red-400 flex-shrink-0">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                </button>
            </div>`).join('');
    }

    updateUrl() {
        const params = new URLSearchParams(window.location.search);
        if (this.selected.length) params.set('drivers', this.selected.map((d) => d.id).join(','));
        else params.delete('drivers');
        if (this.mode !== 'all') params.set('mode', this.mode);
        else params.delete('mode');
        const q = params.toString().replace(/%2C/gi, ','); // readable ids in the address bar
        history.replaceState(null, '', `${window.location.pathname}${q ? `?${q}` : ''}`);
    }

    /* ------------------------------------------------------------ comparison */

    async compare() {
        if (this.selected.length < 2) return;
        const loading = document.getElementById('loading-indicator');
        const results = document.getElementById('comparison-results');
        loading?.classList.remove('hidden');
        try {
            const drivers = await Promise.all(this.selected.map((d) => apiService.getDriver(d.id)));
            const data = calculateAdvancedHeadToHead(drivers, this.mode);
            this.data = data;
            this.raceFilter = { shared: true, year: '', championship: '', shown: PAGE_SIZE };
            this.updateUrl();

            const note = document.getElementById('mode-note');
            if (note) note.textContent = `Statistics: ${MODES[this.mode]}.`;
            const empty = data.drivers.every((d) => d.detailedStats.totalRaces === 0);
            if (empty) {
                results?.classList.remove('hidden');
                ['h2h-summary', 'h2h-duels', 'h2h-charts', 'h2h-races'].forEach((id) => document.getElementById(id)?.classList.add('hidden'));
                if (note) note.innerHTML = `No race matches “${esc(MODES[this.mode])}” for these drivers. Choose another comparison mode.`;
                return;
            }
            ['h2h-summary', 'h2h-duels', 'h2h-charts', 'h2h-races'].forEach((id) => document.getElementById(id)?.classList.remove('hidden'));
            results?.classList.remove('hidden');
            this.renderSummary();
            this.renderDuels();
            this.renderCharts();
            this.renderRaces();
            results?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (error) {
            console.error('Error comparing drivers:', error);
            this.flash('The comparison could not be loaded. Please try again.');
        } finally {
            loading?.classList.add('hidden');
        }
    }

    /* --------------------------------------------------------- side by side */

    renderSummary() {
        const body = document.getElementById('h2h-summary-body');
        if (!body) return;
        const ds = this.data.drivers;
        const st = ds.map((d) => d.detailedStats);
        const n = (v, dec = 0) => (v === null || v === undefined ? '—' : Number(v).toLocaleString('en-US', { maximumFractionDigits: dec }));

        // [label, values, best: 'max' | 'min' | null, formatter, hint]
        const rows = [
            ['group', 'Career'],
            ['Nationality', ds.map((d) => d.country), null, (v) => (v ? `<span class="inline-flex items-center gap-1"><img src="${esc(getFlagImage(v))}" alt="" class="w-5 h-4 object-cover" onerror="this.remove()">${esc(label(v))}</span>` : '—')],
            ['Born', ds.map((d) => d.dateOfBirth), null, (v, i) => (v ? `${esc(v)}${ds[i].dateOfDeath ? '' : ` <span class="text-xs text-gray-500">(${calculateAge(v)})</span>`}` : '—')],
            ['Seasons in the database', ds.map((d) => (d.firstYear ? `${d.firstYear}–${d.lastYear}` : '')), null, (v) => esc(v || '—')],
            ['Rating', ds.map((d) => d.elo?.rating ?? null), 'max', (v, i) => (v === null ? '—' : `${Math.round(v)}${ds[i].elo?.rankActive ? ` <span class="text-xs text-gray-500">#${ds[i].elo.rankActive} active</span>` : ''}`), 'Rating built from every race (see the ranking page)'],
            ['Peak rating', ds.map((d) => d.elo?.peak ?? null), 'max', (v) => (v === null ? '—' : Math.round(v))],
            ['group', 'Results'],
            ['Seasons', st.map((s) => s.seasons), 'max', (v) => n(v)],
            ['Championships', st.map((s) => s.championships), 'max', (v) => n(v), 'Different championships raced'],
            ['Teams', st.map((s) => s.teams), null, (v) => n(v)],
            ['Races', st.map((s) => s.totalRaces), 'max', (v) => n(v), 'Races, sprints and heats'],
            ['Wins', st.map((s) => s.wins), 'max', (v, i) => `${n(v)} <span class="text-xs text-gray-500">${st[i].winRate}%</span>`],
            ['Podiums', st.map((s) => s.podiums), 'max', (v, i) => `${n(v)} <span class="text-xs text-gray-500">${st[i].podiumRate}%</span>`],
            ['Top 10', st.map((s) => s.top10), 'max', (v, i) => `${n(v)} <span class="text-xs text-gray-500">${st[i].top10Rate}%</span>`],
            ['Pole positions', st.map((s) => s.poles), 'max', (v) => n(v)],
            ['Fastest laps', st.map((s) => s.fastestLaps), 'max', (v) => n(v)],
            ['Points', st.map((s) => s.points), 'max', (v, i) => `${n(v, 1)} <span class="text-xs text-gray-500">${st[i].pointsPerRace}/race</span>`, 'Points scored in the races of the database'],
            ['Best finish', st.map((s) => s.bestFinish), 'min', (v) => (v ? `P${v}` : '—')],
            ['Average finish', st.map((s) => s.avgPosition), 'min', (v) => n(v, 2), 'Classified finishes only'],
            ['Average qualifying', st.map((s) => s.avgQualifying), 'min', (v) => n(v, 2)],
            ['Classified', st.map((s) => s.finishRate), 'max', (v) => `${n(v, 1)}%`],
            ['Not classified', st.map((s) => s.dnfs), null, (v, i) => `${n(v)} <span class="text-xs text-gray-500">${st[i].dnfRate}%</span>`, 'Retired, disqualified, not classified…'],
        ];

        const head = `
            <thead>
                <tr class="bg-gray-50 dark:bg-gray-700">
                    <th class="sticky left-0 bg-gray-50 dark:bg-gray-700 p-3"></th>
                    ${ds.map((d, i) => `
                    <th class="p-3 min-w-[9rem] align-bottom border-t-4" style="border-top-color:${COLORS[i]}">
                        <a href="/driver?id=${encodeURIComponent(d.id)}" class="flex flex-col items-center gap-2 hover:underline">
                            <img src="${esc(d.image)}" alt="" class="w-16 h-16 aspect-square rounded-full object-cover object-top bg-gray-200 dark:bg-gray-600"
                                 onerror="this.onerror=null;this.src='${DEFAULT_PICTURE}'">
                            <span class="font-bold text-gray-900 dark:text-white text-center">${esc(d.name)}</span>
                        </a>
                    </th>`).join('')}
                </tr>
            </thead>`;

        const bodyRows = rows.map(([name, values, best, fmt, hint]) => {
            if (name === 'group') {
                return `<tr><th colspan="${ds.length + 1}" class="text-left px-3 pt-4 pb-1 text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">${esc(values)}</th></tr>`;
            }
            const nums = values.map((v) => (typeof v === 'number' && Number.isFinite(v) ? v : null));
            const valid = nums.filter((v) => v !== null && !(best === 'min' && v === 0));
            const target = best && valid.length > 1 ? (best === 'max' ? Math.max(...valid) : Math.min(...valid)) : null;
            const unique = target !== null && nums.filter((v) => v === target).length < ds.length;
            return `
                <tr class="border-t border-gray-100 dark:border-gray-700">
                    <th scope="row" class="sticky left-0 bg-white dark:bg-gray-800 text-left font-normal text-sm text-gray-600 dark:text-gray-400 px-3 py-2 whitespace-nowrap"${hint ? ` title="${esc(hint)}"` : ''}>${esc(name)}</th>
                    ${values.map((v, i) => {
                        const top = unique && nums[i] === target;
                        return `<td class="px-3 py-2 text-center text-sm ${top ? 'font-bold text-green-700 dark:text-green-400 bg-green-50 dark:bg-gray-700' : 'text-gray-900 dark:text-gray-100'}">${fmt(v, i)}</td>`;
                    }).join('')}
                </tr>`;
        }).join('');

        body.innerHTML = `<table class="min-w-full">${head}<tbody>${bodyRows}</tbody></table>`;
    }

    /* ---------------------------------------------------------------- duels */

    renderDuels() {
        const body = document.getElementById('h2h-duels-body');
        if (!body) return;
        const ds = this.data.drivers;
        const shared = this.data.duels.filter((p) => p.race.total || p.quali.total);
        if (!shared.length) {
            body.innerHTML = '<p class="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center text-gray-600 dark:text-gray-400">These drivers never raced in the same session.</p>';
            return;
        }
        const bar = (box, a, b) => {
            if (!box.total) return '<p class="text-xs text-gray-500 dark:text-gray-400">No shared session</p>';
            const pa = (box.a / box.total) * 100;
            const pb = (box.b / box.total) * 100;
            return `
                <div class="flex items-center gap-3">
                    <span class="w-10 text-right font-extrabold text-lg" style="color:${COLORS[a]}">${box.a}</span>
                    <div class="flex-1 flex h-4 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700" role="img"
                         aria-label="${box.a} to ${box.b}">
                        <div style="width:${pa}%;background:${COLORS[a]}"></div>
                        <div class="flex-1"></div>
                        <div style="width:${pb}%;background:${COLORS[b]}"></div>
                    </div>
                    <span class="w-10 font-extrabold text-lg" style="color:${COLORS[b]}">${box.b}</span>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">${[
                    `${box.total} session${box.total > 1 ? 's' : ''}`,
                    box.same ? `${box.same} in the same car` : '',
                    box.none ? `${box.none} with neither classified` : '',
                ].filter(Boolean).join(' · ')}</p>`;
        };
        body.innerHTML = shared.map((p) => `
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
                <div class="flex items-center justify-between gap-3 mb-4">
                    <span class="font-bold truncate" style="color:${COLORS[p.a]}">${esc(ds[p.a].name)}</span>
                    <span class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">${p.sharedEvents} shared event${p.sharedEvents > 1 ? 's' : ''}</span>
                    <span class="font-bold truncate text-right" style="color:${COLORS[p.b]}">${esc(ds[p.b].name)}</span>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div><h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 text-center mb-2">Finished ahead</h3>${bar(p.race, p.a, p.b)}</div>
                    <div><h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 text-center mb-2">Qualified ahead</h3>${bar(p.quali, p.a, p.b)}</div>
                    <div><h3 class="text-sm font-semibold text-gray-700 dark:text-gray-300 text-center mb-2">As teammates</h3>${bar(p.teammates, p.a, p.b)}</div>
                </div>
            </div>`).join('');
    }

    /* --------------------------------------------------------------- charts */

    chartTheme() {
        const dark = document.documentElement.classList.contains('dark');
        return { text: dark ? '#d1d5db' : '#374151', grid: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' };
    }

    makeChart(id, config) {
        const canvas = document.getElementById(id);
        if (!canvas || typeof Chart === 'undefined') return;
        this.charts.get(id)?.destroy();
        this.charts.set(id, new Chart(canvas.getContext('2d'), config));
    }

    renderCharts() {
        const ds = this.data.drivers;
        const t = this.chartTheme();
        const names = ds.map((d) => d.name);
        const scale = { ticks: { color: t.text }, grid: { color: t.grid } };
        const legend = { labels: { color: t.text } };

        // rating over the seasons
        const years = [...new Set(ds.flatMap((d) => Object.keys(d.elo?.history || {})))].sort();
        const hasHistory = years.length > 0;
        document.getElementById('rating-history-box')?.classList.toggle('hidden', !hasHistory);
        if (hasHistory) {
            this.makeChart('rating-history-chart', {
                type: 'line',
                data: {
                    labels: years,
                    datasets: ds.map((d, i) => ({
                        label: d.name,
                        data: years.map((y) => d.elo?.history?.[y] ?? null),
                        borderColor: COLORS[i],
                        backgroundColor: COLORS[i],
                        tension: 0.25,
                        spanGaps: true,
                        pointRadius: 2,
                    })),
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: { legend },
                    scales: { x: scale, y: scale },
                },
            });
        }

        // how the races ended, in % of the races of each driver
        const parts = [
            ['Wins', 'win', '#16a34a'], ['Podiums (2-3)', 'podium', '#3b82f6'], ['Top 10 (4-10)', 'top10', '#f59e0b'],
            ['Other finishes', 'other', '#9ca3af'], ['Not classified', 'notClassified', '#ef4444'],
        ];
        this.makeChart('finish-types-chart', {
            type: 'bar',
            data: {
                labels: names,
                datasets: parts.map(([name, key, color]) => ({
                    label: name,
                    backgroundColor: color,
                    data: ds.map((d) => {
                        const s = d.detailedStats;
                        return s.totalRaces ? Math.round((s.finishTypes[key] / s.totalRaces) * 1000) / 10 : 0;
                    }),
                })),
            },
            options: {
                indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                plugins: { legend, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.raw}%` } } },
                scales: { x: { ...scale, stacked: true, max: 100, ticks: { color: t.text, callback: (v) => `${v}%` } }, y: { ...scale, stacked: true } },
            },
        });

        // profile
        const axes = [['Wins', 'winRate'], ['Podiums', 'podiumRate'], ['Top 10', 'top10Rate'], ['Poles', 'poleRate'], ['Classified', 'finishRate']];
        this.makeChart('radar-chart', {
            type: 'radar',
            data: {
                labels: axes.map(([a]) => a),
                datasets: ds.map((d, i) => ({
                    label: d.name,
                    data: axes.map(([, k]) => d.detailedStats[k]),
                    borderColor: COLORS[i],
                    backgroundColor: `${COLORS[i]}33`,
                    pointBackgroundColor: COLORS[i],
                })),
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.raw}%` } } },
                scales: { r: { min: 0, max: 100, ticks: { display: false }, grid: { color: t.grid }, angleLines: { color: t.grid }, pointLabels: { color: t.text } } },
            },
        });
    }

    /* ---------------------------------------------------------- race list */

    filteredRaces() {
        const f = this.raceFilter;
        return this.data.races.filter((r) => (!f.shared || r.shared)
            && (!f.year || r.year === f.year)
            && (!f.championship || r.championship === f.championship));
    }

    renderRaces() {
        const body = document.getElementById('h2h-races-body');
        if (!body) return;
        const races = this.data.races;
        const sharedCount = races.filter((r) => r.shared).length;
        if (!sharedCount) this.raceFilter.shared = false;
        const pool = races.filter((r) => !this.raceFilter.shared || r.shared);
        const years = [...new Set(pool.map((r) => r.year))].sort((a, b) => b - a);
        const champs = [...new Set(pool.map((r) => r.championship))].sort((a, b) => label(a).localeCompare(label(b)));
        const select = 'px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white';

        body.innerHTML = `
            <div class="flex flex-wrap gap-3 mb-4 items-center">
                <label class="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 mr-auto">
                    <input type="checkbox" id="races-shared" ${this.raceFilter.shared ? 'checked' : ''} ${sharedCount ? '' : 'disabled'}>
                    Shared races only (${sharedCount})
                </label>
                <select id="races-year" class="${select}" aria-label="Year">
                    <option value="">All years</option>
                    ${years.map((y) => `<option value="${esc(y)}" ${y === this.raceFilter.year ? 'selected' : ''}>${esc(y)}</option>`).join('')}
                </select>
                <select id="races-championship" class="${select}" aria-label="Championship">
                    <option value="">All championships</option>
                    ${champs.map((c) => `<option value="${esc(c)}" ${c === this.raceFilter.championship ? 'selected' : ''}>${esc(label(c))}</option>`).join('')}
                </select>
                <button type="button" id="races-csv" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold">Export CSV</button>
            </div>
            <div class="overflow-x-auto">
                <table class="min-w-full text-sm">
                    <thead class="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <th class="px-3 py-2 text-left font-semibold text-gray-900 dark:text-white">Race</th>
                            ${this.data.drivers.map((d, i) => `<th class="px-3 py-2 text-center font-semibold border-b-4 text-gray-900 dark:text-white" style="border-bottom-color:${COLORS[i]}">${esc(d.lastName || d.name)}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody id="races-tbody"></tbody>
                </table>
            </div>
            <div class="text-center mt-4"><button type="button" id="races-more" class="hidden px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"></button></div>`;

        const refresh = () => {
            this.raceFilter.shown = PAGE_SIZE;
            this.renderRaceRows();
        };
        document.getElementById('races-shared')?.addEventListener('change', (e) => {
            this.raceFilter = { shared: e.target.checked, year: '', championship: '', shown: PAGE_SIZE };
            this.renderRaces();
        });
        document.getElementById('races-year')?.addEventListener('change', (e) => { this.raceFilter.year = e.target.value; refresh(); });
        document.getElementById('races-championship')?.addEventListener('change', (e) => { this.raceFilter.championship = e.target.value; refresh(); });
        document.getElementById('races-csv')?.addEventListener('click', () => this.exportCsv());
        document.getElementById('races-more')?.addEventListener('click', () => {
            this.raceFilter.shown += PAGE_SIZE * 2;
            this.renderRaceRows();
        });
        this.renderRaceRows();
    }

    renderRaceRows() {
        const tbody = document.getElementById('races-tbody');
        if (!tbody) return;
        const all = this.filteredRaces();
        const rows = all.slice(0, this.raceFilter.shown);
        const cell = (r, i) => {
            const x = r.results[i];
            if (!x) return '<td class="px-3 py-2 text-center text-gray-400">·</td>';
            const best = r.best > 0 && x.num === r.best;
            const color = x.num === 1 ? 'text-yellow-600 dark:text-yellow-400' : x.num && x.num <= 3 ? 'text-blue-600 dark:text-blue-400' : x.num ? 'text-gray-900 dark:text-gray-100' : 'text-red-600 dark:text-red-400';
            const extra = [x.qualifying && x.qualifying !== '—' ? `Q ${esc(x.qualifying)}` : '', x.carClass && x.classPosition ? `${esc(x.carClass)} P${esc(x.classPosition)}` : ''].filter(Boolean).join(' · ');
            return `<td class="px-3 py-2 text-center ${best ? 'bg-green-50 dark:bg-gray-700' : ''}">
                <span class="font-semibold ${color}">${esc(x.num ? `P${x.num}` : x.position)}</span>${best ? '<span class="sr-only"> (best)</span>' : ''}
                ${extra ? `<br><span class="text-xs text-gray-500 dark:text-gray-400">${extra}</span>` : ''}
                ${x.team ? `<br><span class="text-xs text-gray-500 dark:text-gray-400">${esc(label(x.team))}</span>` : ''}
            </td>`;
        };
        tbody.innerHTML = rows.length ? rows.map((r) => `
            <tr class="border-t border-gray-100 dark:border-gray-700">
                <td class="px-3 py-2">
                    <a href="/race?id=${encodeURIComponent(r.championship)}&year=${encodeURIComponent(r.year)}" class="font-medium text-gray-900 dark:text-white hover:underline">${esc(r.event)}</a>${r.session !== 'Race' ? ` <span class="text-xs text-gray-500">${esc(r.session)}</span>` : ''}
                    <br><span class="text-xs text-gray-500 dark:text-gray-400">${esc(r.year)} · ${esc(label(r.championship))}</span>
                </td>
                ${this.data.drivers.map((_, i) => cell(r, i)).join('')}
            </tr>`).join('')
            : `<tr><td colspan="${this.data.drivers.length + 1}" class="px-3 py-6 text-center text-gray-500">No race</td></tr>`;

        const more = document.getElementById('races-more');
        if (more) {
            const left = all.length - rows.length;
            more.classList.toggle('hidden', left <= 0);
            more.textContent = `Show more (${left} left)`;
        }
    }

    exportCsv() {
        const ds = this.data.drivers;
        const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const lines = [['Year', 'Championship', 'Event', 'Session', ...ds.flatMap((d) => [`${d.name} race`, `${d.name} qualifying`, `${d.name} team`])].map(q).join(',')];
        this.filteredRaces().forEach((r) => {
            lines.push([r.year, label(r.championship), r.event, r.session,
                ...r.results.flatMap((x) => (x ? [x.position, x.qualifying, label(x.team)] : ['', '', '']))].map(q).join(','));
        });
        const blob = new Blob([`${lines.join('\n')}\n`], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `head-to-head-${ds.map((d) => d.lastName || d.id).join('-')}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }
}

const page = new HeadToHeadPage();
window.headToHeadPage = page;
export default page;
