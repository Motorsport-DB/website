/**
 * MotorsportDB - Data Processor
 * Functions for processing and calculating statistics from driver/team/race data
 */

import { calculatePercentage, groupBy, sortBy } from './helpers.js';

/**
 * Check if a session is a race session (not practice, grid, or warm-up)
 * @param {string} session - Session name
 * @returns {boolean}
 */
export function isRaceSession(session) {
    if (!session) return false;
    const sessionLower = session.toLowerCase();
    
    // Exclude practice sessions
    if (sessionLower.includes('practice') || sessionLower.includes('warm')) {
        return false;
    }
    
    // Exclude grid sessions (Starting Grid, Grid 2, etc.)
    if (sessionLower === 'grid' || sessionLower === 'grid 2' || sessionLower.includes('starting grid')) {
        return false;
    }
    
    // Include race sessions
    return sessionLower.includes('race') ||
           sessionLower === 'final' ||
           sessionLower === 'feature' ||
           sessionLower === 'sprint' ||
           sessionLower === 'rally';
}

/**
 * Check if a session decides the pole position (final qualifying only,
 * not Q1/Q2, qualifying groups or sprint qualifying).
 * @param {string} session - Session name
 * @returns {boolean}
 */
export function isPoleSession(session) {
    if (!session) return false;
    const s = session.toLowerCase().trim();
    return s === 'qualifying' || s === 'qualifying session' || s === 'q3' || s.endsWith('hyperpole');
}

/**
 * Was this result the fastest lap of the race?
 * @param {Object} result - Session result
 * @returns {boolean}
 */
export function hasFastestLapOfRace(result) {
    const info = result && result.other_info;
    return !!info && (info.fastestLapOfRace === 'yes' || info.fastest_lap_of_race === 'yes');
}

/**
 * Check if a session is a qualifying session
 * @param {string} session - Session name
 * @returns {boolean}
 */
export function isQualifyingSession(session) {
    if (!session) return false;
    return session.toLowerCase().includes('qualifying');
}

/**
 * Calculate driver statistics
 * @param {Object} driver - Driver data
 * @returns {Object}
 */
export function calculateDriverStats(driver) {
    
    if (!driver || !driver.seasons) {
        console.warn("⚠️  No driver or no seasons data");
        return {
            totalRaces: 0,
            wins: 0,
            podiums: 0,
            poles: 0,
            fastestLaps: 0,
            dnfs: 0,
            championships: 0,
            winRate: 0,
            podiumRate: 0,
            finishRate: 0,
        };
    }

    let totalRaces = 0;
    let wins = 0;
    let podiums = 0;
    let poles = 0;
    let fastestLaps = 0;
    let dnfs = 0;
    let top10Finishes = 0;
    let outsideTop10 = 0;
    let disqualifications = 0;
    let championships = 0;


    // Iterate through all years
    Object.entries(driver.seasons).forEach(([year, yearData]) => {
        
        // Iterate through championships in that year
        Object.entries(yearData).forEach(([championship, championshipData]) => {
            
            // Iterate through events
            Object.entries(championshipData).forEach(([event, eventData]) => {
                // Iterate through sessions (Race, Qualifying, etc.)
                Object.entries(eventData).forEach(([session, result]) => {
                    // Only count race sessions for stats
                    if (isRaceSession(session)) {
                        const posStr = result.position ? String(result.position).toUpperCase() : '';
                        const pos = parseInt(result.position);
                        
                        totalRaces++;
                        
                        // Disqualifications first, then any other non-numeric status (DNF, DNS, NC…)
                        if (posStr.includes('DSQ') || posStr.includes('DISQUALIFIED') || posStr === 'EXC') {
                            disqualifications++;
                        } else if (!result.position || !pos || pos === 0) {
                            dnfs++;
                        } else {
                            // Valid numeric position
                            if (pos === 1) wins++;
                            if (pos <= 3 && pos > 0) podiums++;
                            if (pos <= 10 && pos > 0) top10Finishes++;
                            if (pos > 10) outsideTop10++;
                        }
                    }
                    
                    // Pole positions: final qualifying session only
                    if (isPoleSession(session) && String(result.position) === '1') {
                        poles++;
                    }

                    // Fastest lap of the race (not every recorded lap time)
                    if (isRaceSession(session) && hasFastestLapOfRace(result)) {
                        fastestLaps++;
                    }
                });
            });
            
            // Count each championship participation (not just titles)
            championships++;
        });
    });

    const finishes = totalRaces - dnfs;


    return {
        totalRaces,
        wins,
        podiums,
        poles,
        fastestLaps,
        dnfs,
        finishes,
        top10Finishes,
        outsideTop10,
        disqualifications,
        championships,
        winRate: calculatePercentage(wins, totalRaces),
        podiumRate: calculatePercentage(podiums, totalRaces),
        finishRate: calculatePercentage(finishes, totalRaces),
    };
}

