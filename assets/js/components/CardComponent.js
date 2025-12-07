/**
 * MotorsportDB - Card Component
 * Reusable card component for displaying drivers, teams, etc.
 */

import { createElement } from '../utils/dom.js';
import { sanitizeHTML, truncate } from '../utils/helpers.js';
import { DEFAULT_IMAGES } from '../config/constants.js';

export class CardComponent {
    constructor(data, options = {}) {
        this.data = data;
        this.options = {
            type: 'driver', // driver, team, race
            showImage: true,
            showDescription: true,
            showStats: true,
            onClick: null,
            className: '',
            ...options,
        };
    }

    /**
     * Render the card
     * @returns {HTMLElement}
     */
    render() {
        const card = createElement('div', {
            className: `bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden 
                       transition-all duration-300 hover:scale-105 hover:shadow-xl
                       cursor-pointer ${this.options.className}`,
        });

        if (this.options.onClick) {
            card.addEventListener('click', () => this.options.onClick(this.data));
        }

        // Add image
        if (this.options.showImage) {
            const imageContainer = this.createImageSection();
            card.appendChild(imageContainer);
        }

        // Add content
        const contentContainer = this.createContentSection();
        card.appendChild(contentContainer);

        return card;
    }

    /**
     * Create image section
     * @returns {HTMLElement}
     */
    createImageSection() {
        const container = createElement('div', {
            className: 'relative h-48 bg-gradient-to-br from-blue-500 to-purple-600 ' +
                      'flex items-center justify-center overflow-hidden',
        });

        const img = createElement('img', {
            src: this.data.image || this.getDefaultImage(),
            alt: this.data.name || 'Image',
            className: 'w-full h-full object-cover transition-transform ' +
                      'duration-300 hover:scale-110',
        });

        // Handle image error - prevent infinite loop
        img.addEventListener('error', (e) => {
            // Only try once to avoid infinite loop
            if (!e.target.dataset.errorHandled) {
                e.target.dataset.errorHandled = 'true';
                const fallback = this.getDefaultImage();
                // If already using fallback, show placeholder instead
                if (e.target.src.includes(fallback) || e.target.src.includes('default_driver.png')) {
                    e.target.style.display = 'none';
                } else {
                    e.target.src = fallback;
                }
            }
        });

        container.appendChild(img);

        // Add badge if available
        if (this.data.badge) {
            const badge = createElement('div', {
                className: 'absolute top-2 right-2 bg-yellow-500 text-white ' +
                          'px-2 py-1 rounded-full text-xs font-bold',
            }, sanitizeHTML(this.data.badge));
            container.appendChild(badge);
        }

        return container;
    }

    /**
     * Create content section
     * @returns {HTMLElement}
     */
    createContentSection() {
        const container = createElement('div', {
            className: 'p-4',
        });

        // Title
        const title = createElement('h3', {
            className: 'text-xl font-bold text-gray-900 dark:text-white mb-2 truncate',
        }, sanitizeHTML(this.data.name || 'Untitled'));
        container.appendChild(title);

        // Subtitle
        if (this.data.subtitle) {
            const subtitle = createElement('p', {
                className: 'text-sm text-gray-600 dark:text-gray-400 mb-3',
            }, sanitizeHTML(this.data.subtitle));
            container.appendChild(subtitle);
        }

        // Description
        if (this.options.showDescription && this.data.description) {
            const description = createElement('p', {
                className: 'text-sm text-gray-700 dark:text-gray-300 mb-3',
            }, truncate(sanitizeHTML(this.data.description), 100));
            container.appendChild(description);
        }

        // Stats
        if (this.options.showStats && this.data.stats) {
            const stats = this.createStatsSection();
            container.appendChild(stats);
        }

        // Action button or link
        if (this.data.url) {
            const link = createElement('a', {
                href: this.data.url,
                className: 'inline-block mt-4 px-4 py-2 bg-blue-500 hover:bg-blue-600 ' +
                          'text-white font-semibold rounded-lg transition-colors duration-200',
            }, 'View Details →');
            container.appendChild(link);
        }

        return container;
    }

    /**
     * Create stats section
     * @returns {HTMLElement}
     */
    createStatsSection() {
        const container = createElement('div', {
            className: 'grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700',
        });

        Object.entries(this.data.stats).forEach(([key, value]) => {
            const stat = createElement('div', {
                className: 'text-center',
            });

            const statValue = createElement('div', {
                className: 'text-lg font-bold text-blue-600 dark:text-blue-400',
            }, String(value));

            const statLabel = createElement('div', {
                className: 'text-xs text-gray-600 dark:text-gray-400 mt-1',
            }, this.formatStatLabel(key));

            stat.appendChild(statValue);
            stat.appendChild(statLabel);
            container.appendChild(stat);
        });

        return container;
    }

    /**
     * Format stat label
     * @param {string} key - Stat key
     * @returns {string}
     */
    formatStatLabel(key) {
        return key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    /**
     * Get default image based on type
     * @returns {string}
     */
    getDefaultImage() {
        const defaults = {
            driver: DEFAULT_IMAGES.DRIVER,
            team: DEFAULT_IMAGES.TEAM,
        };
        return defaults[this.options.type] || DEFAULT_IMAGES.DRIVER;
    }
}

/**
 * Create a grid of cards
 * @param {string} containerId - Container element ID
 * @param {Array} data - Array of card data
 * @param {Object} options - Card options
 */
export function createCardGrid(containerId, data, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container with id "${containerId}" not found`);
        return;
    }

    // Clear container
    container.innerHTML = '';

    // Set grid layout
    container.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6';

    // Create cards
    data.forEach(item => {
        const card = new CardComponent(item, options);
        container.appendChild(card.render());
    });
}

export default CardComponent;
