/**
 * MotorsportDB - Head-to-Head Processor
 * Advanced comparison functions for multi-driver head-to-head analysis
 */

import { calculateDriverStats, isRaceSession, isQualifyingSession } from './dataProcessor.js';

/**
 * Calculate comprehensive head-to-head comparison for 2-5 drivers
 * @param {Array} drivers - Array of driver objects
 * @param {string} mode - Comparison mode: 'all', 'common-championships', 'common-races', 'same-team'
 * @returns {Object} Comprehensive comparison data
 */
export function calculateAdvancedHeadToHead(drivers, mode = 'all') {
    console.log(`🔄 calculateAdvancedHeadToHead: ${drivers.length} drivers, mode: ${mode}`);
    
    const driversStats = drivers.map(driver => {
        const basicStats = calculateDriverStats(driver);
        const detailedStats = calculateDetailedDriverStats(driver, drivers, mode);
        
        return {
            id: driver.id,
            name: `${driver.firstName} ${driver.lastName}`,
            firstName: driver.firstName,
            lastName: driver.lastName,
            country: driver.country,
            image: driver.picture || 'drivers/picture/default.png',
            basicStats,
            detailedStats,
            seasons: driver.seasons
        };
    });
    
    // Calculate head-to-head battles
    const battles = calculateDirectBattles(driversStats, mode);
    
    // Get race results for detailed comparison
    const raceResults = extractRaceResults(driversStats, mode);
    
    return {
        drivers: driversStats,
        battles,
        raceResults,
        mode,
        summary: calculateComparisonSummary(driversStats, battles)
    };
}

/**
 * Calculate detailed statistics for a driver based on comparison mode
 * @param {Object} driver - Driver object
 * @param {Array} allDrivers - All drivers being compared
 * @param {string} mode - Comparison mode
 * @returns {Object} Detailed statistics
 */