/**
 * Get driver's season performance
 * @param {Object} driver - Driver data
 * @returns {Object}
 */
export function getSeasonPerformance(driver) {
    if (!driver || !driver.seasons) return {};

    const performance = {};

    Object.entries(driver.seasons).forEach(([year, yearData]) => {
        // Aggregate all championships in the same year
        let races = 0;
        let wins = 0;
        let podiums = 0;
        let poles = 0;
        let totalPoints = 0;
        let positionSum = 0;
        let positionCount = 0;
        
        Object.entries(yearData).forEach(([championship, championshipData]) => {
            Object.entries(championshipData).forEach(([event, eventData]) => {
                Object.entries(eventData).forEach(([session, result]) => {
                    if (isRaceSession(session)) {
                        races++;
                        const pos = parseInt(result.position);
                        
                        // Only count valid numeric positions for wins/podiums
                        if (result.position && pos > 0) {
                            if (pos === 1) wins++;
                            if (pos <= 3) podiums++;
                            
                            positionSum += pos;
                            positionCount++;
                        }
                        
                        if (result.points) {
                            totalPoints += parseFloat(result.points) || 0;
                        }
                    }
                    
                    if (isPoleSession(session) && String(result.position) === '1') {
                        poles++;
                    }
                });
            });
        });

        if (positionCount > 0) {
            const avgPosition = positionSum / positionCount;
            performance[year] = {
                year,
                races,
                wins,
                podiums,
                poles,
                points: totalPoints,
                avgPosition: avgPosition.toFixed(2)
            };
        }
    });

    return performance;
}

/**
 * Get position distribution
 * @param {Object} driver - Driver data
 * @returns {Object}
 */
export function getPositionDistribution(driver) {
    if (!driver || !driver.seasons) return {};

    const distribution = {};

    Object.entries(driver.seasons).forEach(([year, yearData]) => {
        Object.entries(yearData).forEach(([championship, championshipData]) => {
            Object.entries(championshipData).forEach(([event, eventData]) => {
                Object.entries(eventData).forEach(([session, result]) => {
                    if (isRaceSession(session)) {
                        // If position is missing or invalid, count as DNF
                        const pos = result.position || 'DNF';
                        distribution[pos] = (distribution[pos] || 0) + 1;
                    }
                });
            });
        });
    });

    return distribution;
}

/**
 * Calculate team statistics
 * @param {Object} team - Team data
 * @returns {Object}
 */
