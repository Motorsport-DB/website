/**
 * MotorsportDB - Tooltip Component
 * Reusable tooltip component with image preview
 */

import { apiService } from '../services/ApiService.js';
import { createElement } from '../utils/dom.js';
import { UI_CONFIG, PERFORMANCE } from '../config/constants.js';

export class TooltipComponent {
    constructor() {
        this.tooltip = null;
        this.cache = new Map();
        this.hideTimeout = null;
        this.init();
    }

    /**
     * Initialize tooltip
     */
    init() {
        this.createTooltip();
        this.attachGlobalListeners();
    }

    /**
     * Create tooltip element
     */
    createTooltip() {
        this.tooltip = createElement('div', {
            id: 'global-tooltip',
            className: 'fixed z-50 hidden pointer-events-none',
        });

        document.body.appendChild(this.tooltip);
    }

    /**
     * Attach global event listeners
     */
    attachGlobalListeners() {
        // Use event delegation for better performance
        document.body.addEventListener('mouseover', (e) => {
            const link = e.target.closest('[data-tooltip]');
            if (link) {
                this.handleMouseEnter(link);
            }
        });

        document.body.addEventListener('mouseout', (e) => {
            const link = e.target.closest('[data-tooltip]');
            if (link) {
                this.handleMouseLeave();
            }
        });
    }

    /**
     * Handle mouse enter on link
     * @param {HTMLElement} element - Element with tooltip
     */
    async handleMouseEnter(element) {
        clearTimeout(this.hideTimeout);

        const tooltipType = element.dataset.tooltip;
        const entityId = element.dataset.entityId;
        const entityType = element.dataset.entityType;

        if (!entityId || !entityType) return;

        // Show tooltip after delay
        setTimeout(async () => {
            const data = await this.fetchTooltipData(entityType, entityId);
            if (data) {
                this.show(element, data, tooltipType);
            }
        }, UI_CONFIG.TOOLTIP_DELAY);
    }

    /**
     * Handle mouse leave
     */
    handleMouseLeave() {
        this.hideTimeout = setTimeout(() => {
            this.hide();
        }, 200);
    }

