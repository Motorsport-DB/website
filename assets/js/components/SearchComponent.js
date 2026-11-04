/**
 * MotorsportDB - Search Component
 * Search bar with instant, client-side autocomplete (see services/SearchIndex.js).
 * Falls back to the server API if the index cannot be loaded.
 */

import { apiService } from '../services/ApiService.js';
import { searchIndex } from '../services/SearchIndex.js';
import { UI_CONFIG } from '../config/constants.js';
import { debounce, createElement } from '../utils/dom.js';

const TYPE_LABELS = {
    driver: 'Driver',
    team: 'Team',
    championship: 'Championship',
};

let instances = 0;

export class SearchComponent {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container with id "${containerId}" not found`);
        }

        this.options = {
            placeholder: 'Search drivers, teams, championships...',
            minLength: UI_CONFIG.SEARCH_MIN_LENGTH,
            debounceDelay: 60,
            showImages: true,
            maxResults: 10,
            types: null,
            onSelect: null,
            ...options,
        };

        this.uid = `msdb-search-${++instances}`;
        this.results = [];
        this.activeIndex = -1;
        this.requestId = 0;
        this.debouncedSearch = debounce((query) => this.search(query), this.options.debounceDelay);

        this.render();
        this.attachEventListeners();
    }

    render() {
        this.container.innerHTML = '';
        this.container.classList.add('relative');

        const label = createElement('label', { for: `${this.uid}-input`, className: 'sr-only' }, this.options.placeholder);

        this.searchInput = createElement('input', {
            id: `${this.uid}-input`,
            type: 'search',
            autocomplete: 'off',
            spellcheck: 'false',
            role: 'combobox',
            'aria-autocomplete': 'list',
            'aria-expanded': 'false',
            'aria-controls': `${this.uid}-list`,
            placeholder: this.options.placeholder,
            className: 'w-full px-4 py-3 rounded-lg border-2 border-gray-300 dark:border-gray-600 ' +
                'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ' +
                'focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 ' +
                'transition-colors duration-200',
        });

        this.resultsContainer = createElement('ul', {
            id: `${this.uid}-list`,
            role: 'listbox',
            'aria-label': 'Search results',
            className: 'mt-2 space-y-2',
        });

        this.status = createElement('div', { className: 'sr-only', 'aria-live': 'polite' });

        this.container.append(label, this.searchInput, this.resultsContainer, this.status);
    }

    attachEventListeners() {
        // Start downloading the index as soon as the user shows interest.
        this.searchInput.addEventListener('focus', () => searchIndex.load().catch(() => {}), { once: true });

        this.searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            if (query.length < this.options.minLength) {
                this.requestId++;
                this.clearResults();
                return;
            }
            this.debouncedSearch(query);
        });

        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.clearResults();
            }
        });

        this.searchInput.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    this.setActive(this.activeIndex + 1);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.setActive(this.activeIndex - 1);
                    break;
                case 'Enter': {
                    const result = this.results[this.activeIndex >= 0 ? this.activeIndex : 0];
                    if (result) {
                        e.preventDefault();
                        this.select(result);
                    }
                    break;
                }
                case 'Escape':
                    this.clearResults();
                    break;
                default:
                    break;
            }
        });
    }

    async search(query) {
        const requestId = ++this.requestId;
        let results;
        try {
            results = await searchIndex.search(query, { limit: this.options.maxResults, types: this.options.types });
        } catch (indexError) {
            console.warn('Search index unavailable, using the server:', indexError);
            try {
                this.showMessage('Searching…');
                results = (await apiService.search(query)) || [];
            } catch (error) {
                console.error('Search error:', error);
                if (requestId === this.requestId) this.showMessage('An error occurred. Please try again.', true);
                return;
            }
        }
        if (requestId !== this.requestId) return; // a newer query is in flight

        if (!results.length) {
            this.showMessage(`No results for “${query}”`);
            return;
        }
        this.displayResults(results.slice(0, this.options.maxResults));
    }

    displayResults(results) {
        this.results = results;
        this.activeIndex = -1;
        this.resultsContainer.replaceChildren(...results.map((r, i) => this.createResultItem(r, i)));
        this.searchInput.setAttribute('aria-expanded', 'true');
        this.status.textContent = `${results.length} result${results.length > 1 ? 's' : ''}`;
    }

    createResultItem(result, index) {
        const item = createElement('li', {
            id: `${this.uid}-opt-${index}`,
            role: 'option',
            'aria-selected': 'false',
            className: 'search-result text-left bg-white dark:bg-gray-800 shadow-sm p-3 rounded-lg flex items-center gap-4 ' +
                'cursor-pointer transition-colors duration-150 hover:bg-blue-50 dark:hover:bg-gray-700',
        });

        if (this.options.showImages && result.image) {
            const img = createElement('img', {
                src: result.image,
                alt: '',
                loading: 'lazy',
                width: '48',
                height: '48',
                className: 'w-12 h-12 rounded-full object-contain bg-white dark:bg-gray-700 ' +
                    'border-2 border-blue-400 dark:border-blue-500 p-0.5 flex-shrink-0',
            });
            img.addEventListener('error', () => { img.style.visibility = 'hidden'; }, { once: true });
            item.appendChild(img);
        }

        const content = createElement('div', { className: 'flex flex-col min-w-0 flex-1' });
        content.appendChild(createElement('a', {
            href: result.url,
            tabindex: '-1',
            className: 'text-base sm:text-lg font-semibold text-gray-900 dark:text-blue-300 truncate hover:underline',
        }, result.name));

        const details = [TYPE_LABELS[result.type] || result.type];
        const meta = result.metadata || {};
        if (meta.first && meta.last) {
            details.push(meta.first === meta.last ? String(meta.first) : `${meta.first}–${meta.last}`);
        }
        if (meta.country) details.push(String(meta.country).replace(/_/g, ' '));
        if (result.via) details.push(`also known as ${result.via}`);
        content.appendChild(createElement('span', {
            className: 'text-xs text-gray-600 dark:text-gray-400 truncate',
        }, details.join(' · ')));

        item.appendChild(content);
        item.addEventListener('mousedown', (e) => e.preventDefault()); // keep focus in the input
        item.addEventListener('click', (e) => {
            if (e.target.closest('a') && !this.options.onSelect) return; // native link behaviour
            e.preventDefault();
            this.select(result);
        });
        item.addEventListener('mouseenter', () => this.setActive(index, false));
        return item;
    }

    setActive(index, scroll = true) {
        if (!this.results.length) return;
        const count = this.results.length;
        this.activeIndex = (index + count) % count;
        [...this.resultsContainer.children].forEach((el, i) => {
            const active = i === this.activeIndex;
            el.setAttribute('aria-selected', String(active));
            el.classList.toggle('ring-2', active);
            el.classList.toggle('ring-blue-500', active);
            if (active && scroll) el.scrollIntoView({ block: 'nearest' });
        });
        this.searchInput.setAttribute('aria-activedescendant', `${this.uid}-opt-${this.activeIndex}`);
    }

    select(result) {
        if (this.options.onSelect) {
            this.options.onSelect(result);
            this.clearResults();
        } else {
            window.location.href = result.url;
        }
    }

    showMessage(text, isError = false) {
        this.results = [];
        this.activeIndex = -1;
        this.resultsContainer.replaceChildren(createElement('li', {
            role: 'status',
            className: `text-center py-4 ${isError ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`,
        }, text));
        this.searchInput.setAttribute('aria-expanded', 'false');
    }

    clearResults() {
        this.results = [];
        this.activeIndex = -1;
        this.resultsContainer.replaceChildren();
        this.searchInput.setAttribute('aria-expanded', 'false');
        this.searchInput.removeAttribute('aria-activedescendant');
    }

    focus() {
        this.searchInput.focus();
    }

    clear() {
        this.searchInput.value = '';
        this.clearResults();
    }

    destroy() {
        this.container.innerHTML = '';
    }
}

export default SearchComponent;