function calculateDetailedDriverStats(driver, allDrivers, mode) {
    if (!driver || !driver.seasons) {
        return getEmptyDetailedStats();
    }
    
    let stats = {
        totalRaces: 0,
        totalQualifying: 0,
        wins: 0,
        podiums: 0,
        top5: 0,
        top10: 0,
        otherFinishes: 0,
        dnfs: 0,
        dsq: 0,
        dns: 0,
        poles: 0,
        fastestLaps: 0,
        positionSum: 0,
        qualifyingSum: 0,
        qualifyingCount: 0,
        racePositions: [],
        qualifyingPositions: [],
        championships: new Set(),
        teams: new Set(),
        yearRange: { min: Infinity, max: -Infinity }
    };
    
    // Get filter based on mode
    const filter = getComparisonFilter(driver, allDrivers, mode);
    
    // Process all seasons
    Object.entries(driver.seasons).forEach(([year, yearData]) => {
        const yearNum = parseInt(year);
        
        Object.entries(yearData).forEach(([championship, championshipData]) => {
            Object.entries(championshipData).forEach(([event, eventData]) => {
                // Check if this race should be included based on mode
                if (!shouldIncludeRace(year, championship, event, eventData, filter, mode, allDrivers)) {
                    return;
                }
                
                stats.championships.add(championship);
                
                Object.entries(eventData).forEach(([session, result]) => {
                    // Track team
                    if (result.team) {
                        stats.teams.add(result.team);
                    }
                    
                    // Track year range
                    if (yearNum < stats.yearRange.min) stats.yearRange.min = yearNum;
                    if (yearNum > stats.yearRange.max) stats.yearRange.max = yearNum;
                    
                    // Process race sessions
                    if (isRaceSession(session)) {
                        stats.totalRaces++;
                        
                        // If position is missing, count as DNF
                        if (!result.position) {
                            stats.dnfs++;
                            return;
                        }
                        
                        const posStr = String(result.position).toUpperCase();
                        const pos = parseInt(result.position);
                        
                        // Check for special positions
                        if (posStr.includes('DNF') || posStr.includes('NC')) {
                            stats.dnfs++;
                        } else if (posStr.includes('DSQ') || posStr.includes('DQ')) {
                            stats.dsq++;
                        } else if (posStr.includes('DNS')) {
                            stats.dns++;
                        } else if (!isNaN(pos) && pos > 0) {
                            // Valid finishing position
                            stats.racePositions.push(pos);
                            stats.positionSum += pos;
                            
                            if (pos === 1) stats.wins++;
                            if (pos <= 3) stats.podiums++;
                            if (pos <= 5) stats.top5++;
                            if (pos <= 10) stats.top10++;
                            if (pos > 10) stats.otherFinishes++;
                        } else {
                            // Invalid numeric position = DNF
                            stats.dnfs++;
                        }
                        
                        // Check for fastest lap
                        if (result.fastestLap === true || result.fastestLap === 'true') {
                            stats.fastestLaps++;
                        }
                    }
                    
                    // Process qualifying sessions
                    if (isQualifyingSession(session)) {
                        const pos = parseInt(result.position);
                        if (!isNaN(pos) && pos > 0) {
                            stats.totalQualifying++;
                            stats.qualifyingSum += pos;
                            stats.qualifyingCount++;
                            stats.qualifyingPositions.push(pos);
                            
                            if (pos === 1) stats.poles++;
                        }
                    }
                });
            });
        });
    });
    
    // Calculate derived statistics
    const finishedRaces = stats.totalRaces - stats.dnfs - stats.dsq - stats.dns;
    const avgPosition = finishedRaces > 0 ? (stats.positionSum / finishedRaces) : 0;
    const avgQualifying = stats.qualifyingCount > 0 ? (stats.qualifyingSum / stats.qualifyingCount) : 0;
    const qualifyingVsRace = avgQualifying > 0 && avgPosition > 0 ? avgPosition - avgQualifying : 0;
    
    return {
        ...stats,
        championships: Array.from(stats.championships),
        teams: Array.from(stats.teams),
        finishedRaces,
        avgPosition: parseFloat(avgPosition.toFixed(2)),
        avgQualifying: parseFloat(avgQualifying.toFixed(2)),
        qualifyingVsRace: parseFloat(qualifyingVsRace.toFixed(2)),
        winRate: stats.totalRaces > 0 ? parseFloat(((stats.wins / stats.totalRaces) * 100).toFixed(1)) : 0,
        podiumRate: stats.totalRaces > 0 ? parseFloat(((stats.podiums / stats.totalRaces) * 100).toFixed(1)) : 0,
        finishRate: stats.totalRaces > 0 ? parseFloat(((finishedRaces / stats.totalRaces) * 100).toFixed(1)) : 0,
        dnfRate: stats.totalRaces > 0 ? parseFloat(((stats.dnfs / stats.totalRaces) * 100).toFixed(1)) : 0
    };
}

/**
 * Calculate direct battles between drivers
 * @param {Array} driversStats - Array of driver stats
 * @param {string} mode - Comparison mode
 * @returns {Object} Battle statistics - single global battle for all drivers
 */
function calculateDirectBattles(driversStats, mode) {
    // Create a single global battle tracking
    const globalBattle = {
        mode,
        drivers: driversStats.map(d => ({ id: d.id, name: d.name, finishesAhead: 0 })),
        commonRaces: 0,
        raceDetails: []
    };
    
    // Find all common races where ALL drivers participated
    const commonRaces = findCommonRaces(driversStats, mode);
    globalBattle.commonRaces = commonRaces.length;
    
    // For each common race, determine who finished ahead
    commonRaces.forEach(race => {
        const { year, championship, event } = race;
        const positions = [];
        
        driversStats.forEach(driver => {
            const eventData = driver.seasons[year]?.[championship]?.[event];
            if (eventData) {
                const raceResult = getRaceResult(eventData);
                if (raceResult) {
                    const pos = parseRacePosition(raceResult.position);
                    positions.push({
                        driverId: driver.id,
                        name: driver.name,
                        position: pos.value,
                        isDNF: pos.dnf,
                        team: raceResult.team
                    });
                }
            }
        });
        
        // Sort by position (DNFs go to the end)
        positions.sort((a, b) => a.position - b.position);
        
        // Award points: best finisher gets point
        if (positions.length > 0 && !positions[0].isDNF) {
            const winner = globalBattle.drivers.find(d => d.id === positions[0].driverId);
            if (winner) winner.finishesAhead++;
        }
        
        globalBattle.raceDetails.push({
            year,
            championship,
            event,
            positions
        });
    });
    
    return globalBattle;
}

