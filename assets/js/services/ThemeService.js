/**
 * MotorsportDB - Theme Service
 * Manages light/dark theme switching with system preference detection
 */

import { THEME } from '../config/constants.js';

class ThemeService {
    constructor() {
        this.currentTheme = this._loadTheme();
        this.subscribers = new Set();
        this._initializeTheme();
        this._watchSystemPreference();
    }

    /**
     * Initialize theme on page load
     * @private
     */
    _initializeTheme() {
        this._applyTheme(this.currentTheme);
        this._updateToggleButton();
    }

    /**
     * Load theme from localStorage or system preference
     * @private
     */
    _loadTheme() {
        const stored = localStorage.getItem(THEME.STORAGE_KEY);
        if (stored) return stored;

        // Detect system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return THEME.DARK;
        }

        return THEME.LIGHT;
    }

    /**
     * Apply theme to document
     * @private
     */
    _applyTheme(theme) {
        if (theme === THEME.DARK) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        this.currentTheme = theme;
    }

    /**
     * Update toggle button state
     * @private
     */
    _updateToggleButton() {
        const sunIcon = document.getElementById('theme-icon-sun');
        const moonIcon = document.getElementById('theme-icon-moon');
        
        if (!sunIcon || !moonIcon) return;

        const isDark = this.currentTheme === THEME.DARK;
        
        // In dark mode: hide sun, show moon
        // In light mode: show sun, hide moon
        if (isDark) {
            sunIcon.classList.add('hidden');
            sunIcon.classList.remove('block');
            moonIcon.classList.remove('hidden');
            moonIcon.classList.add('block');
        } else {
            sunIcon.classList.remove('hidden');
            sunIcon.classList.add('block');
            moonIcon.classList.add('hidden');
            moonIcon.classList.remove('block');
        }
    }

    /**
     * Watch for system theme changes
     * @private
     */
    _watchSystemPreference() {
        if (!window.matchMedia) return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', (e) => {
            // Only auto-switch if user hasn't set a preference
            if (!localStorage.getItem(THEME.STORAGE_KEY)) {
                const newTheme = e.matches ? THEME.DARK : THEME.LIGHT;
                this.setTheme(newTheme, false); // Don't save to localStorage
            }
        });
    }

    /**
     * Toggle between light and dark theme
     */
    toggle() {
        const newTheme = this.currentTheme === THEME.DARK ? THEME.LIGHT : THEME.DARK;
        this.setTheme(newTheme);
    }

    /**
     * Set specific theme
     * @param {string} theme - Theme to set (light or dark)
     * @param {boolean} persist - Whether to save to localStorage
     */
    setTheme(theme, persist = true) {
        if (theme !== THEME.LIGHT && theme !== THEME.DARK) {
            console.error(`Invalid theme: ${theme}`);
            return;
        }

        this._applyTheme(theme);
        this._updateToggleButton();

        if (persist) {
            localStorage.setItem(THEME.STORAGE_KEY, theme);
        }

        // Notify subscribers
        this._notifySubscribers(theme);
    }

    /**
     * Get current theme
     * @returns {string}
     */
    getTheme() {
        return this.currentTheme;
    }

    /**
     * Check if dark mode is active
     * @returns {boolean}
     */
    isDark() {
        return this.currentTheme === THEME.DARK;
    }

    /**
     * Subscribe to theme changes
     * @param {Function} callback - Function to call when theme changes
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }

    /**
     * Notify all subscribers of theme change
     * @private
     */
    _notifySubscribers(theme) {
        this.subscribers.forEach(callback => {
            try {
                callback(theme);
            } catch (error) {
                console.error('Error in theme subscriber:', error);
            }
        });
    }

    /**
     * Initialize theme toggle button
     */
    initToggleButton() {
        const themeToggle = document.getElementById('theme-toggle');
        if (!themeToggle) {
            console.warn('Theme toggle button not found');
            return;
        }

        themeToggle.addEventListener('click', () => this.toggle());
    }

    /**
     * Get theme-aware colors for charts
     * @returns {Object}
     */
    getChartColors() {
        const isDark = this.isDark();
        return {
            text: isDark ? '#F9FAFB' : '#1F2937',
            grid: isDark ? '#374151' : '#E5E7EB',
            background: isDark ? '#1F2937' : '#FFFFFF',
            tooltip: {
                background: isDark ? '#111827' : '#FFFFFF',
                text: isDark ? '#F9FAFB' : '#1F2937',
                border: isDark ? '#3B82F6' : '#D1D5DB',
            },
        };
    }
}

// Export singleton instance
export const themeService = new ThemeService();
export default themeService;
