/**
 * MotorsportDB - Chart Service
 * Wrapper around Chart.js with theme support and common configurations
 */

import { CHART_COLORS } from '../config/constants.js';
import { themeService } from './ThemeService.js';

class ChartService {
    constructor() {
        this.charts = new Map();
        this.defaultOptions = this._getDefaultOptions();
        
        // Subscribe to theme changes
        themeService.subscribe(() => this.updateAllCharts());
    }

    /**
     * Get default chart options with theme support
     * @private
     */
    _getDefaultOptions() {
        const colors = themeService.getChartColors();
        
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: colors.text,
                        font: { size: 12, weight: 'bold' },
                        padding: 15,
                    },
                },
                tooltip: {
                    backgroundColor: colors.tooltip.background,
                    titleColor: colors.tooltip.text,
                    bodyColor: colors.tooltip.text,
                    borderColor: colors.tooltip.border,
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 12,
                },
            },
            scales: {
                x: {
                    ticks: { color: colors.text },
                    grid: { color: colors.grid },
                },
                y: {
                    ticks: { color: colors.text },
                    grid: { color: colors.grid },
                },
            },
        };
    }

    /**
     * Create a doughnut chart
     * @param {string} canvasId - Canvas element ID
     * @param {Array} labels - Chart labels
     * @param {Array} data - Chart data
     * @param {Object} customOptions - Custom options
     * @returns {Chart}
     */
    createDoughnutChart(canvasId, labels, data, customOptions = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas element with id "${canvasId}" not found`);
            return null;
        }

        const ctx = canvas.getContext('2d');
        const colors = this._generateColors(data.length);

        const config = {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: colors,
                    borderColor: themeService.isDark() ? '#1F2937' : '#FFFFFF',
                    borderWidth: 2,
                }],
            },
            options: this._mergeOptions(this.defaultOptions, customOptions),
        };

        const chart = new Chart(ctx, config);
        this.charts.set(canvasId, chart);
        return chart;
    }

    /**
     * Create a line chart
     * @param {string} canvasId - Canvas element ID
     * @param {Array} labels - Chart labels
     * @param {Array} datasets - Chart datasets
     * @param {Object} customOptions - Custom options
     * @returns {Chart}
     */
    createLineChart(canvasId, data, customOptions = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas element with id "${canvasId}" not found`);
            return null;
        }

        const ctx = canvas.getContext('2d');
        const processedDatasets = this._processDatasets(data.datasets, 'line');

        const config = {
            type: 'line',
            data: { labels: data.labels, datasets: processedDatasets },
            options: this._mergeOptions(this.defaultOptions, customOptions),
        };

        const chart = new Chart(ctx, config);
        this.charts.set(canvasId, chart);
        return chart;
    }

    /**
     * Create a bar chart
     * @param {string} canvasId - Canvas element ID
     * @param {Array} labels - Chart labels
     * @param {Array} datasets - Chart datasets
     * @param {Object} customOptions - Custom options
     * @returns {Chart}
     */
    createBarChart(canvasId, labels, datasets, customOptions = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas element with id "${canvasId}" not found`);
            return null;
        }

        const ctx = canvas.getContext('2d');
        const processedDatasets = this._processDatasets(datasets, 'bar');

        const config = {
            type: 'bar',
            data: { labels, datasets: processedDatasets },
            options: this._mergeOptions(this.defaultOptions, customOptions),
        };

        const chart = new Chart(ctx, config);
        this.charts.set(canvasId, chart);
        return chart;
    }

    /**
     * Create a radar chart
     * @param {string} canvasId - Canvas element ID
     * @param {Array} labels - Chart labels
     * @param {Array} datasets - Chart datasets
     * @param {Object} customOptions - Custom options
     * @returns {Chart}
     */
    createRadarChart(canvasId, labels, datasets, customOptions = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas element with id "${canvasId}" not found`);
            return null;
        }

        const ctx = canvas.getContext('2d');
        const processedDatasets = this._processDatasets(datasets, 'radar');

        const config = {
            type: 'radar',
            data: { labels, datasets: processedDatasets },
            options: this._mergeOptions(this.defaultOptions, {
                scales: {
                    r: {
                        ticks: { color: themeService.getChartColors().text },
                        grid: { color: themeService.getChartColors().grid },
                    },
                },
                ...customOptions,
            }),
        };

        const chart = new Chart(ctx, config);
        this.charts.set(canvasId, chart);
        return chart;
    }

    /**
     * Process datasets with theme-aware colors
     * @private
     */
    _processDatasets(datasets, type) {
        return datasets.map((dataset, index) => {
            const color = this._getColorByIndex(index);
            const processed = {
                ...dataset,
                borderColor: color,
                backgroundColor: type === 'line' 
                    ? this._hexToRgba(color, 0.1) 
                    : this._hexToRgba(color, 0.8),
            };

            if (type === 'line') {
                processed.tension = 0.4;
                processed.fill = true;
            }

            return processed;
        });
    }

    /**
     * Generate color palette
     * @private
     */
    _generateColors(count) {
        const baseColors = Object.values(CHART_COLORS);
        const colors = [];
        
        for (let i = 0; i < count; i++) {
            colors.push(baseColors[i % baseColors.length]);
        }
        
        return colors;
    }

    /**
     * Get color by index
     * @private
     */
    _getColorByIndex(index) {
        const colors = Object.values(CHART_COLORS);
        return colors[index % colors.length];
    }

    /**
     * Convert hex to rgba
     * @private
     */
    _hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    /**
     * Merge options recursively
     * @private
     */
    _mergeOptions(defaults, custom) {
        return {
            ...defaults,
            ...custom,
            plugins: {
                ...defaults.plugins,
                ...custom.plugins,
            },
            scales: {
                ...defaults.scales,
                ...custom.scales,
            },
        };
    }

    /**
     * Update all charts for theme change
     */
    updateAllCharts() {
        const newColors = themeService.getChartColors();
        
        this.charts.forEach((chart, id) => {
            // Update only the theme-specific colors without reconstructing options
            if (chart.options.plugins && chart.options.plugins.legend && chart.options.plugins.legend.labels) {
                chart.options.plugins.legend.labels.color = newColors.text;
            }
            if (chart.options.plugins && chart.options.plugins.tooltip) {
                chart.options.plugins.tooltip.backgroundColor = newColors.tooltip.background;
                chart.options.plugins.tooltip.titleColor = newColors.tooltip.text;
                chart.options.plugins.tooltip.bodyColor = newColors.tooltip.text;
                chart.options.plugins.tooltip.borderColor = newColors.tooltip.border;
            }
            if (chart.options.scales) {
                if (chart.options.scales.x) {
                    if (chart.options.scales.x.ticks) chart.options.scales.x.ticks.color = newColors.text;
                    if (chart.options.scales.x.grid) chart.options.scales.x.grid.color = newColors.grid;
                }
                if (chart.options.scales.y) {
                    if (chart.options.scales.y.ticks) chart.options.scales.y.ticks.color = newColors.text;
                    if (chart.options.scales.y.grid) chart.options.scales.y.grid.color = newColors.grid;
                }
            }
            
            // Update border colors for doughnut/pie charts
            if (chart.config.type === 'doughnut' || chart.config.type === 'pie') {
                const borderColor = themeService.isDark() ? '#1F2937' : '#FFFFFF';
                chart.data.datasets.forEach(dataset => {
                    if (dataset.borderColor) dataset.borderColor = borderColor;
                });
            }
            
            // Update chart without animation and without options recursion
            chart.update('none');
        });
    }

    /**
     * Get specific chart instance
     * @param {string} canvasId - Canvas element ID
     * @returns {Chart|null}
     */
    getChart(canvasId) {
        return this.charts.get(canvasId) || null;
    }

    /**
     * Destroy specific chart
     * @param {string} canvasId - Canvas element ID
     */
    destroyChart(canvasId) {
        const chart = this.charts.get(canvasId);
        if (chart) {
            chart.destroy();
            this.charts.delete(canvasId);
        }
    }

    /**
     * Destroy all charts
     */
    destroyAll() {
        this.charts.forEach(chart => chart.destroy());
        this.charts.clear();
    }
}

// Export singleton instance
export const chartService = new ChartService();
export default chartService;
