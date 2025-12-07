/**
 * MotorsportDB - Data Utilities
 * Helper functions for data manipulation and formatting
 */

import { DEFAULT_IMAGES } from '../config/constants.js';

/**
 * Format name by replacing underscores with spaces
 * @param {string} name - Name with underscores (e.g., "F1_Academy", "Lewis_Hamilton")
 * @returns {string} - Formatted name (e.g., "F1 Academy", "Lewis Hamilton")
 */
export function formatDisplayName(name) {
    if (!name) return '';
    return name.replace(/_/g, ' ');
}

/**
 * Calculate age from birth and death dates
 * @param {string} birthDate - Birth date (YYYY or YYYY-MM-DD)
 * @param {string} [deathDate] - Death date (YYYY or YYYY-MM-DD)
 * @returns {number}
 */
export function calculateAge(birthDate, deathDate = null) {
    try {
        // Try parsing as full date
        const birth = new Date(birthDate);
        const death = deathDate ? new Date(deathDate) : new Date();
        
        if (!isNaN(birth.getTime())) {
            let age = death.getFullYear() - birth.getFullYear();
            const monthDiff = death.getMonth() - birth.getMonth();
            
            if (monthDiff < 0 || (monthDiff === 0 && death.getDate() < birth.getDate())) {
                age--;
            }
            
            return age;
        }
    } catch (error) {
        // Fall through to year-only parsing
    }

    // Parse as year only
    if (/^\d{4}$/.test(birthDate)) {
        const birthYear = parseInt(birthDate);
        const deathYear = deathDate && /^\d{4}$/.test(deathDate) 
            ? parseInt(deathDate) 
            : new Date().getFullYear();
        return deathYear - birthYear;
    }

    throw new Error('Invalid date format. Expected "YYYY" or "YYYY-MM-DD"');
}

/**
 * Format date for display
 * @param {string} date - Date string
 * @param {string} format - Format type (short, medium, long)
 * @returns {string}
 */
export function formatDate(date, format = 'medium') {
    if (!date) return 'N/A';

    // If only year
    if (/^\d{4}$/.test(date)) {
        return date;
    }

    try {
        const d = new Date(date);
        
        if (isNaN(d.getTime())) {
            return date;
        }

        const options = {
            short: { year: 'numeric' },
            medium: { year: 'numeric', month: '2-digit', day: '2-digit' },
            long: { year: 'numeric', month: 'long', day: 'numeric' },
        };

        return d.toLocaleDateString('en-US', options[format] || options.medium);
    } catch (error) {
        return date;
    }
}

/**
 * Format name (capitalize each word)
 * @param {string} name - Name to format
 * @returns {string}
 */
