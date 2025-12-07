/**
 * Utility functions for MotorsportDB
 * @module utils/helpers
 */

/**
 * Calculate age from birth date and optional death date
 * @param {string} birthDate - Birth date (YYYY or YYYY-MM-DD)
 * @param {string} [deathDate] - Death date (optional)
 * @returns {number} Age in years
 */
export function calculateAge(birthDate, deathDate = null) {
    if (!birthDate) {
        return null;
    }

    try {
        const birth = new Date(birthDate);
        const end = deathDate ? new Date(deathDate) : new Date();
        
        if (!isNaN(birth.getTime()) && !isNaN(end.getTime())) {
            return end.getFullYear() - birth.getFullYear();
        }
    } catch (e) {
        // Handle year-only format
        if (/^\d{4}$/.test(birthDate)) {
            const endYear = deathDate && /^\d{4}$/.test(deathDate) 
                ? parseInt(deathDate) 
                : new Date().getFullYear();
            return endYear - parseInt(birthDate);
        }
    }

    return null;
}

/**
 * Format name from ID format (replace _ with spaces, capitalize)
 * @param {string} id - ID string
 * @returns {string} Formatted name
 */
export function formatName(id) {
    if (!id) return '';
    return id.split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

/**
 * Get flag image path from country name
 * @param {string} country - Country name
 * @returns {string} Flag image path
 */
export function getFlagPath(country) {
    if (!country) {
        return 'assets/flags/default.png';
    }
    
    const normalized = country.toLowerCase().replace(/ /g, '_');
    return `assets/flags/${normalized}.png`;
}

/**
 * Debounce function execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait) {
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
 * Throttle function execution
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
    let inThrottle;
    
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Sanitize HTML to prevent XSS
 * @param {string} html - HTML string
 * @returns {string} Sanitized HTML
 */
export function sanitizeHTML(html) {
    const temp = document.createElement('div');
    temp.textContent = html;
    return temp.innerHTML;
}

/**
 * Escape HTML entities
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
export function escapeHTML(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    
    return text.replace(/[&<>"']/g, char => map[char]);
}

/**
 * Format number with thousands separator
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
export function formatNumber(num) {
    return new Intl.NumberFormat('en-US').format(num);
}

/**
 * Format date
 * @param {string|Date} date - Date to format
 * @param {string} locale - Locale (default: 'en-US')
 * @returns {string} Formatted date
 */
export function formatDate(date, locale = 'en-US') {
    const d = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(d.getTime())) {
        return date.toString();
    }
    
    return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(d);
}

/**
 * Check if element is in viewport
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} True if element is in viewport
 */
export function isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

/**
 * Lazy load images
 * @param {string} selector - Image selector
 */
export function lazyLoadImages(selector = 'img[data-src]') {
    const images = document.querySelectorAll(selector);
    
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.removeAttribute('data-src');
                observer.unobserve(img);
            }
        });
    });
    
    images.forEach(img => imageObserver.observe(img));
}

/**
 * Get query parameter from URL
 * @param {string} param - Parameter name
 * @returns {string|null} Parameter value or null
 */
export function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

/**
 * Set query parameter in URL without reload
 * @param {string} param - Parameter name
 * @param {string} value - Parameter value
 */
export function setQueryParam(param, value) {
    const url = new URL(window.location);
    url.searchParams.set(param, value);
    window.history.pushState({}, '', url);
}

/**
 * Show loading spinner
 * @param {HTMLElement} container - Container element
 */
export function showLoading(container) {
    const spinner = document.createElement('div');
    spinner.className = 'flex justify-center items-center py-8';
    spinner.innerHTML = `
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    `;
    container.appendChild(spinner);
}

/**
 * Hide loading spinner
 * @param {HTMLElement} container - Container element
 */
export function hideLoading(container) {
    const spinner = container.querySelector('.animate-spin');
    if (spinner) {
        spinner.closest('.flex').remove();
    }
}

/**
 * Show error message
 * @param {HTMLElement} container - Container element
 * @param {string} message - Error message
 */
export function showError(container, message) {
    const error = document.createElement('div');
    error.className = 'bg-red-100 dark:bg-red-900 border-l-4 border-red-500 text-red-700 dark:text-red-200 p-4 rounded my-4';
    error.innerHTML = `
        <div class="flex items-center">
            <svg class="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
            </svg>
            <span>${escapeHTML(message)}</span>
        </div>
    `;
    container.appendChild(error);
}

/**
 * Smooth scroll to element
 * @param {string|HTMLElement} target - Target element or selector
 * @param {number} offset - Offset from top (default: 0)
 */
export function smoothScrollTo(target, offset = 0) {
    const element = typeof target === 'string' 
        ? document.querySelector(target) 
        : target;
    
    if (!element) return;
    
    const top = element.getBoundingClientRect().top + window.pageYOffset - offset;
    
    window.scrollTo({
        top,
        behavior: 'smooth'
    });
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} True if successful
 */
export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.error('Failed to copy:', err);
        return false;
    }
}

/**
 * Generate unique ID
 * @returns {string} Unique ID
 */
export function generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
