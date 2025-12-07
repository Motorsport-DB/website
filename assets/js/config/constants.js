/**
 * MotorsportDB - Application Constants
 * Centralized configuration for the entire application
 */

export const API_ENDPOINTS = {
    DRIVERS: '/api/drivers.php',
    DRIVERS_LIST: '/api/drivers-list.php',
    TEAMS: '/api/teams.php',
    TEAMS_LIST: '/api/teams-list.php',
    RACES: '/api/races.php',
    SEARCH: '/api/search.php',
    CARDS: '/api/cards.php',
    PICTURE: '/api/picture.php',
    // Legacy endpoints (backward compatibility)
    LEGACY_DRIVERS: '/getDrivers.php',
    LEGACY_TEAMS: '/getTeams.php',
    LEGACY_RACES: '/getRaces.php',
    LEGACY_SEARCH: '/getMainPage.php',
};

export const CACHE_CONFIG = {
    ENABLED: true,
    TTL: 5 * 60 * 1000, // 5 minutes
    MAX_SIZE: 50, // Maximum number of cached items
};

export const UI_CONFIG = {
    ANIMATION_DURATION: 300,
    DEBOUNCE_DELAY: 300,
    SEARCH_MIN_LENGTH: 2,
    CARDS_PER_PAGE: 12,
    LAZY_LOAD_THRESHOLD: 200, // pixels from bottom
    TOOLTIP_DELAY: 200,
};

export const BREAKPOINTS = {
    MOBILE: 640,
    TABLET: 768,
    DESKTOP: 1024,
    WIDE: 1280,
};

export const THEME = {
    LIGHT: 'light',
    DARK: 'dark',
    STORAGE_KEY: 'theme',
};

export const CHART_COLORS = {
    PRIMARY: '#3B82F6',
    SUCCESS: '#10B981',
    WARNING: '#F59E0B',
    DANGER: '#EF4444',
    INFO: '#6366F1',
    SECONDARY: '#8B5CF6',
};

export const DEFAULT_IMAGES = {
    DRIVER: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%23e5e7eb"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="16" fill="%239ca3af"%3ENo Image%3C/text%3E%3C/svg%3E',
    TEAM: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%23e5e7eb"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="16" fill="%239ca3af"%3ENo Image%3C/text%3E%3C/svg%3E',
    FLAG: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%23e5e7eb"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="16" fill="%239ca3af"%3ENo Flag%3C/text%3E%3C/svg%3E',
};

export const DATE_FORMATS = {
    SHORT: 'YYYY',
    MEDIUM: 'YYYY-MM-DD',
    LONG: 'DD MMMM YYYY',
};

export const ERROR_MESSAGES = {
    NOT_FOUND: 'Resource not found',
    NETWORK_ERROR: 'Network error occurred',
    INVALID_DATA: 'Invalid data received',
    UNAUTHORIZED: 'Unauthorized access',
    RATE_LIMIT: 'Rate limit exceeded',
};

export const SUCCESS_MESSAGES = {
    DATA_LOADED: 'Data loaded successfully',
    SAVED: 'Changes saved successfully',
};

/**
 * Feature flags for progressive enhancement
 */
export const FEATURES = {
    LAZY_LOADING: true,
    TOOLTIP_IMAGES: true,
    ANALYTICS: false,
    SERVICE_WORKER: false,
    OFFLINE_MODE: false,
};

/**
 * Performance optimization settings
 */
export const PERFORMANCE = {
    USE_REQUEST_IDLE_CALLBACK: true,
    DEFER_NON_CRITICAL: true,
    PRELOAD_IMAGES: true,
    INTERSECTION_OBSERVER: true,
};