export function formatName(name) {
    if (!name) return '';
    
    return name
        .split(/[\s_]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Get flag image path
 * @param {string} country - Country name
 * @returns {string}
 */
export function getFlagImage(country) {
    if (!country) return DEFAULT_IMAGES.FLAG;
    
    const flagName = country.toLowerCase().replace(/\s+/g, '_');
    return `/assets/flags/${flagName}.png`;
}

/**
 * Get default image for entity type
 * @param {string} type - Entity type (driver, team, race)
 * @returns {string}
 */
export function getDefaultImage(type) {
    const defaults = {
        driver: DEFAULT_IMAGES.DRIVER,
        team: DEFAULT_IMAGES.TEAM,
        drivers: DEFAULT_IMAGES.DRIVER,
        teams: DEFAULT_IMAGES.TEAM,
    };
    
    return defaults[type.toLowerCase()] || DEFAULT_IMAGES.DRIVER;
}

/**
 * Sanitize HTML to prevent XSS
 * @param {string} html - HTML string
 * @returns {string}
 */
export function sanitizeHTML(html) {
    if (!html) return '';
    
    const div = document.createElement('div');
    div.textContent = html;
    return div.innerHTML;
}

/**
 * Generate URL-safe slug from string
 * @param {string} text - Text to slugify
 * @returns {string}
 */
export function slugify(text) {
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_')
        .replace(/[^\w\-]+/g, '')
        .replace(/\_\_+/g, '_')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

/**
 * Calculate percentage
 * @param {number} value - Value
 * @param {number} total - Total
 * @param {number} decimals - Decimal places
 * @returns {number}
 */
export function calculatePercentage(value, total, decimals = 1) {
    if (total === 0) return 0;
    return parseFloat(((value / total) * 100).toFixed(decimals));
}

/**
 * Format number with thousands separator
 * @param {number} num - Number to format
 * @returns {string}
 */
export function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Parse query string
 * @param {string} query - Query string
 * @returns {Object}
 */
export function parseQueryString(query = window.location.search) {
    const params = new URLSearchParams(query);
    const result = {};
    
    for (const [key, value] of params) {
        result[key] = value;
    }
    
    return result;
}

/**
 * Build query string from object
 * @param {Object} params - Parameters object
 * @returns {string}
 */
export function buildQueryString(params) {
    const query = new URLSearchParams(params);
    return query.toString();
}

/**
 * Deep clone object
 * @param {Object} obj - Object to clone
 * @returns {Object}
 */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Group array by key
 * @param {Array} array - Array to group
 * @param {string|Function} key - Key or function to group by
 * @returns {Object}
 */
export function groupBy(array, key) {
    return array.reduce((result, item) => {
        const groupKey = typeof key === 'function' ? key(item) : item[key];
        (result[groupKey] = result[groupKey] || []).push(item);
        return result;
    }, {});
}

/**
 * Sort array by key
 * @param {Array} array - Array to sort
 * @param {string|Function} key - Key or function to sort by
 * @param {string} order - Sort order (asc, desc)
 * @returns {Array}
 */
export function sortBy(array, key, order = 'asc') {
    const sorted = [...array].sort((a, b) => {
        const aVal = typeof key === 'function' ? key(a) : a[key];
        const bVal = typeof key === 'function' ? key(b) : b[key];
        
        if (aVal < bVal) return order === 'asc' ? -1 : 1;
        if (aVal > bVal) return order === 'asc' ? 1 : -1;
        return 0;
    });
    
    return sorted;
}

/**
 * Check if value is empty
 * @param {*} value - Value to check
 * @returns {boolean}
 */
export function isEmpty(value) {
    if (value == null) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
}

/**
 * Truncate text
 * @param {string} text - Text to truncate
 * @param {number} length - Max length
 * @param {string} suffix - Suffix to add
 * @returns {string}
 */
export function truncate(text, length = 100, suffix = '...') {
    if (!text || text.length <= length) return text;
    return text.substring(0, length).trim() + suffix;
}

/**
 * Generate unique ID
 * @param {string} prefix - ID prefix
 * @returns {string}
 */
export function uniqueId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Wait for specified time
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise}
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry async function
 * @param {Function} fn - Async function to retry
 * @param {number} retries - Number of retries
 * @param {number} delay - Delay between retries in ms
 * @returns {Promise}
 */
export async function retry(fn, retries = 3, delay = 1000) {
    try {
        return await fn();
    } catch (error) {
        if (retries === 0) throw error;
        await sleep(delay);
        return retry(fn, retries - 1, delay);
    }
}

/**
 * Check if code is running on mobile
 * @returns {boolean}
 */
export function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Get viewport size
 * @returns {Object}
 */
export function getViewportSize() {
    return {
        width: window.innerWidth || document.documentElement.clientWidth,
        height: window.innerHeight || document.documentElement.clientHeight,
    };
}

/**
 * Local storage wrapper with JSON support
 */
export const storage = {
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return defaultValue;
        }
    },
    
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error writing to localStorage:', error);
            return false;
        }
    },
    
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Error removing from localStorage:', error);
            return false;
        }
    },
    
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Error clearing localStorage:', error);
            return false;
        }
    },
};