export function calculateTeamStats(team) {
    
    if (!team || !team.seasons) {
        console.warn("⚠️  No team or no seasons data");
        return {
            totalRaces: 0,
            wins: 0,
            podiums: 0,
            top10: 0,
            other: 0,
            dnf: 0,
            poles: 0,
            constructorTitles: 0,
            winRate: 0,
            podiumRate: 0,
        };
    }

    let totalRaces = 0;
    let wins = 0;
    let podiums = 0; // P2-P3 only
    let top10 = 0; // P4-P10
    let other = 0; // P11+
    let dnf = 0; // DNF/DSQ/DNS
    let poles = 0;


    Object.entries(team.seasons).forEach(([year, yearData]) => {
        Object.entries(yearData).forEach(([championship, championshipData]) => {
            Object.entries(championshipData).forEach(([event, eventData]) => {
                Object.entries(eventData).forEach(([session, sessionData]) => {
                    // sessionData can have multiple car numbers (drivers)
                    Object.entries(sessionData).forEach(([carNumber, result]) => {
                        if (isRaceSession(session)) {
                            totalRaces++;
                            
                            // If position is missing, count as DNF
                            if (!result.position) {
                                dnf++;
                                return;
                            }
                            
                            const posStr = result.position.toString().toUpperCase();
                            
                            // Check for DNF/DSQ/DNS
                            if (posStr === 'DNF' || posStr === 'DSQ' || posStr === 'DNS') {
                                dnf++;
                            } else {
                                const pos = parseInt(result.position);
                                if (!isNaN(pos) && pos > 0) {
                                    if (pos === 1) {
                                        wins++;
                                    } else if (pos >= 2 && pos <= 3) {
                                        podiums++;
                                    } else if (pos >= 4 && pos <= 10) {
                                        top10++;
                                    } else if (pos >= 11) {
                                        other++;
                                    }
                                } else {
                                    // Invalid numeric position = DNF
                                    dnf++;
                                }
                            }
                        }
                        
                        if (isPoleSession(session) && String(result.position) === '1') {
                            poles++;
                        }
                    });
                });
            });
        });
    });

    const constructorTitles = team.constructorChampionships 
        ? team.constructorChampionships.length 
        : 0;


    return {
        totalRaces,
        wins,
        podiums, // P2-P3 only
        top10, // P4-P10
        other, // P11+
        dnf, // DNF/DSQ/DNS
        poles,
        constructorTitles,
        winRate: calculatePercentage(wins, totalRaces),
        podiumRate: calculatePercentage(podiums, totalRaces),
    };
}

/**
 * Get team's season performance
 * @param {Object} team - Team data
 * @returns {Object}
 */
export function getTeamSeasonPerformance(team) {
    if (!team || !team.seasons) return {};

    const performance = {};

    Object.entries(team.seasons).forEach(([year, yearData]) => {
        // Aggregate all championships in the same year
        let races = 0;
        let wins = 0;
        let podiums = 0;
        let poles = 0;

        Object.entries(yearData).forEach(([championship, championshipData]) => {
            Object.entries(championshipData).forEach(([event, eventData]) => {
                Object.entries(eventData).forEach(([session, sessionData]) => {
                    if (isRaceSession(session)) {
                        Object.values(sessionData).forEach(result => {
                            if (result.position) {
                                races++;
                                const pos = parseInt(result.position);
                                if (pos === 1) wins++;
                                if (pos <= 3 && pos > 0) podiums++;
                            }
                        });
                    }
                    
                    if (isQualifyingSession(session)) {
                        Object.values(sessionData).forEach(result => {
                            if (result.position === '1') {
                                poles++;
                            }
                        });
                    }
                });
            });
        });

        // Aggregate by year only
        performance[year] = {
            year,
            races,
            wins,
            podiums,
            poles
        };
    });

    return performance;
}

/**
 * Group races by championship
 * @param {Object} races - Races data
 * @returns {Object}
 */
export function groupRacesByChampionship(races) {
    if (!races) return {};

    const grouped = {};

    Object.entries(races).forEach(([championship, championshipData]) => {
        grouped[championship] = {};
        
        Object.entries(championshipData).forEach(([year, yearRaces]) => {
            if (Array.isArray(yearRaces)) {
                grouped[championship][year] = yearRaces;
            }
        });
    });

    return grouped;
}

