/**
 * MotorsportDB - DOM Utilities
 * Helper functions for DOM manipulation
 */

import { UI_CONFIG } from '../config/constants.js';

/**
 * Create element with attributes and children
 * @param {string} tag - HTML tag name
 * @param {Object} attributes - Element attributes
 * @param {Array|string} children - Child elements or text
 * @returns {HTMLElement}
 */
export function createElement(tag, attributes = {}, children = []) {
    const element = document.createElement(tag);

    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'dataset') {
            Object.entries(value).forEach(([dataKey, dataValue]) => {
                element.dataset[dataKey] = dataValue;
            });
        } else if (key.startsWith('on') && typeof value === 'function') {
            const eventName = key.slice(2).toLowerCase();
            element.addEventListener(eventName, value);
        } else {
            element.setAttribute(key, value);
        }
    });

    // Append children
    const childArray = Array.isArray(children) ? children : [children];
    childArray.forEach(child => {
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        } else if (child instanceof HTMLElement) {
            element.appendChild(child);
        }
    });

    return element;
}

/**
 * Safely get element by ID
 * @param {string} id - Element ID
 * @returns {HTMLElement|null}
 */
export function getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
        console.warn(`Element with id "${id}" not found`);
    }
    return element;
}

/**
 * Show element with optional animation
 * @param {HTMLElement|string} element - Element or ID
 * @param {boolean} animate - Whether to animate
 */
export function show(element, animate = true) {
    const el = typeof element === 'string' ? getElement(element) : element;
    if (!el) return;

    el.classList.remove('hidden');
    if (animate) {
        el.classList.add('animate-fade-in');
    }
}

/**
 * Hide element
 * @param {HTMLElement|string} element - Element or ID
 */
export function hide(element) {
    const el = typeof element === 'string' ? getElement(element) : element;
    if (!el) return;

    el.classList.add('hidden');
}

/**
 * Toggle element visibility
 * @param {HTMLElement|string} element - Element or ID
 */
export function toggle(element) {
    const el = typeof element === 'string' ? getElement(element) : element;
    if (!el) return;

    el.classList.toggle('hidden');
}

/**
 * Clear element content
 * @param {HTMLElement|string} element - Element or ID
 */
export function clear(element) {
    const el = typeof element === 'string' ? getElement(element) : element;
    if (!el) return;

    el.innerHTML = '';
}

/**
 * Set element HTML safely (prevents XSS)
 * @param {HTMLElement|string} element - Element or ID
 * @param {string} html - HTML content
 */
export function setHTML(element, html) {
    const el = typeof element === 'string' ? getElement(element) : element;
    if (!el) return;

    // Simple XSS prevention - escape script tags
    const sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    el.innerHTML = sanitized;
}

/**
 * Fade in element
 * @param {HTMLElement|string} element - Element or ID
 * @param {number} duration - Animation duration in ms
 */
export function fadeIn(element, duration = UI_CONFIG.ANIMATION_DURATION) {
    const el = typeof element === 'string' ? getElement(element) : element;
    if (!el) return;

    el.style.opacity = '0';
    el.classList.remove('hidden');
    el.style.transition = `opacity ${duration}ms ease`;

    requestAnimationFrame(() => {
        el.style.opacity = '1';
    });
}

/**
 * Fade out element
 * @param {HTMLElement|string} element - Element or ID
 * @param {number} duration - Animation duration in ms
 */
export function fadeOut(element, duration = UI_CONFIG.ANIMATION_DURATION) {
    const el = typeof element === 'string' ? getElement(element) : element;
    if (!el) return;

    el.style.opacity = '1';
    el.style.transition = `opacity ${duration}ms ease`;

    requestAnimationFrame(() => {
        el.style.opacity = '0';
    });

    setTimeout(() => {
        el.classList.add('hidden');
    }, duration);
}

/**
 * Add loading spinner to element
 * @param {HTMLElement|string} element - Element or ID
 * @param {string} size - Size class (sm, md, lg)
 */
export function showLoading(element, size = 'md') {
    const el = typeof element === 'string' ? getElement(element) : element;
    if (!el) return;

    const sizeClasses = {
        sm: 'w-4 h-4',
        md: 'w-8 h-8',
        lg: 'w-12 h-12',
    };

    const spinner = createElement('div', {
        className: `flex items-center justify-center ${sizeClasses[size]}`,
    }, [
        createElement('div', {
            className: `animate-spin rounded-full border-b-2 border-blue-500 ${sizeClasses[size]}`,
        }),
    ]);

    el.appendChild(spinner);
}

/**
 * Remove loading spinner from element
 * @param {HTMLElement|string} element - Element or ID
 */
export function hideLoading(element) {
    const el = typeof element === 'string' ? getElement(element) : element;
    if (!el) return;

    const spinner = el.querySelector('.animate-spin');
    if (spinner) {
        spinner.parentElement.remove();
    }
}

/**
 * Scroll to element smoothly
 * @param {HTMLElement|string} element - Element or ID
 * @param {Object} options - Scroll options
 */
export function scrollTo(element, options = {}) {
    const el = typeof element === 'string' ? getElement(element) : element;
    if (!el) return;

    el.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        ...options,
    });
}

/**
 * Check if element is in viewport
 * @param {HTMLElement} element - Element to check
 * @param {number} threshold - Pixels from edge
 * @returns {boolean}
 */
export function isInViewport(element, threshold = 0) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= -threshold &&
        rect.left >= -threshold &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) + threshold &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth) + threshold
    );
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in ms
 * @returns {Function}
 */
export function debounce(func, wait = UI_CONFIG.DEBOUNCE_DELAY) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in ms
 * @returns {Function}
 */
export function throttle(func, limit = 100) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Lazy load images
 * @param {string} selector - Image selector
 * @param {number} threshold - Pixels from viewport
 */
export function lazyLoadImages(selector = 'img[data-src]', threshold = UI_CONFIG.LAZY_LOAD_THRESHOLD) {
    const images = document.querySelectorAll(selector);

    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    imageObserver.unobserve(img);
                }
            });
        }, {
            rootMargin: `${threshold}px`,
        });

        images.forEach(img => imageObserver.observe(img));
    } else {
        // Fallback for older browsers
        images.forEach(img => {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
        });
    }
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text) {
    try {
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            return true;
        }
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        return false;
    }
}
