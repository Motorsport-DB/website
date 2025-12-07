/**
 * Data processor utilities for MotorsportDB
 * @module utils/dataProcessor
 */

/**
 * Calculate driver statistics
 * @param {Object} driver - Driver data
 * @returns {Object} Statistics object
 */
export function calculateDriverStats(driver) {
    if (!driver?.seasons) {
        return {
            totalRaces: 0,
            totalWins: 0,
            totalPodiums: 0,
            totalPoles: 0,
            totalFastestLaps: 0,
            totalPoints: 0,
            championships: 0,
            championshipParticipations: 0
        };
    }

    const stats = {
        totalRaces: 0,
        totalWins: 0,
        totalPodiums: 0,
        totalPoles: 0,
        totalFastestLaps: 0,
        totalPoints: 0,
        championships: 0,
        championshipParticipations: 0,
        seasons: []
    };

    Object.entries(driver.seasons).forEach(([year, championships]) => {
        stats.championshipParticipations += Object.keys(championships).length;

        Object.entries(championships).forEach(([championship, data]) => {
            // Count championship wins
            if (data.standing?.position === '1' || data.standing?.position === 1) {
                stats.championships++;
            }

            // Add points
            if (data.standing?.points) {
                stats.totalPoints += parseFloat(data.standing.points) || 0;
            }

            // Process races
            Object.entries(data).forEach(([race, sessions]) => {
                if (race === 'standing') return;

                Object.entries(sessions).forEach(([session, result]) => {
                    const sessionLower = session.toLowerCase();

                    // Count races (only race sessions)
                    if (sessionLower.includes('race')) {
                        stats.totalRaces++;

                        const position = parseInt(result.position);
                        if (position === 1) stats.totalWins++;
                        if (position <= 3) stats.totalPodiums++;
                    }

                    // Count poles (qualifying)
                    if (sessionLower.includes('qualifying') && parseInt(result.position) === 1) {
                        stats.totalPoles++;
                    }

                    // Count fastest laps
                    if (result.fastest_lap_rank === '1' || result.fastest_lap_rank === 1) {
                        stats.totalFastestLaps++;
                    }
                });
            });
        });
    });

    return stats;
}

/**
 * Get driver performance by season
 * @param {Object} driver - Driver data
 * @returns {Array} Array of season performance data
 */
export function getSeasonPerformance(driver) {
    if (!driver?.seasons) return [];

    const performance = [];

    Object.entries(driver.seasons).forEach(([year, championships]) => {
        const yearData = {
            year,
            races: 0,
            wins: 0,
            podiums: 0,
            points: 0,
            avgPosition: 0,
            championships: Object.keys(championships).length
        };

        let positionSum = 0;
        let raceCount = 0;

        Object.values(championships).forEach(data => {
            if (data.standing?.points) {
                yearData.points += parseFloat(data.standing.points) || 0;
            }

            Object.values(data).forEach(sessions => {
                if (typeof sessions !== 'object') return;

                Object.entries(sessions).forEach(([session, result]) => {
                    if (session.toLowerCase().includes('race')) {
                        yearData.races++;
                        raceCount++;

                        const position = parseInt(result.position);
                        if (!isNaN(position)) {
                            positionSum += position;
                            if (position === 1) yearData.wins++;
                            if (position <= 3) yearData.podiums++;
                        }
                    }
                });
            });
        });

        yearData.avgPosition = raceCount > 0 ? (positionSum / raceCount).toFixed(2) : 0;
        performance.push(yearData);
    });

    return performance.sort((a, b) => a.year.localeCompare(b.year));
}

/**
 * Get results distribution for a driver
 * @param {Object} driver - Driver data
 * @param {string} sessionType - 'race' or 'qualifying'
 * @returns {Object} Distribution data
 */
