/**
 * Chart Service - Handle chart creation and management
 * @module services/ChartService
 */

export class ChartService {
    constructor() {
        this.charts = new Map();
        this.defaultColors = {
            primary: '#3B82F6',
            success: '#10B981',
            warning: '#F59E0B',
            danger: '#EF4444',
            purple: '#8B5CF6',
            pink: '#EC4899',
        };
    }

    /**
     * Get color based on theme
     * @private
     */
    getColors(isDark = false) {
        return {
            text: isDark ? '#E5E7EB' : '#1F2937',
            grid: isDark ? '#374151' : '#E5E7EB',
            background: isDark ? '#1F2937' : '#FFFFFF',
        };
    }

    /**
     * Get common chart options
     * @private
     */
    getCommonOptions(isDark = false) {
        const colors = this.getColors(isDark);
        
        return {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: {
                        color: colors.text,
                        font: {
                            size: 12,
                            weight: '500'
                        }
                    }
                },
                tooltip: {
                    backgroundColor: isDark ? '#1F2937' : '#FFFFFF',
                    titleColor: colors.text,
                    bodyColor: colors.text,
                    borderColor: colors.grid,
                    borderWidth: 1,
                    cornerRadius: 8,
                    padding: 12
                }
            },
            scales: {
                x: {
                    ticks: { color: colors.text },
                    grid: { color: colors.grid }
                },
                y: {
                    ticks: { color: colors.text },
                    grid: { color: colors.grid }
                }
            }
        };
    }

    /**
     * Create or update a chart
     * @param {string} canvasId - Canvas element ID
     * @param {string} type - Chart type
     * @param {Object} data - Chart data
     * @param {Object} customOptions - Custom options
     * @returns {Chart} Chart instance
     */
    createChart(canvasId, type, data, customOptions = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas element ${canvasId} not found`);
            return null;
        }

        // Destroy existing chart if it exists
        this.destroyChart(canvasId);

        const isDark = document.documentElement.classList.contains('dark');
        const defaultOptions = this.getCommonOptions(isDark);
        
        const options = this.deepMerge(defaultOptions, customOptions);

        const chart = new Chart(canvas, {
            type,
            data,
            options
        });

        this.charts.set(canvasId, chart);
        return chart;
    }

    /**
     * Create a doughnut chart
     * @param {string} canvasId - Canvas element ID
     * @param {Array} labels - Labels
     * @param {Array} data - Data values
     * @param {Object} options - Custom options
     */
    createDoughnutChart(canvasId, labels, data, options = {}) {
        const chartData = {
            labels,
            datasets: [{
                data,
                backgroundColor: [
                    this.defaultColors.primary,
                    this.defaultColors.success,
                    this.defaultColors.warning,
                    this.defaultColors.danger,
                    this.defaultColors.purple,
                    this.defaultColors.pink,
                ],
                borderWidth: 2,
                borderColor: '#FFFFFF'
            }]
        };

        return this.createChart(canvasId, 'doughnut', chartData, options);
    }

    /**
     * Create a line chart
     * @param {string} canvasId - Canvas element ID
     * @param {Array} labels - X-axis labels
     * @param {Array} datasets - Array of dataset objects
     * @param {Object} options - Custom options
     */
    createLineChart(canvasId, labels, datasets, options = {}) {
        const chartData = { labels, datasets };
        return this.createChart(canvasId, 'line', chartData, options);
    }

    /**
     * Create a bar chart
     * @param {string} canvasId - Canvas element ID
     * @param {Array} labels - X-axis labels
     * @param {Array} datasets - Array of dataset objects
     * @param {Object} options - Custom options
     */
    createBarChart(canvasId, labels, datasets, options = {}) {
        const chartData = { labels, datasets };
        return this.createChart(canvasId, 'bar', chartData, options);
    }

    /**
     * Create a radar chart
     * @param {string} canvasId - Canvas element ID
     * @param {Array} labels - Labels
     * @param {Array} datasets - Array of dataset objects
     * @param {Object} options - Custom options
     */
    createRadarChart(canvasId, labels, datasets, options = {}) {
        const chartData = { labels, datasets };
        return this.createChart(canvasId, 'radar', chartData, options);
    }

    /**
     * Destroy a chart
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

    /**
     * Update chart theme
     * @param {string} canvasId - Canvas element ID
     */
    updateTheme(canvasId) {
        const chart = this.charts.get(canvasId);
        if (!chart) return;

        const isDark = document.documentElement.classList.contains('dark');
        const colors = this.getColors(isDark);

        // Update options
        if (chart.options.plugins?.legend?.labels) {
            chart.options.plugins.legend.labels.color = colors.text;
        }

        if (chart.options.scales) {
            Object.values(chart.options.scales).forEach(scale => {
                if (scale.ticks) scale.ticks.color = colors.text;
                if (scale.grid) scale.grid.color = colors.grid;
            });
        }

        chart.update();
    }

    /**
     * Update all charts theme
     */
    updateAllThemes() {
        this.charts.forEach((_, canvasId) => this.updateTheme(canvasId));
    }

    /**
     * Deep merge objects
     * @private
     */
    deepMerge(target, source) {
        const output = Object.assign({}, target);
        
        if (this.isObject(target) && this.isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this.isObject(source[key])) {
                    if (!(key in target)) {
                        Object.assign(output, { [key]: source[key] });
                    } else {
                        output[key] = this.deepMerge(target[key], source[key]);
                    }
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        
        return output;
    }

    /**
     * Check if value is an object
     * @private
     */
    isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }
}

// Export singleton instance
export const chartService = new ChartService();
