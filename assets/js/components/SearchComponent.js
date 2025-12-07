/**
 * MotorsportDB - Search Component
 * Reusable search bar with autocomplete functionality
 */

import { apiService } from '../services/ApiService.js';
import { UI_CONFIG } from '../config/constants.js';
import { debounce, createElement } from '../utils/dom.js';
import { sanitizeHTML } from '../utils/helpers.js';

export class SearchComponent {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container with id "${containerId}" not found`);
        }

        this.options = {
            placeholder: 'Search drivers, teams, championships...',
            minLength: UI_CONFIG.SEARCH_MIN_LENGTH,
            debounceDelay: UI_CONFIG.DEBOUNCE_DELAY,
            showImages: true,
            maxResults: 10,
            onSelect: null,
            ...options,
        };

        this.searchInput = null;
        this.resultsContainer = null;
        this.debouncedSearch = debounce(
            (query) => this.search(query),
            this.options.debounceDelay
        );

        this.init();
    }

    /**
     * Initialize the search component
     */
    init() {
        this.render();
        this.attachEventListeners();
    }

    /**
     * Render the search component
     */
    render() {
        this.container.innerHTML = '';
        
        // Create search input
        this.searchInput = createElement('input', {
            type: 'text',
            placeholder: this.options.placeholder,
            className: 'w-full px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 ' +
                      'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ' +
                      'focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 ' +
                      'transition-colors duration-200',
        });

        // Create results container
        this.resultsContainer = createElement('div', {
            className: 'mt-2 space-y-2',
        });

        // Add to container
        this.container.appendChild(this.searchInput);
        this.container.appendChild(this.resultsContainer);
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        this.searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            if (query.length < this.options.minLength) {
                this.clearResults();
                return;
            }

            this.debouncedSearch(query);
        });

        // Close results when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.clearResults();
            }
        });

        // Handle keyboard navigation
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.clearResults();
                this.searchInput.blur();
            }
        });
    }

    /**
     * Perform search
     * @param {string} query - Search query
     */
    async search(query) {
        try {
            this.showLoading();
            
            const results = await apiService.search(query);
            
            if (results.length === 0) {
                this.showNoResults();
                return;
            }

            this.displayResults(results.slice(0, this.options.maxResults));
        } catch (error) {
            console.error('Search error:', error);
            this.showError();
        }
    }

    /**
     * Display search results
     * @param {Array} results - Search results
     */
    displayResults(results) {
        this.resultsContainer.innerHTML = '';

        results.forEach(result => {
            const resultItem = this.createResultItem(result);
            this.resultsContainer.appendChild(resultItem);
        });
    }

    /**
     * Create a result item element
     * @param {Object} result - Result data
     * @returns {HTMLElement}
     */
    createResultItem(result) {
        const item = createElement('div', {
            className: 'bg-gray-100 dark:bg-gray-800 p-4 rounded-lg flex items-center ' +
                      'cursor-pointer transition-all duration-200 hover:scale-105 ' +
                      'hover:shadow-lg hover:bg-gray-200 dark:hover:bg-gray-700',
        });

        // Add image if enabled
        if (this.options.showImages && result.image) {
            const img = createElement('img', {
                src: result.image,
                alt: result.name,
                className: 'w-16 h-16 object-contain rounded-full mr-4 ' +
                          'border-2 border-blue-400 dark:border-blue-500',
            });
            item.appendChild(img);
        }

        // Add content
        const content = createElement('div', {
            className: 'flex flex-col flex-1',
        });

        const name = createElement('a', {
            href: result.url,
            className: 'text-lg font-bold text-gray-800 dark:text-blue-400 hover:underline',
        }, sanitizeHTML(result.name));

        content.appendChild(name);

        // Add type badge if available
        if (result.type) {
            const badge = createElement('span', {
                className: 'text-xs text-gray-600 dark:text-gray-400 mt-1',
            }, this.getTypeBadge(result.type));
            content.appendChild(badge);
        }

        item.appendChild(content);

        // Handle click
        item.addEventListener('click', (e) => {
            if (this.options.onSelect) {
                e.preventDefault();
                e.stopPropagation();
                this.options.onSelect(result);
            } else if (e.target.tagName !== 'A') {
                window.location.href = result.url;
            }
        });

        return item;
    }

    /**
     * Get type badge text
     * @param {string} type - Result type
     * @returns {string}
     */
    getTypeBadge(type) {
        const badges = {
            driver: '👤 Driver',
            team: '🏎️ Team',
            championship: '🏆 Championship',
        };
        return badges[type] || type;
    }

    /**
     * Show loading indicator
     */
    showLoading() {
        this.resultsContainer.innerHTML = '';
        
        const loading = createElement('div', {
            className: 'text-center py-4',
        }, [
            createElement('div', {
                className: 'inline-block w-8 h-8 border-4 border-blue-500 ' +
                          'border-t-transparent rounded-full animate-spin',
            }),
        ]);

        this.resultsContainer.appendChild(loading);
    }

    /**
     * Show no results message
     */
    showNoResults() {
        this.resultsContainer.innerHTML = '';
        
        const message = createElement('div', {
            className: 'text-center py-4 text-gray-600 dark:text-gray-400',
        }, 'No results found');

        this.resultsContainer.appendChild(message);
    }

    /**
     * Show error message
     */
    showError() {
        this.resultsContainer.innerHTML = '';
        
        const message = createElement('div', {
            className: 'text-center py-4 text-red-500 dark:text-red-400',
        }, 'An error occurred. Please try again.');

        this.resultsContainer.appendChild(message);
    }

    /**
     * Clear results
     */
    clearResults() {
        this.resultsContainer.innerHTML = '';
    }

    /**
     * Focus search input
     */
    focus() {
        this.searchInput.focus();
    }

    /**
     * Clear search input
     */
    clear() {
        this.searchInput.value = '';
        this.clearResults();
    }

    /**
     * Destroy the component
     */
    destroy() {
        this.container.innerHTML = '';
    }
}

export default SearchComponent;
