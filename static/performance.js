/**
 * Performance Monitoring Module - Terminal Interface v2.024
 * Real-time system monitoring with retro brutalism aesthetics
 * Memory optimized for 512MB RAM environments
 */

'use strict';

class TerminalPerformanceMonitor {
    constructor() {
        this.metrics = {
            memory: { used: 0, total: 0, percentage: 0 },
            cpu: { usage: 0, cores: navigator.hardwareConcurrency || 1 },
            network: { latency: 0, speed: 'unknown' },
            cache: { hits: 0, misses: 0, size: 0 },
            errors: { count: 0, rate: 0 },
            uptime: Date.now()
        };
        
        this.isMonitoring = false;
        this.observers = new Map();
        this.intervalId = null;
        this.performanceBuffer = [];
        this.maxBufferSize = 50; // Limit buffer to save memory
        
        this.initializeMonitoring();
    }
    
    initializeMonitoring() {
        // Performance API check
        if ('performance' in window) {
            this.setupPerformanceObserver();
        }
        
        // Memory API check (Chrome only)
        if ('memory' in performance) {
            this.setupMemoryMonitoring();
        }
        
        // Network monitoring
        this.setupNetworkMonitoring();
        
        // Error tracking
        this.setupErrorTracking();
        
        console.log('🔬 Terminal Performance Monitor initialized');
    }
    
    setupPerformanceObserver() {
        try {
            // Monitor navigation timing
            const navObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach(entry => {
                    if (entry.entryType === 'navigation') {
                        this.updateNavigationMetrics(entry);
                    }
                });
            });
            navObserver.observe({ entryTypes: ['navigation'] });
            
