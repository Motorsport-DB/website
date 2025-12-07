/**
 * MotorsportDB - Loading Component
 * Reusable loading indicators and skeleton screens
 */

import { createElement } from '../utils/dom.js';

/**
 * Create spinner element
 * @param {string} size - Size (sm, md, lg)
 * @param {string} color - Color class
 * @returns {HTMLElement}
 */
export function createSpinner(size = 'md', color = 'blue-500') {
    const sizes = {
        sm: 'w-4 h-4 border-2',
        md: 'w-8 h-8 border-3',
        lg: 'w-12 h-12 border-4',
        xl: 'w-16 h-16 border-4',
    };

    return createElement('div', {
        className: `inline-block ${sizes[size]} border-${color} border-t-transparent ` +
                  'rounded-full animate-spin',
    });
}

/**
 * Create loading overlay
 * @param {string} message - Loading message
 * @returns {HTMLElement}
 */
export function createLoadingOverlay(message = 'Loading...') {
    const overlay = createElement('div', {
        className: 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50',
    });

    const content = createElement('div', {
        className: 'bg-white dark:bg-gray-800 rounded-lg p-8 flex flex-col items-center gap-4',
    });

    content.appendChild(createSpinner('lg'));

    const text = createElement('p', {
        className: 'text-gray-900 dark:text-white font-semibold',
    }, message);

    content.appendChild(text);
    overlay.appendChild(content);

    return overlay;
}

/**
 * Show loading overlay
 * @param {string} message - Loading message
 * @returns {HTMLElement}
 */
export function showLoadingOverlay(message = 'Loading...') {
    const overlay = createLoadingOverlay(message);
    overlay.id = 'loading-overlay';
    document.body.appendChild(overlay);
    return overlay;
}

/**
 * Hide loading overlay
 */
export function hideLoadingOverlay() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.remove();
    }
}

/**
 * Create skeleton card
 * @returns {HTMLElement}
 */
export function createSkeletonCard() {
    const card = createElement('div', {
        className: 'bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden animate-pulse',
    });

    // Image skeleton
    const imageSkeleton = createElement('div', {
        className: 'h-48 bg-gray-300 dark:bg-gray-700',
    });
    card.appendChild(imageSkeleton);

    // Content skeleton
    const content = createElement('div', {
        className: 'p-4 space-y-3',
    });

    // Title
    const title = createElement('div', {
        className: 'h-6 bg-gray-300 dark:bg-gray-700 rounded w-3/4',
    });
    content.appendChild(title);

    // Subtitle
    const subtitle = createElement('div', {
        className: 'h-4 bg-gray-300 dark:bg-gray-700 rounded w-1/2',
    });
    content.appendChild(subtitle);

    // Description lines
    for (let i = 0; i < 3; i++) {
        const line = createElement('div', {
            className: 'h-3 bg-gray-300 dark:bg-gray-700 rounded',
        });
        content.appendChild(line);
    }

    card.appendChild(content);
    return card;
}

/**
 * Create skeleton grid
 * @param {string} containerId - Container element ID
 * @param {number} count - Number of skeleton cards
 */
export function showSkeletonGrid(containerId, count = 8) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container with id "${containerId}" not found`);
        return;
    }

    container.innerHTML = '';
    container.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6';

    for (let i = 0; i < count; i++) {
        container.appendChild(createSkeletonCard());
    }
}

/**
 * Create skeleton table row
 * @param {number} columns - Number of columns
 * @returns {HTMLElement}
 */
export function createSkeletonTableRow(columns = 5) {
    const row = createElement('tr', {
        className: 'animate-pulse',
    });

    for (let i = 0; i < columns; i++) {
        const cell = createElement('td', {
            className: 'px-4 py-3',
        });

        const skeleton = createElement('div', {
            className: 'h-4 bg-gray-300 dark:bg-gray-700 rounded',
        });

        cell.appendChild(skeleton);
        row.appendChild(cell);
    }

    return row;
}

/**
 * Show skeleton table
 * @param {string} tableId - Table element ID
 * @param {number} rows - Number of rows
 * @param {number} columns - Number of columns
 */
export function showSkeletonTable(tableId, rows = 10, columns = 5) {
    const table = document.getElementById(tableId);
    if (!table) {
        console.error(`Table with id "${tableId}" not found`);
        return;
    }

    const tbody = table.querySelector('tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    for (let i = 0; i < rows; i++) {
        tbody.appendChild(createSkeletonTableRow(columns));
    }
}

/**
 * Create inline loader
 * @param {string} text - Loading text
 * @returns {HTMLElement}
 */
export function createInlineLoader(text = 'Loading...') {
    const container = createElement('div', {
        className: 'flex items-center justify-center gap-3 py-8',
    });

    container.appendChild(createSpinner('md'));

    const textElement = createElement('span', {
        className: 'text-gray-600 dark:text-gray-400',
    }, text);

    container.appendChild(textElement);
    return container;
}

/**
 * Create progress bar
 * @param {number} progress - Progress percentage (0-100)
 * @param {string} label - Progress label
 * @returns {HTMLElement}
 */
export function createProgressBar(progress = 0, label = '') {
    const container = createElement('div', {
        className: 'w-full',
    });

    if (label) {
        const labelElement = createElement('div', {
            className: 'flex justify-between mb-2',
        });

        const labelText = createElement('span', {
            className: 'text-sm font-medium text-gray-700 dark:text-gray-300',
        }, label);

        const percentage = createElement('span', {
            className: 'text-sm font-medium text-gray-700 dark:text-gray-300',
        }, `${progress}%`);

        labelElement.appendChild(labelText);
        labelElement.appendChild(percentage);
        container.appendChild(labelElement);
    }

    const progressBar = createElement('div', {
        className: 'w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2',
    });

    const progressFill = createElement('div', {
        className: 'bg-blue-500 h-2 rounded-full transition-all duration-300',
    });
    progressFill.style.width = `${Math.min(100, Math.max(0, progress))}%`;

    progressBar.appendChild(progressFill);
    container.appendChild(progressBar);

    return container;
}

/**
 * Create pulsing dots loader
 * @returns {HTMLElement}
 */
export function createDotsLoader() {
    const container = createElement('div', {
        className: 'flex items-center gap-2',
    });

    for (let i = 0; i < 3; i++) {
        const dot = createElement('div', {
            className: 'w-3 h-3 bg-blue-500 rounded-full animate-pulse',
        });
        dot.style.animationDelay = `${i * 150}ms`;
        container.appendChild(dot);
    }

    return container;
}

export default {
    createSpinner,
    createLoadingOverlay,
    showLoadingOverlay,
    hideLoadingOverlay,
    createSkeletonCard,
    showSkeletonGrid,
    createSkeletonTableRow,
    showSkeletonTable,
    createInlineLoader,
    createProgressBar,
    createDotsLoader,
};
