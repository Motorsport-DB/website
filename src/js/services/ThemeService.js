/**
 * Theme Service - Handle dark/light theme switching
 * @module services/ThemeService
 */

export class ThemeService {
    constructor() {
        this.storageKey = 'motorsportdb-theme';
        this.theme = this.loadTheme();
        this.listeners = new Set();
    }

    /**
     * Load theme from localStorage or system preference
     * @private
     * @returns {string} 'light' or 'dark'
     */
    loadTheme() {
        const stored = localStorage.getItem(this.storageKey);
        
        if (stored) {
            return stored;
        }

        // Check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }

        return 'light';
    }

    /**
     * Save theme to localStorage
     * @private
     */
    saveTheme() {
        localStorage.setItem(this.storageKey, this.theme);
    }

    /**
     * Apply theme to document
     * @private
     */
    applyTheme() {
        const html = document.documentElement;
        
        if (this.theme === 'dark') {
            html.classList.add('dark');
        } else {
            html.classList.remove('dark');
        }

        // Notify listeners
        this.listeners.forEach(callback => callback(this.theme));
    }

    /**
     * Get current theme
     * @returns {string} Current theme ('light' or 'dark')
     */
    getCurrentTheme() {
        return this.theme;
    }

    /**
     * Set theme
     * @param {string} theme - Theme to set ('light' or 'dark')
     */
    setTheme(theme) {
        if (theme !== 'light' && theme !== 'dark') {
            throw new Error(`Invalid theme: ${theme}`);
        }

        this.theme = theme;
        this.saveTheme();
        this.applyTheme();
    }

    /**
     * Toggle between light and dark theme
     */
    toggle() {
        this.setTheme(this.theme === 'light' ? 'dark' : 'light');
    }

    /**
     * Initialize theme on page load
     */
    init() {
        this.applyTheme();
        
        // Listen for system theme changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (!localStorage.getItem(this.storageKey)) {
                    this.setTheme(e.matches ? 'dark' : 'light');
                }
            });
        }
    }

    /**
     * Subscribe to theme changes
     * @param {Function} callback - Callback function
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }
}

// Export singleton instance
export const themeService = new ThemeService();
