/**
 * API Service - Handle all API communications
 * @module services/ApiService
 */

export class ApiService {
    constructor(baseUrl = '/api') {
        this.baseUrl = baseUrl;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Generic fetch method with error handling
     * @private
     */
    async fetch(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.baseUrl}/${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error?.message || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.data || data;
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            throw error;
        }
    }

    /**
     * Get data with caching
     * @private
     */
    async fetchWithCache(key, fetchFn) {
        const cached = this.cache.get(key);
        
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }

        const data = await fetchFn();
        this.cache.set(key, { data, timestamp: Date.now() });
        return data;
    }

    /**
     * Get driver by ID
     * @param {string} driverId - Driver ID
     * @returns {Promise<Object>} Driver data
     */
    async getDriver(driverId) {
        const cacheKey = `driver-${driverId}`;
        return this.fetchWithCache(cacheKey, async () => {
            const data = await this.fetch(`drivers.php?id=${encodeURIComponent(driverId)}`);
            return Array.isArray(data) ? data[0] : data;
        });
    }

    /**
     * Get all drivers
     * @returns {Promise<Array>} List of driver IDs
     */
    async getAllDrivers() {
        return this.fetchWithCache('drivers-all', () => 
            this.fetch('drivers-list.php')
        );
    }

    /**
     * Get team by ID
     * @param {string} teamId - Team ID
     * @returns {Promise<Object>} Team data
     */
    async getTeam(teamId) {
        const cacheKey = `team-${teamId}`;
        return this.fetchWithCache(cacheKey, async () => {
            const data = await this.fetch(`teams.php?id=${encodeURIComponent(teamId)}`);
            return Array.isArray(data) ? data[0] : data;
        });
    }

    /**
     * Get all teams
     * @returns {Promise<Array>} List of team IDs
     */
    async getAllTeams() {
        return this.fetchWithCache('teams-all', () => 
            this.fetch('teams-list.php')
        );
    }

    /**
     * Get race/championship by ID and year
     * @param {string} championshipId - Championship ID
     * @param {number} [year] - Year (optional)
     * @returns {Promise<Object>} Race data
     */
    async getRace(championshipId, year = null) {
        const cacheKey = `race-${championshipId}-${year || 'latest'}`;
        return this.fetchWithCache(cacheKey, async () => {
            const url = year 
                ? `races.php?id=${encodeURIComponent(championshipId)}&year=${year}`
                : `races.php?id=${encodeURIComponent(championshipId)}`;
            const data = await this.fetch(url);
            return Array.isArray(data) ? data[0] : data;
        });
    }

    /**
     * Search across all entities
     * @param {string} query - Search query
     * @param {number} [limit=10] - Maximum results
     * @returns {Promise<Array>} Search results
     */
    async search(query, limit = 10) {
        if (!query || query.length < 2) {
            return [];
        }

        // Don't cache searches as they are dynamic
        return this.fetch(`search.php?search=${encodeURIComponent(query)}&limit=${limit}`);
    }

    /**
     * Get picture URL for an entity
     * @param {string} folder - Folder name (drivers, teams, races)
     * @param {string} id - Entity ID
     * @returns {Promise<string|null>} Picture URL or null
     */
    async getPicture(folder, id) {
        const extensions = ['png', 'jpg', 'jpeg', 'webp', 'svg'];
        
        for (const ext of extensions) {
            const url = `/${folder}/picture/${id}.${ext}`;
            try {
                const response = await fetch(url, { method: 'HEAD' });
                if (response.ok) {
                    return url;
                }
            } catch {
                continue;
            }
        }
        
        return `/${folder}/picture/default.png`;
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }

    /**
     * Clear specific cache entry
     * @param {string} key - Cache key
     */
    clearCacheEntry(key) {
        this.cache.delete(key);
    }
}

// Export singleton instance
export const apiService = new ApiService();
