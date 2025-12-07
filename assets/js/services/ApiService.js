/**
 * MotorsportDB - API Service
 * Centralized API communication with caching, error handling, and rate limiting
 */

import { API_ENDPOINTS, CACHE_CONFIG, ERROR_MESSAGES } from '../config/constants.js';

class ApiService {
    constructor() {
        this.cache = new Map();
        this.pendingRequests = new Map();
        this.cacheEnabled = CACHE_CONFIG.ENABLED;
        this.cacheTTL = CACHE_CONFIG.TTL;
    }

    /**
     * Generic fetch method with caching and error handling
     * @param {string} url - API endpoint URL
     * @param {Object} options - Fetch options
     * @param {boolean} useCache - Whether to use cache
     * @returns {Promise<Object>}
     */
    async fetch(url, options = {}, useCache = true) {
        const cacheKey = this._getCacheKey(url, options);

        // Check cache first
        if (useCache && this.cacheEnabled) {
            const cached = this._getFromCache(cacheKey);
            if (cached) return cached;
        }

        // Check if request is already pending
        if (this.pendingRequests.has(cacheKey)) {
            return this.pendingRequests.get(cacheKey);
        }

        // Create new request
        const requestPromise = this._executeRequest(url, options)
            .then(data => {
                if (useCache && this.cacheEnabled) {
                    this._addToCache(cacheKey, data);
                }
                this.pendingRequests.delete(cacheKey);
                return data;
            })
            .catch(error => {
                this.pendingRequests.delete(cacheKey);
                throw error;
            });

        this.pendingRequests.set(cacheKey, requestPromise);
        return requestPromise;
    }

    /**
     * Execute the actual HTTP request
     * @private
     */
    async _executeRequest(url, options) {
        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
                ...options,
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // Handle new API format
            if (data.success !== undefined) {
                if (!data.success) {
                    throw new Error(data.message || ERROR_MESSAGES.INVALID_DATA);
                }
                return data.data;
            }

            // Handle legacy format
            return data;
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    /**
     * Get driver by ID
     * @param {string} id - Driver ID
     * @returns {Promise<Object>}
     */
    async getDriver(id) {
        if (!id) throw new Error('Driver ID is required');
        
        const data = await this.fetch(`${API_ENDPOINTS.DRIVERS}?id=${encodeURIComponent(id)}`);
        return Array.isArray(data) ? data[0] : data;
    }

    /**
     * Get all drivers list
     * @returns {Promise<Array>}
     */
    async getDriversList() {
        return this.fetch(API_ENDPOINTS.DRIVERS_LIST);
    }

    /**
     * Get team by ID
     * @param {string} id - Team ID
     * @returns {Promise<Object>}
     */
    async getTeam(id) {
        if (!id) throw new Error('Team ID is required');
        
        const data = await this.fetch(`${API_ENDPOINTS.TEAMS}?id=${encodeURIComponent(id)}`);
        return Array.isArray(data) ? data[0] : data;
    }

    /**
     * Get all teams list
     * @returns {Promise<Array>}
     */
    async getTeamsList() {
        return this.fetch(API_ENDPOINTS.TEAMS_LIST);
    }

    /**
     * Get race by ID and year
     * @param {string} id - Race ID
     * @param {number} year - Year
     * @returns {Promise<Object>}
     */
    async getRace(id, year) {
        if (!id) throw new Error('Race ID is required');
        
        const url = year 
            ? `${API_ENDPOINTS.RACES}?id=${encodeURIComponent(id)}&year=${year}`
            : `${API_ENDPOINTS.RACES}?id=${encodeURIComponent(id)}`;
        
        const data = await this.fetch(url);
        return Array.isArray(data) ? data[0] : data;
    }

    /**
     * Search across all entities
     * @param {string} query - Search query
     * @returns {Promise<Array>}
     */
    async search(query) {
        if (!query || query.length < 2) return [];
        
        return this.fetch(`${API_ENDPOINTS.SEARCH}?search=${encodeURIComponent(query)}`);
    }

    /**
     * Get picture path for an entity
     * @param {string} folder - Folder name (drivers, teams, races)
     * @param {string} id - Entity ID
     * @returns {Promise<string|null>}
     */
    async getPicture(folder, id) {
        try {
            const response = await fetch(
                `${API_ENDPOINTS.GET_PICTURE}?folder=${encodeURIComponent(folder)}&id=${encodeURIComponent(id)}`
            );
            
            if (!response.ok) return null;
            
            const data = await response.json();
            return data.imagePath || null;
        } catch (error) {
            console.error('Error fetching picture:', error);
            return null;
        }
    }

    /**
     * Cache management methods
     */
    _getCacheKey(url, options) {
        return `${url}_${JSON.stringify(options)}`;
    }

    _getFromCache(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;

        const isExpired = Date.now() - cached.timestamp > this.cacheTTL;
        if (isExpired) {
            this.cache.delete(key);
            return null;
        }

        return cached.data;
    }

    _addToCache(key, data) {
        // Implement simple LRU by removing oldest if max size exceeded
        if (this.cache.size >= CACHE_CONFIG.MAX_SIZE) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }

        this.cache.set(key, {
            data,
            timestamp: Date.now(),
        });
    }

    /**
     * Clear all cache
     */
    clearCache() {
        this.cache.clear();
        console.log('API cache cleared');
    }

    /**
     * Clear specific cache entry
     */
    clearCacheEntry(url, options = {}) {
        const key = this._getCacheKey(url, options);
        this.cache.delete(key);
    }

    /**
     * Enable/disable caching
     */
    setCacheEnabled(enabled) {
        this.cacheEnabled = enabled;
        if (!enabled) this.clearCache();
    }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