/**
 * Get championship years
 * @param {Object} races - Races data
 * @returns {Array}
 */
export function getChampionshipYears(races) {
    if (!races) return [];

    const years = new Set();

    Object.values(races).forEach(championship => {
        Object.keys(championship).forEach(year => {
            years.add(year);
        });
    });

    return Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
}

/**
 * Calculate head-to-head comparison
 * @param {Object} driver1 - First driver
 * @param {Object} driver2 - Second driver
 * @returns {Object}
 */
export function calculateHeadToHead(driver1, driver2) {
    const stats1 = calculateDriverStats(driver1);
    const stats2 = calculateDriverStats(driver2);

    return {
        driver1: {
            name: `${driver1.firstName} ${driver1.lastName}`,
            stats: stats1,
        },
        driver2: {
            name: `${driver2.firstName} ${driver2.lastName}`,
            stats: stats2,
        },
        comparison: {
            races: stats1.totalRaces - stats2.totalRaces,
            wins: stats1.wins - stats2.wins,
            podiums: stats1.podiums - stats2.podiums,
            poles: stats1.poles - stats2.poles,
        },
    };
}

/**
 * Find common races between two drivers
 * @param {Object} driver1 - First driver
 * @param {Object} driver2 - Second driver
 * @returns {Array}
 */
export function findCommonRaces(driver1, driver2) {
    if (!driver1.races || !driver2.races) return [];

    const commonRaces = [];

    Object.entries(driver1.races).forEach(([championship, champ1Data]) => {
        if (driver2.races[championship]) {
            Object.entries(champ1Data).forEach(([year, races1]) => {
                if (driver2.races[championship][year]) {
                    const races2 = driver2.races[championship][year];
                    
                    races1.forEach(race1 => {
                        const race2 = races2.find(r => r.raceName === race1.raceName);
                        if (race2) {
                            commonRaces.push({
                                championship,
                                year,
                                raceName: race1.raceName,
                                driver1Position: race1.position,
                                driver2Position: race2.position,
                                driver1Grid: race1.grid,
                                driver2Grid: race2.grid,
                            });
                        }
                    });
                }
            });
        }
    });

    return commonRaces;
}

/**
 * Calculate radar chart data for driver
 * @param {Object} driver - Driver data
 * @returns {Object}
 */
export function getDriverRadarData(driver) {
    const stats = calculateDriverStats(driver);
    
    // Normalize values to 0-100 scale
    const normalize = (value, max) => Math.min((value / max) * 100, 100);

    return {
        labels: ['Win Rate', 'Podium Rate', 'Finish Rate', 'Poles', 'Fastest Laps'],
        values: [
            stats.winRate,
            stats.podiumRate,
            stats.finishRate,
            normalize(stats.poles, 50), // Assume max 50 poles
            normalize(stats.fastestLaps, 50), // Assume max 50 fastest laps
        ],
    };
}

/**
 * Get results distribution for charts
 * @param {Object} driver - Driver data
 * @returns {Object}
 */
export function getResultsDistribution(driver) {
    const distribution = getPositionDistribution(driver);
    
    const categories = {
        wins: 0,
        podiums: 0,
        points: 0,
        other: 0,
        dnf: 0,
    };

    Object.entries(distribution).forEach(([position, count]) => {
        const pos = parseInt(position);
        
        if (pos === 1) {
            categories.wins += count;
        } else if (pos >= 2 && pos <= 3) {
            categories.podiums += count;
        } else if (pos >= 4 && pos <= 10) {
            categories.points += count;
        } else if (!isNaN(pos)) {
            categories.other += count;
        } else {
            categories.dnf += count;
        }
    });

    return {
        labels: ['Wins', 'Podiums (2-3)', 'Points (4-10)', 'Other', 'DNF'],
        data: [
            categories.wins,
            categories.podiums,
            categories.points,
            categories.other,
            categories.dnf,
        ],
    };
}