            // Monitor resource loading
            const resourceObserver = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach(entry => {
                    if (entry.entryType === 'resource') {
                        this.updateResourceMetrics(entry);
                    }
                });
            });
            resourceObserver.observe({ entryTypes: ['resource'] });
            
        } catch (error) {
            console.warn('Performance Observer not supported:', error);
        }
    }
    
    setupMemoryMonitoring() {
        // Chrome memory API
        setInterval(() => {
            if (performance.memory) {
                const memory = performance.memory;
                this.metrics.memory = {
                    used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
                    total: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
                    percentage: Math.round((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100)
                };
                
                // Memory warning at 80%
                if (this.metrics.memory.percentage > 80) {
                    this.emitMemoryWarning();
                }
            }
        }, 5000); // Check every 5 seconds
    }
    
    setupNetworkMonitoring() {
        // Network latency check
        this.checkNetworkLatency();
        
        // Connection type (if available)
        if ('connection' in navigator) {
            const connection = navigator.connection;
            this.metrics.network.speed = connection.effectiveType || 'unknown';
            
            connection.addEventListener('change', () => {
                this.metrics.network.speed = connection.effectiveType || 'unknown';
            });
        }
        
        // Periodic latency check
        setInterval(() => {
            this.checkNetworkLatency();
        }, 30000); // Every 30 seconds
    }
    
    async checkNetworkLatency() {
        try {
            const startTime = performance.now();
            const response = await fetch('/api/system/stats', {
                method: 'GET',
                cache: 'no-cache'
            });
            
            if (response.ok) {
                const endTime = performance.now();
                this.metrics.network.latency = Math.round(endTime - startTime);
                
                // Update cache metrics from response
                const data = await response.json();
                if (data.cache_size !== undefined) {
                    this.metrics.cache.size = data.cache_size;
                }
            }
        } catch (error) {
            this.metrics.network.latency = -1; // Error indicator
            this.trackError('network_check', error);
        }
    }
    
    setupErrorTracking() {
        // Global error handler
        window.addEventListener('error', (event) => {
            this.trackError('javascript', event.error);
        });
        
        // Promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            this.trackError('promise_rejection', event.reason);
        });
        
        // Custom error tracking for API calls
        this.interceptFetchErrors();
    }
    
    interceptFetchErrors() {
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            try {
                const response = await originalFetch(...args);
                
                if (!response.ok) {
                    this.trackError('api_error', {
                        status: response.status,
                        url: args[0]
                    });
                } else {
                    this.metrics.cache.hits++;
                }
                
                return response;
            } catch (error) {
                this.trackError('fetch_error', error);
                this.metrics.cache.misses++;
                throw error;
            }
        };
    }
    
    trackError(type, error) {
        this.metrics.errors.count++;
        this.metrics.errors.rate = this.metrics.errors.count / 
            ((Date.now() - this.metrics.uptime) / 60000); // errors per minute
        
        // Store recent errors (limit to save memory)
        if (!this.recentErrors) {
            this.recentErrors = [];
        }
        
        this.recentErrors.push({
            type,
            error: error.toString(),
            timestamp: Date.now()
        });
        
        // Keep only last 10 errors
        if (this.recentErrors.length > 10) {
            this.recentErrors = this.recentErrors.slice(-10);
        }
        
        console.error(`🚨 Terminal Error [${type}]:`, error);
    }
    
    updateNavigationMetrics(entry) {
        const loadTime = entry.loadEventEnd - entry.navigationStart;
        const domReady = entry.domContentLoadedEventEnd - entry.navigationStart;
        
        this.addToBuffer('navigation', {
            loadTime: Math.round(loadTime),
            domReady: Math.round(domReady),
            timestamp: Date.now()
        });
    }
    
    updateResourceMetrics(entry) {
        const loadTime = entry.responseEnd - entry.startTime;
        
        if (loadTime > 1000) { // Resources taking > 1s
            this.addToBuffer('slow_resource', {
                name: entry.name,
                loadTime: Math.round(loadTime),
                size: entry.transferSize || 0
            });
        }
    }
    
    addToBuffer(type, data) {
        this.performanceBuffer.push({ type, data, timestamp: Date.now() });
        
        // Maintain buffer size limit
        if (this.performanceBuffer.length > this.maxBufferSize) {
            this.performanceBuffer = this.performanceBuffer.slice(-this.maxBufferSize + 10);
        }
    }
    
    emitMemoryWarning() {
        const event = new CustomEvent('terminalMemoryWarning', {
            detail: this.metrics.memory
        });
        document.dispatchEvent(event);
        
        console.warn('⚠️ High memory usage detected:', this.metrics.memory);
    }
    
    startRealTimeMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        this.intervalId = setInterval(() => {
            this.updateDisplayMetrics();
        }, 2000); // Update every 2 seconds
        
        console.log('📊 Real-time monitoring started');
    }
    
    stopRealTimeMonitoring() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        console.log('📊 Real-time monitoring stopped');
    }
    
    updateDisplayMetrics() {
        // Update terminal stats in UI
        this.updateStatsDisplay();
        
        // Update system load indicator
        this.updateSystemLoadIndicator();
        
        // Check for performance issues
        this.checkPerformanceIssues();
    }
    
    updateStatsDisplay() {
        // Update memory usage
        const memoryElements = document.querySelectorAll('[data-metric="memory"]');
        memoryElements.forEach(el => {
            if (this.metrics.memory.used > 0) {
                el.textContent = `${this.metrics.memory.used}MB (${this.metrics.memory.percentage}%)`;
                
                // Color coding based on usage
                if (this.metrics.memory.percentage > 80) {
                    el.style.color = 'var(--terminal-red)';
                } else if (this.metrics.memory.percentage > 60) {
                    el.style.color = 'var(--terminal-amber)';
                } else {
                    el.style.color = 'var(--terminal-green)';
                }
            }
        });
        
        // Update network latency
        const latencyElements = document.querySelectorAll('[data-metric="latency"]');
        latencyElements.forEach(el => {
            if (this.metrics.network.latency >= 0) {
                el.textContent = `${this.metrics.network.latency}ms`;
                
                // Color coding based on latency
                if (this.metrics.network.latency > 1000) {
                    el.style.color = 'var(--terminal-red)';
                } else if (this.metrics.network.latency > 500) {
                    el.style.color = 'var(--terminal-amber)';
                } else {
                    el.style.color = 'var(--terminal-green)';
                }
            }
        });
        
        // Update cache hit rate
        const cacheElements = document.querySelectorAll('[data-metric="cache"]');
        cacheElements.forEach(el => {
            const total = this.metrics.cache.hits + this.metrics.cache.misses;
            if (total > 0) {
                const hitRate = Math.round((this.metrics.cache.hits / total) * 100);
                el.textContent = `${hitRate}% (${this.metrics.cache.size})`;
            }
        });
        
        // Update error rate
        const errorElements = document.querySelectorAll('[data-metric="errors"]');
        errorElements.forEach(el => {
            el.textContent = `${this.metrics.errors.count} (${this.metrics.errors.rate.toFixed(2)}/min)`;
            
            if (this.metrics.errors.rate > 5) {
                el.style.color = 'var(--terminal-red)';
            } else if (this.metrics.errors.rate > 1) {
                el.style.color = 'var(--terminal-amber)';
            } else {
                el.style.color = 'var(--terminal-green)';
            }
        });
    }
    
    updateSystemLoadIndicator() {
        const loadIndicators = document.querySelectorAll('.system-load-indicator');
        
        // Calculate overall load based on multiple factors
        let overallLoad = 0;
        overallLoad += this.metrics.memory.percentage * 0.4; // 40% weight
        overallLoad += (this.metrics.network.latency > 0 ? Math.min(this.metrics.network.latency / 10, 100) : 0) * 0.3; // 30% weight
        overallLoad += (this.metrics.errors.rate * 10) * 0.3; // 30% weight
        
        overallLoad = Math.min(Math.round(overallLoad), 100);
        
        loadIndicators.forEach(indicator => {
            indicator.textContent = `${overallLoad}%`;
            
            // Visual indicators
            if (overallLoad > 80) {
                indicator.className = 'system-load-indicator critical';
                indicator.style.color = 'var(--terminal-red)';
            } else if (overallLoad > 60) {
                indicator.className = 'system-load-indicator warning';
                indicator.style.color = 'var(--terminal-amber)';
            } else {
                indicator.className = 'system-load-indicator normal';
                indicator.style.color = 'var(--terminal-green)';
            }
        });
    }
    
    checkPerformanceIssues() {
        const issues = [];
        
        // High memory usage
        if (this.metrics.memory.percentage > 85) {
            issues.push('HIGH_MEMORY_USAGE');
        }
        
        // High latency
        if (this.metrics.network.latency > 2000) {
            issues.push('HIGH_NETWORK_LATENCY');
        }
        
        // High error rate
        if (this.metrics.errors.rate > 10) {
            issues.push('HIGH_ERROR_RATE');
        }
        
        // Low cache hit rate
        const total = this.metrics.cache.hits + this.metrics.cache.misses;
        if (total > 10 && (this.metrics.cache.hits / total) < 0.5) {
            issues.push('LOW_CACHE_EFFICIENCY');
        }
        
        if (issues.length > 0) {
            this.reportPerformanceIssues(issues);
        }
    }
    
    reportPerformanceIssues(issues) {
        const event = new CustomEvent('terminalPerformanceIssues', {
            detail: { issues, metrics: this.metrics }
        });
        document.dispatchEvent(event);
        
        console.warn('⚠️ Performance issues detected:', issues);
    }
    
    getMetricsReport() {
        const uptime = Math.round((Date.now() - this.metrics.uptime) / 1000);
        const uptimeFormatted = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`;
        
        return {
            ...this.metrics,
            uptime: uptimeFormatted,
            recentErrors: this.recentErrors || [],
            performanceBuffer: this.performanceBuffer.slice(-10), // Last 10 entries
            timestamp: new Date().toISOString()
        };
    }
    
    // Terminal command integration
    executePerformanceCommand(command, args) {
        switch (command) {
            case 'status':
                return this.getTerminalStatus();
            case 'memory':
                return this.getMemoryStatus();
            case 'network':
                return this.getNetworkStatus();
            case 'errors':
                return this.getErrorStatus();
            case 'cache':
                return this.getCacheStatus();
            case 'start':
                this.startRealTimeMonitoring();
                return 'Real-time monitoring started';
            case 'stop':
                this.stopRealTimeMonitoring();
                return 'Real-time monitoring stopped';
            case 'clear':
                this.clearMetrics();
                return 'Performance metrics cleared';
            default:
                return 'Unknown performance command. Available: status, memory, network, errors, cache, start, stop, clear';
        }
    }
    
    getTerminalStatus() {
        const report = this.getMetricsReport();
        return `
PERFORMANCE STATUS REPORT:
├─ Memory: ${report.memory.used}MB (${report.memory.percentage}%)
├─ Network: ${report.network.latency}ms latency
├─ Cache: ${Math.round((report.cache.hits / (report.cache.hits + report.cache.misses || 1)) * 100)}% hit rate
├─ Errors: ${report.errors.count} total, ${report.errors.rate.toFixed(2)}/min
├─ Uptime: ${report.uptime}
└─ Monitoring: ${this.isMonitoring ? 'ACTIVE' : 'INACTIVE'}`;
    }
    
    getMemoryStatus() {
        return `MEMORY ANALYSIS:
├─ Used: ${this.metrics.memory.used}MB
├─ Total: ${this.metrics.memory.total}MB  
├─ Usage: ${this.metrics.memory.percentage}%
├─ Status: ${this.metrics.memory.percentage > 80 ? 'CRITICAL' : this.metrics.memory.percentage > 60 ? 'WARNING' : 'NORMAL'}
└─ Buffer Size: ${this.performanceBuffer.length} entries`;
    }
    
    getNetworkStatus() {
        return `NETWORK ANALYSIS:
├─ Latency: ${this.metrics.network.latency}ms
├─ Speed: ${this.metrics.network.speed}
├─ Status: ${this.metrics.network.latency > 1000 ? 'SLOW' : this.metrics.network.latency > 500 ? 'MODERATE' : 'FAST'}
└─ Cache Hits: ${this.metrics.cache.hits}`;
    }
    
    getErrorStatus() {
        const recentErrors = this.recentErrors || [];
        return `ERROR ANALYSIS:
├─ Total Errors: ${this.metrics.errors.count}
├─ Error Rate: ${this.metrics.errors.rate.toFixed(2)}/min
├─ Recent Count: ${recentErrors.length}
└─ Last Error: ${recentErrors.length > 0 ? recentErrors[recentErrors.length - 1].type : 'None'}`;
    }
    
    getCacheStatus() {
        const total = this.metrics.cache.hits + this.metrics.cache.misses;
        const hitRate = total > 0 ? Math.round((this.metrics.cache.hits / total) * 100) : 0;
        
        return `CACHE ANALYSIS:
├─ Hit Rate: ${hitRate}%
├─ Cache Size: ${this.metrics.cache.size}
├─ Total Hits: ${this.metrics.cache.hits}
├─ Total Misses: ${this.metrics.cache.misses}
└─ Efficiency: ${hitRate > 70 ? 'GOOD' : hitRate > 50 ? 'MODERATE' : 'POOR'}`;
    }
    
    clearMetrics() {
        this.metrics.errors.count = 0;
        this.metrics.errors.rate = 0;
        this.metrics.cache.hits = 0;
        this.metrics.cache.misses = 0;
        this.performanceBuffer = [];
        this.recentErrors = [];
        this.metrics.uptime = Date.now();
    }
}

// Initialize performance monitor
const terminalPerformance = new TerminalPerformanceMonitor();

// Auto-start monitoring after page load
window.addEventListener('load', () => {
    setTimeout(() => {
        terminalPerformance.startRealTimeMonitoring();
    }, 2000);
});

// Export for global access
window.terminalPerformance = terminalPerformance;

// Integration with existing terminal system
if (window.retroNewsPortal && window.retroNewsPortal.terminalProcessor) {
    // Add performance commands to terminal
    const originalExecute = window.retroNewsPortal.terminalProcessor.execute;
    window.retroNewsPortal.terminalProcessor.execute = function(commandStr) {
        const [command, ...args] = commandStr.toLowerCase().split(' ');
        
        if (command === 'perf' || command === 'performance') {
            const subCommand = args[0] || 'status';
            const result = terminalPerformance.executePerformanceCommand(subCommand, args.slice(1));
            return {
                status: 'success',
                message: result
            };
        }
        
        return originalExecute.call(this, commandStr);
    };
}

console.log('🚀 Terminal Performance Monitor loaded - Type "perf status" in terminal');