    /**
     * Fetch tooltip data
     * @param {string} entityType - Entity type (driver, team, race)
     * @param {string} entityId - Entity ID
     * @returns {Promise<Object|null>}
     */
    async fetchTooltipData(entityType, entityId) {
        // Check cache first
        const cacheKey = `${entityType}_${entityId}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        try {
            let data = null;

            switch (entityType) {
                case 'driver':
                case 'drivers':
                    data = await apiService.getDriver(entityId);
                    break;
                case 'team':
                case 'teams':
                    data = await apiService.getTeam(entityId);
                    break;
                default:
                    return null;
            }

            // Get image
            if (data) {
                const image = await apiService.getPicture(`${entityType}s`, entityId);
                data.image = image;
                this.cache.set(cacheKey, data);
            }

            return data;
        } catch (error) {
            console.error('Error fetching tooltip data:', error);
            return null;
        }
    }

    /**
     * Show tooltip
     * @param {HTMLElement} element - Element to attach tooltip to
     * @param {Object} data - Tooltip data
     * @param {string} type - Tooltip type
     */
    show(element, data, type = 'default') {
        const content = this.createTooltipContent(data, type);
        this.tooltip.innerHTML = '';
        this.tooltip.appendChild(content);

        // Position tooltip
        this.position(element);

        // Show with animation
        this.tooltip.classList.remove('hidden');
        this.tooltip.classList.add('animate-fade-in');
    }

    /**
     * Hide tooltip
     */
    hide() {
        this.tooltip.classList.add('hidden');
        this.tooltip.classList.remove('animate-fade-in');
    }

    /**
     * Create tooltip content
     * @param {Object} data - Entity data
     * @param {string} type - Tooltip type
     * @returns {HTMLElement}
     */
    createTooltipContent(data, type) {
        const container = createElement('div', {
            className: 'bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 ' +
                      'shadow-xl rounded-lg overflow-hidden max-w-xs',
        });

        // Image section
        if (data.image) {
            const imageContainer = createElement('div', {
                className: 'relative h-48 bg-gradient-to-br from-blue-500 to-purple-600 ' +
                          'flex items-center justify-center',
            });

            const img = createElement('img', {
                src: data.image,
                alt: data.name || 'Image',
                className: 'w-full h-full object-contain p-2',
            });

            imageContainer.appendChild(img);
            container.appendChild(imageContainer);
        }

        // Content section
        const content = createElement('div', {
            className: 'p-4',
        });

        // Name
        const name = createElement('h4', {
            className: 'text-lg font-bold text-gray-900 dark:text-white mb-2',
        }, data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim());
        content.appendChild(name);

        // Additional info based on type
        if (type === 'driver' || data.dateOfBirth) {
            this.addDriverInfo(content, data);
        } else if (type === 'team' || data.country) {
            this.addTeamInfo(content, data);
        }

        container.appendChild(content);
        return container;
    }

    /**
     * Add driver specific info
     * @param {HTMLElement} container - Container element
     * @param {Object} data - Driver data
     */
    addDriverInfo(container, data) {
        if (data.country) {
            const country = createElement('p', {
                className: 'text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2',
            });

            const flag = createElement('img', {
                src: `/assets/flags/${data.country.toLowerCase().replace(/\s+/g, '_')}.png`,
                alt: data.country,
                className: 'w-5 h-5 object-contain',
            });

            country.appendChild(flag);
            country.appendChild(document.createTextNode(data.country));
            container.appendChild(country);
        }

        if (data.dateOfBirth) {
            const dob = createElement('p', {
                className: 'text-sm text-gray-600 dark:text-gray-400 mt-1',
            }, `Born: ${data.dateOfBirth}`);
            container.appendChild(dob);
        }
    }

    /**
     * Add team specific info
     * @param {HTMLElement} container - Container element
     * @param {Object} data - Team data
     */
    addTeamInfo(container, data) {
        if (data.country) {
            const country = createElement('p', {
                className: 'text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2',
            });

            const flag = createElement('img', {
                src: `/assets/flags/${data.country.toLowerCase().replace(/\s+/g, '_')}.png`,
                alt: data.country,
                className: 'w-5 h-5 object-contain',
            });

            country.appendChild(flag);
            country.appendChild(document.createTextNode(data.country));
            container.appendChild(country);
        }

        if (data.base) {
            const base = createElement('p', {
                className: 'text-sm text-gray-600 dark:text-gray-400 mt-1',
            }, `Base: ${data.base}`);
            container.appendChild(base);
        }
    }

    /**
     * Position tooltip relative to element
     * @param {HTMLElement} element - Element to attach to
     */
    position(element) {
        const rect = element.getBoundingClientRect();
        const tooltipRect = this.tooltip.getBoundingClientRect();

        let top = rect.bottom + 10;
        let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);

        // Adjust if tooltip goes off screen
        if (left < 10) {
            left = 10;
        } else if (left + tooltipRect.width > window.innerWidth - 10) {
            left = window.innerWidth - tooltipRect.width - 10;
        }

        // Show above if not enough space below
        if (top + tooltipRect.height > window.innerHeight) {
            top = rect.top - tooltipRect.height - 10;
        }

        this.tooltip.style.top = `${top}px`;
        this.tooltip.style.left = `${left}px`;
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
    }
}

/**
 * Initialize tooltips for links
 * @param {string} selector - Link selector
 */
export function initTooltips(selector = 'a[href*="driver.php"], a[href*="team.php"], a[href*="driver.html"], a[href*="team.html"]') {
    const links = document.querySelectorAll(selector);

    links.forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;

        // Extract entity type and ID from URL
        const match = href.match(/(driver|team)\.(html|php)\?id=([^&]+)/);
        if (!match) return;
        const type = match[1];
        const id = match[3];
        if (!match) return;

        const [, entityType, entityId] = match;

        // Add data attributes
        link.dataset.tooltip = entityType;
        link.dataset.entityType = entityType;
        link.dataset.entityId = decodeURIComponent(entityId);
    });
}

// Create singleton instance
export const tooltipService = new TooltipComponent();
export default tooltipService;