export function getResultsDistribution(driver, sessionType = 'race') {
    const distribution = {
        P1: 0,
        P2: 0,
        P3: 0,
        P4_P5: 0,
        P6_P10: 0,
        P11_Plus: 0,
        DNF: 0
    };

    if (!driver?.seasons) return distribution;

    Object.values(driver.seasons).forEach(championships => {
        Object.values(championships).forEach(data => {
            Object.values(data).forEach(sessions => {
                if (typeof sessions !== 'object') return;

                Object.entries(sessions).forEach(([session, result]) => {
                    const sessionLower = session.toLowerCase();
                    const matchesType = sessionType === 'race' 
                        ? sessionLower.includes('race')
                        : sessionLower.includes('qualifying');

                    if (matchesType) {
                        const position = parseInt(result.position);

                        if (result.status?.toLowerCase().includes('dnf') || 
                            result.position?.toLowerCase().includes('ret')) {
                            distribution.DNF++;
                        } else if (position === 1) {
                            distribution.P1++;
                        } else if (position === 2) {
                            distribution.P2++;
                        } else if (position === 3) {
                            distribution.P3++;
                        } else if (position >= 4 && position <= 5) {
                            distribution.P4_P5++;
                        } else if (position >= 6 && position <= 10) {
                            distribution.P6_P10++;
                        } else if (position > 10) {
                            distribution.P11_Plus++;
                        }
                    }
                });
            });
        });
    });

    return distribution;
}

/**
 * Get team statistics
 * @param {Object} team - Team data
 * @returns {Object} Statistics object
 */
export function calculateTeamStats(team) {
    if (!team?.seasons) {
        return {
            totalRaces: 0,
            totalWins: 0,
            totalPodiums: 0,
            totalPoints: 0,
            championships: 0,
            drivers: new Set()
        };
    }

    const stats = {
        totalRaces: 0,
        totalWins: 0,
        totalPodiums: 0,
        totalPoints: 0,
        championships: 0,
        drivers: new Set()
    };

    Object.values(team.seasons).forEach(championships => {
        Object.values(championships).forEach(data => {
            Object.values(data).forEach(events => {
                if (typeof events !== 'object') return;

                Object.values(events).forEach(sessions => {
                    if (typeof sessions !== 'object') return;

                    Object.values(sessions).forEach(result => {
                        if (result.drivers) {
                            result.drivers.forEach(driver => stats.drivers.add(driver));
                        }

                        const position = parseInt(result.position);
                        if (!isNaN(position)) {
                            stats.totalRaces++;
                            if (position === 1) stats.totalWins++;
                            if (position <= 3) stats.totalPodiums++;
                        }

                        if (result.points) {
                            stats.totalPoints += parseFloat(result.points) || 0;
                        }
                    });
                });
            });
        });
    });

    return {
        ...stats,
        drivers: Array.from(stats.drivers)
    };
}

/**
 * Sort items by relevance to search query
 * @param {Array} items - Items to sort
 * @param {string} query - Search query
 * @param {Function} getTextFn - Function to extract text from item
 * @returns {Array} Sorted items
 */
export function sortByRelevance(items, query, getTextFn) {
    const queryLower = query.toLowerCase();

    return items.sort((a, b) => {
        const textA = getTextFn(a).toLowerCase();
        const textB = getTextFn(b).toLowerCase();

        // Exact match at start has highest priority
        const startsWithA = textA.startsWith(queryLower);
        const startsWithB = textB.startsWith(queryLower);

        if (startsWithA && !startsWithB) return -1;
        if (!startsWithA && startsWithB) return 1;

        // Then check if query is contained
        const containsA = textA.includes(queryLower);
        const containsB = textB.includes(queryLower);

        if (containsA && !containsB) return -1;
        if (!containsA && containsB) return 1;

        // Finally, sort alphabetically
        return textA.localeCompare(textB);
    });
}

/**
 * Group data by key
 * @param {Array} array - Array to group
 * @param {string|Function} key - Key or function to get key
 * @returns {Object} Grouped object
 */
export function groupBy(array, key) {
    return array.reduce((result, item) => {
        const groupKey = typeof key === 'function' ? key(item) : item[key];
        if (!result[groupKey]) {
            result[groupKey] = [];
        }
        result[groupKey].push(item);
        return result;
    }, {});
}

/**
 * Calculate percentile
 * @param {Array} arr - Sorted array of numbers
 * @param {number} percentile - Percentile (0-100)
 * @returns {number} Percentile value
 */
export function calculatePercentile(arr, percentile) {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (upper >= sorted.length) return sorted[sorted.length - 1];
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}