/**
 * Find all common races based on mode
 * @param {Array} driversStats - Array of driver stats
 * @param {string} mode - Comparison mode
 * @returns {Array} Common races
 */
function findCommonRaces(driversStats, mode) {
    const commonRaces = [];
    const raceMap = new Map();
    
    // Collect all races from first driver
    const firstDriver = driversStats[0];
    if (!firstDriver.seasons) return [];
    
    Object.entries(firstDriver.seasons).forEach(([year, yearData]) => {
        Object.entries(yearData).forEach(([championship, championshipData]) => {
            Object.entries(championshipData).forEach(([event, eventData]) => {
                const raceKey = `${year}-${championship}-${event}`;
                raceMap.set(raceKey, { year, championship, event, count: 1, teams: new Set() });
                
                const team = getTeamForRace(eventData);
                if (team) raceMap.get(raceKey).teams.add(team);
            });
        });
    });
    
    // Check if other drivers have these races
    for (let i = 1; i < driversStats.length; i++) {
        const driver = driversStats[i];
        if (!driver.seasons) continue;
        
        raceMap.forEach((race, key) => {
            const { year, championship, event } = race;
            if (driver.seasons[year]?.[championship]?.[event]) {
                race.count++;
                const team = getTeamForRace(driver.seasons[year][championship][event]);
                if (team) race.teams.add(team);
            }
        });
    }
    
    // Filter based on mode
    raceMap.forEach((race, key) => {
        if (mode === 'same-team') {
            // All drivers must be present AND in same team
            if (race.count === driversStats.length && race.teams.size === 1) {
                commonRaces.push(race);
            }
        } else if (mode === 'common-races') {
            // All drivers must be present
            if (race.count === driversStats.length) {
                commonRaces.push(race);
            }
        } else {
            // For other modes, include if at least 2 drivers
            if (race.count >= 2) {
                commonRaces.push(race);
            }
        }
    });
    
    return commonRaces;
}

/**
 * Calculate battle results between two specific drivers
 * @param {Object} driver1 - First driver stats
 * @param {Object} driver2 - Second driver stats
 * @param {string} mode - Comparison mode
 * @returns {Object} Battle results
 */
function calculateBattleBetweenTwo(driver1, driver2, mode) {
    let driver1Ahead = 0;
    let driver2Ahead = 0;
    let bothDNF = 0;
    let commonRaces = 0;
    const raceDetails = [];
    
    // Find common races
    Object.entries(driver1.seasons || {}).forEach(([year, yearData]) => {
        if (!driver2.seasons || !driver2.seasons[year]) return;
        
        Object.entries(yearData).forEach(([championship, championshipData]) => {
            if (!driver2.seasons[year][championship]) return;
            
            Object.entries(championshipData).forEach(([event, eventData]) => {
                if (!driver2.seasons[year][championship][event]) return;
                
                // Check if they were in the same team (if that's the mode)
                if (mode === 'same-team') {
                    const team1 = getTeamForRace(eventData);
                    const team2 = getTeamForRace(driver2.seasons[year][championship][event]);
                    if (team1 !== team2 || !team1) return;
                }
                
                // Find race results
                const race1 = getRaceResult(eventData);
                const race2 = getRaceResult(driver2.seasons[year][championship][event]);
                
                if (!race1 || !race2) return;
                
                commonRaces++;
                
                const pos1 = parseRacePosition(race1.position);
                const pos2 = parseRacePosition(race2.position);
                
                if (pos1.dnf && pos2.dnf) {
                    bothDNF++;
                } else if (pos1.dnf) {
                    driver2Ahead++;
                } else if (pos2.dnf) {
                    driver1Ahead++;
                } else if (pos1.value < pos2.value) {
                    driver1Ahead++;
                } else if (pos2.value < pos1.value) {
                    driver2Ahead++;
                }
                
                raceDetails.push({
                    year,
                    championship,
                    event,
                    driver1Position: race1.position,
                    driver2Position: race2.position,
                    driver1Team: race1.team,
                    driver2Team: race2.team
                });
            });
        });
    });
    
    return {
        driver1: { id: driver1.id, name: driver1.name },
        driver2: { id: driver2.id, name: driver2.name },
        driver1Ahead,
        driver2Ahead,
        bothDNF,
        commonRaces,
        raceDetails
    };
}

