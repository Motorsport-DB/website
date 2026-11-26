/**
 * MotorsportDB - Head-to-Head Processor
 *
 * Every race and final qualifying session of each driver becomes one entry
 * (year, championship, event, session). The comparison modes filter these
 * entries, then the statistics, the duels and the race list are computed from
 * the same entries, so the numbers of the page always agree with each other.
 *
 * Counting rules are the ones of the driver page (dataProcessor.js): a win is
 * position 1, a pole is position 1 of the final qualifying session, a fastest
 * lap is the fastest lap of the race.
 */

import { isRaceSession, isPoleSession, hasFastestLapOfRace } from './dataProcessor.js';

export const MODES = {
    all: 'every race of each driver',
    'common-championships': 'championships every driver raced in',
    'common-races': 'races every driver took part in',
    'same-team': 'races where every driver was in the same team',
};

/**
 * @param {Array} drivers - driver objects of the API (seasons, elo…)
 * @param {string} mode - all | common-championships | common-races | same-team
 */
export function calculateAdvancedHeadToHead(drivers, mode = 'all') {
    const entries = drivers.map(collectEntries);
    const kept = filterEntries(drivers, entries, mode);

    const stats = drivers.map((d, i) => ({
        ...careerFacts(d, entries[i]),
        detailedStats: computeStats(kept[i]),
    }));

    return {
        mode,
        drivers: stats,
        duels: computeDuels(drivers, kept),
        races: raceRows(drivers, kept),
        commonChampionships: commonChampionships(entries),
    };
}

/* ------------------------------------------------------------------ entries */

function collectEntries(driver) {
    const out = [];
    Object.entries(driver.seasons || {}).forEach(([year, champs]) => {
        Object.entries(champs || {}).forEach(([championship, events]) => {
            Object.entries(events || {}).forEach(([event, sessions]) => {
                Object.entries(sessions || {}).forEach(([session, result]) => {
                    const kind = isRaceSession(session) ? 'race' : isPoleSession(session) ? 'quali' : null;
                    if (!kind || !result) return;
                    const raw = result.position === undefined || result.position === null ? '' : String(result.position).trim();
                    const num = /^\d+$/.test(raw) ? parseInt(raw, 10) : 0;
                    const points = parseFloat(result.points);
                    out.push({
                        ord: out.length, // calendar order inside a season
                        key: `${year}|${championship}|${event}|${session}`,
                        eventKey: `${year}|${championship}|${event}`,
                        year, championship, event, session, kind,
                        position: raw || '—',
                        num, // 0 = not classified (DNF, DSQ, NC…)
                        dsq: /DSQ|DISQ|EXC/i.test(raw),
                        team: result.team || '',
                        points: Number.isFinite(points) ? points : 0,
                        fastestLap: kind === 'race' && hasFastestLapOfRace(result),
                        classPosition: result.other_info?.Class_position || result.other_info?.Class_Position || '',
                        carClass: result.other_info?.Class || '',
                    });
                });
            });
        });
    });
    return out;
}

function commonChampionships(entries) {
    const sets = entries.map((list) => new Set(list.filter((e) => e.kind === 'race').map((e) => e.championship)));
    return [...sets[0]].filter((c) => sets.every((s) => s.has(c)));
}

function filterEntries(drivers, entries, mode) {
    if (mode === 'all') return entries;
    if (mode === 'common-championships') {
        const common = new Set(commonChampionships(entries));
        return entries.map((list) => list.filter((e) => common.has(e.championship)));
    }
    const byKey = entries.map((list) => new Map(list.map((e) => [e.key, e])));
    return entries.map((list) => list.filter((e) => {
        const others = byKey.map((m) => m.get(e.key));
        if (others.some((o) => !o)) return false;
        if (mode === 'same-team') {
            // the team of the race session decides (also for the qualifying of that event)
            const teams = drivers.map((_, i) => raceTeam(byKey[i], e));
            return teams.every((t) => t && t === teams[0]);
        }
        return true; // common-races
    }));
}

function raceTeam(map, e) {
    if (e.kind === 'race') return map.get(e.key)?.team || '';
    for (const x of map.values()) {
        if (x.eventKey === e.eventKey && x.kind === 'race') return x.team;
    }
    return map.get(e.key)?.team || '';
}

/* -------------------------------------------------------------- statistics */

function careerFacts(driver, entries) {
    const years = entries.map((e) => parseInt(e.year, 10)).filter(Number.isFinite);
    return {
        id: driver.id,
        name: `${driver.firstName || ''} ${driver.lastName || ''}`.trim() || driver.id.replace(/_/g, ' '),
        firstName: driver.firstName || '',
        lastName: driver.lastName || '',
        country: driver.country || '',
        dateOfBirth: driver.dateOfBirth || '',
        dateOfDeath: driver.dateOfDeath || '',
        image: driver.picture ? `/${String(driver.picture).replace(/^\//, '')}` : '/drivers/picture/default.png',
        elo: driver.elo || null,
        firstYear: years.length ? Math.min(...years) : null,
        lastYear: years.length ? Math.max(...years) : null,
    };
}

