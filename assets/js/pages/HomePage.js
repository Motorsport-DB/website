/**
 * MotorsportDB - Home Page
 * Modern implementation of the home page with search and statistics
 */

import { apiService } from '../services/ApiService.js';
import { chartService } from '../services/ChartService.js';
import { themeService } from '../services/ThemeService.js';
import { SearchComponent } from '../components/SearchComponent.js';
import { createCardGrid } from '../components/CardComponent.js';
import { initTooltips } from '../components/TooltipComponent.js';
import { showSkeletonGrid, hideLoadingOverlay } from '../components/LoadingComponent.js';
import { PERFORMANCE, UI_CONFIG } from '../config/constants.js';
import * as dom from '../utils/dom.js';

class HomePage {
    constructor() {
        this.searchComponent = null;
        this.randomCards = null;
        this.statistics = null;
        this.init();
    }

    /**
     * Initialize the home page
     */
    async init() {
        try {
            // Initialize theme
            themeService.initToggleButton();

            // Initialize search component
            this.initializeSearch();

            // Load data
            await Promise.all([
                this.loadStatistics(),
                this.loadRandomCards(),
            ]);

            // Initialize tooltips (deferred)
            this.deferredInit();

        } catch (error) {
            console.error('Error initializing home page:', error);
            this.showError();
        }
    }

    /**
     * Initialize search component
     */
    initializeSearch() {
        try {
            const searchContainer = document.getElementById('searchContainer');
            if (!searchContainer) {
                console.warn('Search container not found');
                return;
            }

            this.searchComponent = new SearchComponent('searchContainer', {
                placeholder: 'Search drivers, teams, championships...',
                showImages: true,
                maxResults: 10,
            });
        } catch (error) {
            console.error('Error initializing search:', error);
        }
    }

    /**
     * Load website statistics
     */
    async loadStatistics() {
        try {
            // Fetch cards data which contains statistics
            const response = await fetch('/api/cards.php');
            const data = await response.json();

            if (data && data.statistics) {
                this.statistics = data.statistics;
                this.displayStatistics();
            }
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    }

    /**
     * Display statistics with donut chart
     */
    displayStatistics() {
        if (!this.statistics) return;

        const canvas = document.getElementById('statsDonut');
        if (!canvas) {
            console.warn('Statistics canvas not found');
            return;
        }

        const labels = ['Drivers', 'Teams', 'Championships'];
        const data = [
            this.statistics.numbers_of_drivers || 0,
            this.statistics.numbers_of_teams || 0,
            this.statistics.numbers_of_championship || 0,
        ];

        chartService.createDoughnutChart('statsDonut', labels, data, {
            plugins: {
                legend: {
                    position: 'bottom',
                    align: 'center',
                    labels: {
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        padding: 20
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            return `${label}: ${value}`;
                        }
                    }
                }
            }
        });

        // Display statistics text
        this.displayStatisticsText();
    }

    /**
     * Display statistics as text
     */
    displayStatisticsText() {
        const container = document.getElementById('statsText');
        if (!container || !this.statistics) return;

        const stats = [
            { label: 'Drivers', value: this.statistics.numbers_of_drivers, icon: '👤' },
            { label: 'Teams', value: this.statistics.numbers_of_teams, icon: '🏎️' },
            { label: 'Championships', value: this.statistics.numbers_of_championship, icon: '🏆' },
            { label: 'Total Races', value: this.statistics.numbers_of_races, icon: '🏁' },
        ];

        const html = stats.map(stat => `
            <div class="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-md text-center">
                <div class="text-3xl mb-2">${stat.icon}</div>
                <div class="text-2xl font-bold text-blue-600 dark:text-blue-400">${stat.value}</div>
                <div class="text-sm text-gray-600 dark:text-gray-400">${stat.label}</div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    /**
     * Load random cards for homepage
     */
    async loadRandomCards() {
        try {
            const cardsContainer = document.getElementById('randomCards');
            if (!cardsContainer) {
                console.warn('Cards container not found');
                return;
            }

            // Show skeleton while loading
            showSkeletonGrid('randomCards', 8);

            const response = await fetch('/api/cards.php');
            const data = await response.json();

            if (data && data.cards) {
                this.randomCards = data.cards;
                this.displayRandomCards();
            } else {
                throw new Error('Invalid cards data');
            }
        } catch (error) {
            console.error('Error loading random cards:', error);
            this.showCardsError();
        }
    }

    /**
     * Display random cards
     */
    displayRandomCards() {
        if (!this.randomCards || this.randomCards.length === 0) {
            this.showCardsError();
            return;
        }

        const cardsData = this.randomCards.map(card => ({
            name: card.name || `${card.firstName || ''} ${card.lastName || ''}`.trim(),
            image: card.image,
            url: card.url,
            type: card.type,
            subtitle: this.getCardSubtitle(card),
            stats: this.getCardStats(card),
        }));

        createCardGrid('randomCards', cardsData, {
            type: 'mixed',
            showImage: true,
            showDescription: false,
            showStats: true,
            onClick: (card) => {
                window.location.href = card.url;
            },
        });
    }

    /**
     * Get card subtitle based on type
     * @param {Object} card - Card data
     * @returns {string}
     */
    getCardSubtitle(card) {
        if (card.type === 'driver') {
            return card.country || 'Driver';
        } else if (card.type === 'team') {
            return card.country || 'Team';
        } else if (card.type === 'championship') {
            return 'Championship';
        }
        return '';
    }

    /**
     * Get card stats
     * @param {Object} card - Card data
     * @returns {Object}
     */
    getCardStats(card) {
        const stats = {};

        if (card.type === 'driver' && card.stats) {
            if (card.stats.wins) stats.Wins = card.stats.wins;
            if (card.stats.podiums) stats.Podiums = card.stats.podiums;
            if (card.stats.races) stats.Races = card.stats.races;
        } else if (card.type === 'team' && card.stats) {
            if (card.stats.wins) stats.Wins = card.stats.wins;
            if (card.stats.titles) stats.Titles = card.stats.titles;
            if (card.stats.races) stats.Races = card.stats.races;
        }

        return stats;
    }

    /**
     * Show cards error
     */
    showCardsError() {
        const container = document.getElementById('randomCards');
        if (!container) return;

        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <div class="text-red-500 text-xl mb-4">⚠️ Error loading cards</div>
                <p class="text-gray-600 dark:text-gray-400">
                    Unable to load random cards. Please try again later.
                </p>
            </div>
        `;
    }

    /**
     * Show general error
     */
    showError() {
        const container = document.getElementById('resultsContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="text-center py-12">
                <div class="text-red-500 text-xl mb-4">⚠️ Error</div>
                <p class="text-gray-600 dark:text-gray-400">
                    An error occurred while loading the page. Please refresh and try again.
                </p>
            </div>
        `;
    }

    /**
     * Deferred initialization (non-critical features)
     */
    deferredInit() {
        const initFunc = () => {
            // Initialize tooltips for links
            if (PERFORMANCE.USE_REQUEST_IDLE_CALLBACK && window.innerWidth > 768) {
                if ('requestIdleCallback' in window) {
                    requestIdleCallback(() => {
                        initTooltips();
                    });
                } else {
                    setTimeout(() => {
                        initTooltips();
                    }, 1000);
                }
            }
        };

        // Run after page is fully loaded
        if (document.readyState === 'complete') {
            initFunc();
        } else {
            window.addEventListener('load', initFunc);
        }
    }
}

// Initialize page when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new HomePage());
} else {
    new HomePage();
}

export default HomePage;