/**
 * Extract detailed race results for all drivers
 * @param {Array} driversStats - Array of driver stats
 * @param {string} mode - Comparison mode
 * @returns {Array} Race results
 */
function extractRaceResults(driversStats, mode) {
    const results = [];
    const raceMap = new Map();
    
    // Collect all races from all drivers
    driversStats.forEach(driver => {
        if (!driver.seasons) return;
        
        Object.entries(driver.seasons).forEach(([year, yearData]) => {
            Object.entries(yearData).forEach(([championship, championshipData]) => {
                Object.entries(championshipData).forEach(([event, eventData]) => {
                    const raceKey = `${year}-${championship}-${event}`;
                    
                    if (!raceMap.has(raceKey)) {
                        raceMap.set(raceKey, {
                            year,
                            championship,
                            event,
                            drivers: []
                        });
                    }
                    
                    const race = getRaceResult(eventData);
                    const quali = getQualifyingResult(eventData);
                    
                    if (race) {
                        raceMap.get(raceKey).drivers.push({
                            driverId: driver.id,
                            name: driver.name,
                            team: race.team,
                            racePosition: race.position,
                            qualifyingPosition: quali ? quali.position : 'N/A',
                            fastestLap: race.fastestLap || false
                        });
                    }
                });
            });
        });
    });
    
    // Convert map to array and filter based on mode
    raceMap.forEach((race, key) => {
        const totalDrivers = driversStats.length;
        
        // For 'common-races' mode, only include races where ALL drivers participated
        if (mode === 'common-races') {
            if (race.drivers.length === totalDrivers) {
                results.push(race);
            }
            return;
        }
        
        // For 'same-team' mode, only include races where ALL drivers were in the SAME team
        if (mode === 'same-team') {
            if (race.drivers.length === totalDrivers) {
                // Check if all drivers have the same team
                const teams = race.drivers.map(d => d.team).filter(t => t);
                if (teams.length === totalDrivers && new Set(teams).size === 1) {
                    results.push(race);
                }
            }
            return;
        }
        
        // For 'common-championships' mode, include races where at least 2 drivers participated
        // (we already filtered by championship in calculateDetailedDriverStats)
        if (mode === 'common-championships') {
            if (race.drivers.length >= 2) {
                results.push(race);
            }
            return;
        }
        
        // For 'all' mode, include races where at least 1 driver participated
        if (mode === 'all') {
            results.push(race);
        }
    });
    
    // Sort by year and championship
    return results.sort((a, b) => {
        if (a.year !== b.year) return parseInt(b.year) - parseInt(a.year);
        return a.championship.localeCompare(b.championship);
    });
}

/**
 * Calculate summary statistics for the comparison
 * @param {Array} driversStats - Array of driver stats
 * @param {Object} battles - Battle results (single global battle object)
 * @returns {Object} Summary
 */
function calculateComparisonSummary(driversStats, battles) {
    const totalRaces = Math.max(...driversStats.map(d => d.detailedStats.totalRaces));
    const totalWins = driversStats.reduce((sum, d) => sum + d.detailedStats.wins, 0);
    const totalPodiums = driversStats.reduce((sum, d) => sum + d.detailedStats.podiums, 0);
    
    // Find common championships
    const championshipSets = driversStats.map(d => new Set(d.detailedStats.championships));
    const commonChampionships = championshipSets.reduce((common, set) => {
        return new Set([...common].filter(x => set.has(x)));
    });
    
    return {
        totalDrivers: driversStats.length,
        totalRaces,
        totalWins,
        totalPodiums,
        commonChampionships: Array.from(commonChampionships),
        totalBattles: battles ? battles.commonRaces : 0
    };
}