function computeStats(entries) {
    const races = entries.filter((e) => e.kind === 'race');
    const quali = entries.filter((e) => e.kind === 'quali' && e.num > 0);
    const finished = races.filter((e) => e.num > 0);
    const s = {
        totalRaces: races.length,
        wins: finished.filter((e) => e.num === 1).length,
        podiums: finished.filter((e) => e.num <= 3).length,
        top10: finished.filter((e) => e.num <= 10).length,
        finishedRaces: finished.length,
        dnfs: races.length - finished.length,
        dsq: races.filter((e) => e.dsq).length,
        poles: quali.filter((e) => e.num === 1).length,
        fastestLaps: races.filter((e) => e.fastestLap).length,
        points: races.reduce((sum, e) => sum + e.points, 0),
        bestFinish: finished.length ? Math.min(...finished.map((e) => e.num)) : null,
        avgPosition: finished.length ? round(finished.reduce((a, e) => a + e.num, 0) / finished.length, 2) : null,
        avgQualifying: quali.length ? round(quali.reduce((a, e) => a + e.num, 0) / quali.length, 2) : null,
        championships: new Set(races.map((e) => e.championship)).size,
        seasons: new Set(races.map((e) => e.year)).size,
        teams: new Set(races.map((e) => e.team).filter(Boolean)).size,
    };
    const pct = (n) => (s.totalRaces ? round((n / s.totalRaces) * 100, 1) : 0);
    s.winRate = pct(s.wins);
    s.podiumRate = pct(s.podiums);
    s.top10Rate = pct(s.top10);
    s.finishRate = pct(s.finishedRaces);
    s.dnfRate = pct(s.dnfs);
    s.poleRate = pct(s.poles);
    s.pointsPerRace = s.totalRaces ? round(s.points / s.totalRaces, 2) : 0;
    // finish types, for the distribution chart
    s.finishTypes = {
        win: s.wins,
        podium: s.podiums - s.wins,
        top10: s.top10 - s.podiums,
        other: s.finishedRaces - s.top10,
        notClassified: s.dnfs,
    };
    return s;
}

/* ------------------------------------------------------------------- duels */

/** Who finished ahead of whom, for every pair of drivers, on the sessions they shared. */
function computeDuels(drivers, kept) {
    const maps = kept.map((list) => new Map(list.map((e) => [e.key, e])));
    const pairs = [];
    for (let a = 0; a < drivers.length; a++) {
        for (let b = a + 1; b < drivers.length; b++) {
            const d = {
                a, b,
                race: { a: 0, b: 0, same: 0, none: 0, total: 0 },
                quali: { a: 0, b: 0, same: 0, none: 0, total: 0 },
                teammates: { a: 0, b: 0, same: 0, none: 0, total: 0 },
                sharedEvents: new Set(),
            };
            maps[a].forEach((ea, key) => {
                const eb = maps[b].get(key);
                if (!eb) return;
                const box = d[ea.kind];
                const w = ahead(ea, eb);
                box.total++;
                box[w]++;
                if (ea.kind === 'race') {
                    d.sharedEvents.add(ea.eventKey);
                    if (ea.team && ea.team === eb.team) {
                        d.teammates.total++;
                        d.teammates[w]++;
                    }
                }
            });
            d.sharedEvents = d.sharedEvents.size;
            pairs.push(d);
        }
    }
    return pairs;
}

function ahead(x, y) {
    if (x.num && y.num) return x.num < y.num ? 'a' : x.num > y.num ? 'b' : 'same'; // same position = same car
    if (x.num) return 'a';
    if (y.num) return 'b';
    // neither classified: one car (same team, same status) or two retirements
    return x.team && x.team === y.team && x.position === y.position && x.kind === 'race' ? 'same' : 'none';
}

/* -------------------------------------------------------------- race list */

/** One row per race session, newest first, with the qualifying of the event. */
function raceRows(drivers, kept) {
    const rows = new Map();
    kept.forEach((list, i) => {
        const quali = new Map(list.filter((e) => e.kind === 'quali').map((e) => [e.eventKey, e]));
        list.filter((e) => e.kind === 'race').forEach((e) => {
            if (!rows.has(e.key)) {
                rows.set(e.key, {
                    key: e.key, year: e.year, championship: e.championship, event: e.event, session: e.session, ord: e.ord,
                    results: new Array(drivers.length).fill(null),
                });
            }
            rows.get(e.key).results[i] = { ...e, qualifying: quali.get(e.eventKey)?.position || '' };
        });
    });
    const list = [...rows.values()];
    list.forEach((r) => {
        const present = r.results.filter(Boolean);
        r.shared = present.length >= 2;
        const nums = present.filter((x) => x.num).map((x) => x.num);
        r.best = nums.length && present.length >= 2 ? Math.min(...nums) : 0; // best position of the row
    });
    return list.sort((x, y) => (parseInt(y.year, 10) - parseInt(x.year, 10))
        || x.championship.localeCompare(y.championship)
        || y.ord - x.ord);
}

function round(v, d) {
    const k = 10 ** d;
    return Math.round(v * k) / k;
}
