/**
 * MotorsportDB - Honours
 * World titles of the premier categories and the Triple Crown of motorsport
 * (Monaco Grand Prix, 24 Hours of Le Mans, Indianapolis 500).
 */

import { escapeHtml } from './helpers.js';

export const CROWN_RACES = {
    monaco: { label: 'Monaco Grand Prix', short: 'Monaco', icon: '🏎️' },
    lemans: { label: '24 Hours of Le Mans', short: 'Le Mans', icon: '🕛' },
    indy: { label: 'Indianapolis 500', short: 'Indy 500', icon: '🏁' },
};

const TITLE_LABELS = {
    drivers: {
        Formula_1: 'Formula 1 World Champion',
        Grand_Prix_500cc: '500cc World Champion',
        MotoGP: 'MotoGP World Champion',
        World_Rally_Championship_WRC: 'World Rally Champion',
        World_Endurance_Championship_WEC: 'World Endurance Champion',
        Formula_E: 'Formula E World Champion',
    },
    teams: {
        Formula_1: "Formula 1 Constructors' Champion",
        World_Rally_Championship_WRC: "World Rally Manufacturers' Champion",
        Formula_E: "Formula E Teams' Champion",
    },
};

/**
 * Triple Crown race of an event ("monaco" | "lemans" | "indy"), or null.
 * @param {string} championship - championship id ("Formula_1")
 * @param {string} event - event name ("Monaco Grand Prix")
 */
export function crownOf(championship, event) {
    const e = String(event || '').replace(/_/g, ' ').trim();
    if (championship === 'Formula_1' && e === 'Monaco Grand Prix') return 'monaco';
    if (e === '24 Hours of Le Mans' || e === 'Le Mans 24 Hours') return 'lemans';
    if (e === 'Indianapolis 500' || e === 'Indianapolis 500 Mile Race') return 'indy';
    return null;
}

/** Small badge for the header of a Triple Crown race. */
export function crownBadge(key) {
    const race = CROWN_RACES[key];
    if (!race) return '';
    return `<span class="crown-badge" title="${escapeHtml(race.label)}: one of the three races of the Triple Crown of motorsport">👑 Triple Crown</span>`;
}

/**
 * Honours block of a driver or team page.
 * @param {HTMLElement} el - container (hidden when there is nothing to show)
 * @param {{titles: Array, crown: Object}} honours - from the API
 * @param {'drivers'|'teams'} kind
 */
export function renderHonours(el, honours, kind = 'drivers') {
    if (!el || !honours) return;
    const titles = (honours.titles || []).filter((t) => t.years && t.years.length);
    const crown = honours.crown || {};
    const crownWins = Object.keys(CROWN_RACES).filter((k) => (crown[k] || []).length);
    if (!titles.length && !crownWins.length) {
        el.classList.add('hidden');
        return;
    }
    const labels = TITLE_LABELS[kind] || {};
    const titleHtml = titles.map((t) => {
        const label = labels[t.championship] || `${t.championship.replace(/_/g, ' ')} Champion`;
        return `
            <div class="honour-title">
                <span class="honour-trophy" aria-hidden="true">🏆</span>
                <div>
                    <p class="honour-title-name">${t.years.length > 1 ? `${t.years.length}× ` : ''}${escapeHtml(label)}</p>
                    <p class="honour-years">${t.years.map((y) => `<a href="/race?id=${encodeURIComponent(t.championship)}&year=${y}">${y}</a>`).join(' · ')}</p>
                </div>
            </div>`;
    }).join('');

    const complete = crownWins.length === 3;
    const crownHtml = crownWins.length ? `
        <div class="crown-block ${complete ? 'crown-complete' : ''}">
            <p class="crown-heading">${complete ? '👑 Triple Crown winner' : '👑 Triple Crown races'}</p>
            <div class="crown-races">
                ${Object.entries(CROWN_RACES).map(([k, race]) => {
                    const years = crown[k] || [];
                    return `
                    <div class="crown-race ${years.length ? 'won' : ''}" title="${escapeHtml(race.label)}">
                        <span class="crown-race-name">${race.icon} ${escapeHtml(race.short)}</span>
                        <span class="crown-race-years">${years.length ? years.join(' · ') : '—'}</span>
                    </div>`;
                }).join('')}
            </div>
        </div>` : '';

    el.innerHTML = `
        <h2 class="honours-heading">Honours</h2>
        ${titleHtml ? `<div class="honour-titles">${titleHtml}</div>` : ''}
        ${crownHtml}`;
    el.classList.remove('hidden');
}