// Helper functions

function getEmptyDetailedStats() {
    return {
        totalRaces: 0,
        totalQualifying: 0,
        wins: 0,
        podiums: 0,
        top5: 0,
        top10: 0,
        otherFinishes: 0,
        dnfs: 0,
        dsq: 0,
        dns: 0,
        poles: 0,
        fastestLaps: 0,
        finishedRaces: 0,
        avgPosition: 0,
        avgQualifying: 0,
        qualifyingVsRace: 0,
        winRate: 0,
        podiumRate: 0,
        finishRate: 0,
        dnfRate: 0,
        championships: [],
        teams: []
    };
}

function getComparisonFilter(driver, allDrivers, mode) {
    // This will be enhanced based on mode
    return {
        championships: new Set(),
        races: new Set(),
        teams: new Set()
    };
}

function shouldIncludeRace(year, championship, event, eventData, filter, mode, allDrivers) {
    // For 'all' mode, include everything
    if (mode === 'all') return true;
    
    // For same-team mode, check if ALL drivers are in the same team for this race
    if (mode === 'same-team') {
        const currentTeam = getTeamForRace(eventData);
        if (!currentTeam) return false;
        
        // Collect all teams for this race from all drivers
        const teamsInRace = [];
        let driversInRace = 0;
        
        for (const otherDriver of allDrivers) {
            if (!otherDriver.seasons || !otherDriver.seasons[year]) continue;
            if (!otherDriver.seasons[year][championship]) continue;
            if (!otherDriver.seasons[year][championship][event]) continue;
            
            const otherTeam = getTeamForRace(otherDriver.seasons[year][championship][event]);
            if (otherTeam) {
                teamsInRace.push(otherTeam);
                driversInRace++;
            }
        }
        
        // Only include if ALL drivers participated and ALL are in the SAME team
        if (driversInRace === allDrivers.length) {
            const uniqueTeams = new Set(teamsInRace);
            return uniqueTeams.size === 1 && uniqueTeams.has(currentTeam);
        }
        
        return false;
    }
    
    // For common-championships mode
    if (mode === 'common-championships') {
        // Check if all drivers have this championship
        for (const otherDriver of allDrivers) {
            if (!otherDriver.seasons) continue;
            let hasChampionship = false;
            for (const y in otherDriver.seasons) {
                if (otherDriver.seasons[y][championship]) {
                    hasChampionship = true;
                    break;
                }
            }
            if (!hasChampionship) return false;
        }
        return true;
    }
    
    // For common-races mode
    if (mode === 'common-races') {
        // Check if all drivers have this exact race
        for (const otherDriver of allDrivers) {
            if (!otherDriver.seasons || !otherDriver.seasons[year]) return false;
            if (!otherDriver.seasons[year][championship]) return false;
            if (!otherDriver.seasons[year][championship][event]) return false;
        }
        return true;
    }
    
    return true;
}

function getTeamForRace(eventData) {
    const raceResult = getRaceResult(eventData);
    return raceResult ? raceResult.team : null;
}

function getRaceResult(eventData) {
    for (const [session, result] of Object.entries(eventData)) {
        if (isRaceSession(session) && result.position) {
            return result;
        }
    }
    return null;
}

function getQualifyingResult(eventData) {
    for (const [session, result] of Object.entries(eventData)) {
        if (isQualifyingSession(session) && result.position) {
            return result;
        }
    }
    return null;
}

function parseRacePosition(position) {
    const posStr = String(position).toUpperCase();
    const isDNF = posStr.includes('DNF') || posStr.includes('NC') || 
                   posStr.includes('DSQ') || posStr.includes('DNS');
    const value = parseInt(position);
    
    return {
        value: isDNF || isNaN(value) ? 999 : value,
        dnf: isDNF
    };
}
