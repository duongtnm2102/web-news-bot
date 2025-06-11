/**
 * Advanced PWA Features for E-con News Terminal v2.024
 * Enhanced Progressive Web App functionality with brutalist terminal aesthetics
 * Based on latest PWA standards and best practices (2024-2025)
 * 
 * Sources: MDN PWA docs (2025), Microsoft Learn, W3C PWA specs
 * Features: Advanced caching, background sync, notifications, offline mode
 */

// ===============================
// PWA ENHANCED MANAGER
// ===============================

class TerminalPWAManager {
    constructor() {
        this.isOnline = navigator.onLine;
        this.installPrompt = null;
        this.updateAvailable = false;
        this.notifications = [];
        this.backgroundSync = null;
        this.offlineQueue = [];
        
        // Terminal-style configuration
        this.config = {
            cacheName: 'econ-terminal-v2024',
            offlineUrl: '/offline.html',
            maxNotifications: 10,
            syncRetryDelay: 5000,
            cacheExpiry: 24 * 60 * 60 * 1000, // 24 hours
            enableBackgroundSync: true,
            enableNotifications: true,
            enableInstallPrompt: true
        };
        
        // Performance metrics
        this.metrics = {
            cacheHits: 0,
            cacheMisses: 0,
            offlineRequests: 0,
            backgroundSyncs: 0,
            notificationsSent: 0,
            installPrompts: 0,
            startTime: Date.now()
        };
        
        this.init();
    }
    
    /**
     * Initialize PWA manager with terminal interface
     */
    async init() {
        console.log('🔧 Initializing Terminal PWA Manager v2.024...');
        
        try {
            // Register service worker
            await this.registerServiceWorker();
            
            // Setup network monitoring
            this.setupNetworkMonitoring();
            
            // Setup install prompt handling
            this.setupInstallPrompt();
            
            // Setup notifications
            await this.setupNotifications();
            
            // Setup background sync
            this.setupBackgroundSync();
            
            // Setup app shortcuts
            this.setupAppShortcuts();
            
            // Setup file handling
            this.setupFileHandling();
            
            // Setup share target
            this.setupShareTarget();
            
            // Add terminal interface
            this.addTerminalInterface();
            
            console.log('✅ Terminal PWA Manager initialized successfully');
            
        } catch (error) {
            console.error('❌ PWA initialization error:', error);
            this.showTerminalError('PWA_INIT_FAILED', error.message);
        }
    }
    
    /**
     * Register and manage service worker
     */
    async registerServiceWorker() {
        if (!('serviceWorker' in navigator)) {
            throw new Error('Service Worker not supported');
        }
        
        try {
            const registration = await navigator.serviceWorker.register('/static/sw.js', {
                scope: '/',
                updateViaCache: 'none'
            });
            
            console.log('🔧 Service Worker registered:', registration.scope);
            
            // Listen for updates
            registration.addEventListener('updatefound', () => {
                this.handleServiceWorkerUpdate(registration);
            });
            
            // Check for existing updates
            if (registration.waiting) {
                this.showUpdateAvailable();
            }
            
            return registration;
            
        } catch (error) {
            console.error('❌ Service Worker registration failed:', error);
            throw error;
        }
    }
    
    /**
     * Handle service worker updates
     */
    handleServiceWorkerUpdate(registration) {
        const newWorker = registration.installing;
        
        newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                this.updateAvailable = true;
                this.showUpdateAvailable();
            }
        });
    }
    
    /**
     * Show update available notification in terminal style
     */
    showUpdateAvailable() {
        const updateBanner = document.createElement('div');
        updateBanner.className = 'terminal-update-banner';
        updateBanner.innerHTML = `
            <div class="update-content">
                <span class="update-icon">🔄</span>
                <span class="update-text">SYSTEM_UPDATE_AVAILABLE - New version ready</span>
                <button class="update-btn" onclick="terminalPWA.applyUpdate()">UPDATE_NOW</button>
                <button class="dismiss-btn" onclick="this.parentElement.parentElement.remove()">DISMISS</button>
            </div>
        `;
        
        updateBanner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: var(--terminal-green);
            color: var(--bg-black);
            padding: 1rem;
            font-family: var(--font-mono);
            font-weight: bold;
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            border-bottom: 2px solid var(--bg-black);
        `;
        
        document.body.appendChild(updateBanner);
        
        // Auto-dismiss after 10 seconds
        setTimeout(() => {
            if (updateBanner.parentElement) {
                updateBanner.remove();
            }
        }, 10000);
    }
    
    /**
     * Apply service worker update
     */
    async applyUpdate() {
        try {
            const registration = await navigator.serviceWorker.getRegistration();
            if (registration && registration.waiting) {
                registration.waiting.postMessage({ action: 'SKIP_WAITING' });
                
                // Reload page after update
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    window.location.reload();
                });
            }
        } catch (error) {
            console.error('❌ Update application error:', error);
        }
    }
    
    /**
     * Setup network monitoring
     */
    setupNetworkMonitoring() {
        // Monitor online/offline status
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.showNetworkStatus('ONLINE');
            this.processOfflineQueue();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showNetworkStatus('OFFLINE');
        });
        
        // Monitor connection quality
        if ('connection' in navigator) {
            const connection = navigator.connection;
            
            connection.addEventListener('change', () => {
                this.updateConnectionInfo(connection);
            });
            
            this.updateConnectionInfo(connection);
        }
    }
    
    /**
     * Show network status in terminal style
     */
    showNetworkStatus(status) {
        const timestamp = new Date().toLocaleTimeString();
        const statusClass = status === 'ONLINE' ? 'status-online' : 'status-offline';
        const icon = status === 'ONLINE' ? '🟢' : '🔴';
        
        console.log(`[${timestamp}] NETWORK_STATUS: ${status}`);
        
        // Update UI if terminal interface exists
        const statusElement = document.querySelector('.network-status');
        if (statusElement) {
            statusElement.innerHTML = `${icon} NETWORK: ${status}`;
            statusElement.className = `network-status ${statusClass}`;
        }
        
        // Show toast notification
        this.showToast(`Network ${status}`, `Connection status changed to ${status.toLowerCase()}`, status === 'ONLINE' ? 'success' : 'warning');
    }
    
    /**
     * Update connection information
     */
    updateConnectionInfo(connection) {
        const info = {
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt,
            saveData: connection.saveData
        };
        
        console.log('📶 Connection info:', info);
        
        // Adjust caching strategy based on connection
        if (connection.saveData || connection.effectiveType === 'slow-2g') {
            this.enableDataSavingMode();
        }
    }
    
    /**
     * Setup install prompt handling
     */
    setupInstallPrompt() {
        window.addEventListener('beforeinstallprompt', (event) => {
            event.preventDefault();
            this.installPrompt = event;
            this.showInstallBanner();
            this.metrics.installPrompts++;
        });
        
        // Listen for app installed
        window.addEventListener('appinstalled', () => {
            console.log('📱 Terminal PWA installed successfully');
            this.hideInstallBanner();
            this.showToast('App Installed', 'Terminal app added to home screen', 'success');
        });
    }
    
    /**
     * Show install banner
     */
    showInstallBanner() {
        if (!this.config.enableInstallPrompt) return;
        
        const installBanner = document.createElement('div');
        installBanner.id = 'install-banner';
        installBanner.className = 'terminal-install-banner';
        installBanner.innerHTML = `
            <div class="install-content">
                <span class="install-icon">📱</span>
                <div class="install-text">
                    <div class="install-title">INSTALL_TERMINAL_APP</div>
                    <div class="install-desc">Add to home screen for faster access</div>
                </div>
                <button class="install-btn" onclick="terminalPWA.promptInstall()">INSTALL</button>
                <button class="close-btn" onclick="terminalPWA.hideInstallBanner()">×</button>
            </div>
        `;
        
        installBanner.style.cssText = `
            position: fixed;
            bottom: 1rem;
            left: 1rem;
            right: 1rem;
            background: rgba(0, 255, 0, 0.1);
            border: 2px solid var(--terminal-green);
            color: var(--terminal-green);
            padding: 1rem;
            font-family: var(--font-mono);
            z-index: 9999;
            border-radius: 4px;
            backdrop-filter: blur(10px);
            box-shadow: 0 4px 12px rgba(0, 255, 0, 0.2);
        `;
        
        document.body.appendChild(installBanner);
    }
    
    /**
     * Prompt app installation
     */
    async promptInstall() {
        if (!this.installPrompt) return;
        
        try {
            const result = await this.installPrompt.prompt();
            console.log('📱 Install prompt result:', result.outcome);
            
            if (result.outcome === 'accepted') {
                this.hideInstallBanner();
            }
            
            this.installPrompt = null;
            
        } catch (error) {
            console.error('❌ Install prompt error:', error);
        }
    }
    
    /**
     * Hide install banner
     */
    hideInstallBanner() {
        const banner = document.getElementById('install-banner');
        if (banner) {
            banner.remove();
        }
    }
    
    /**
     * Setup notifications
     */
    async setupNotifications() {
        if (!this.config.enableNotifications || !('Notification' in window)) {
            return;
        }
        
        try {
            const permission = await Notification.requestPermission();
            console.log('🔔 Notification permission:', permission);
            
            if (permission === 'granted') {
                this.setupPushNotifications();
            }
            
        } catch (error) {
            console.error('❌ Notification setup error:', error);
        }
    }
    
    /**
     * Setup push notifications
     */
    async setupPushNotifications() {
        try {
            const registration = await navigator.serviceWorker.getRegistration();
            if (!registration) return;
            
            // Check for existing subscription
            let subscription = await registration.pushManager.getSubscription();
            
            if (!subscription) {
                // Create new subscription
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: this.urlBase64ToUint8Array(
                        'BEl62iUYgUivxIkv69yViEuiBIa40HI80NM1LfHezDy8Cq7HRZCrKaNEDwXIKaHhDNFMvWR6VKrHmJfPTr9gzpo'
                    )
                });
                
                console.log('🔔 Push subscription created:', subscription);
            }
            
            return subscription;
            
        } catch (error) {
            console.error('❌ Push notification setup error:', error);
        }
    }
    
    /**
     * Show local notification
     */
    showNotification(title, options = {}) {
        if (!('Notification' in window) || Notification.permission !== 'granted') {
            return;
        }
        
        const defaultOptions = {
            icon: '/static/icons/icon-192x192.png',
            badge: '/static/icons/badge-72x72.png',
            tag: 'terminal-notification',
            requireInteraction: false,
            silent: false,
            data: {
                timestamp: Date.now(),
                source: 'terminal-pwa'
            }
        };
        
        const finalOptions = { ...defaultOptions, ...options };
        
        try {
            const notification = new Notification(title, finalOptions);
            
            notification.onclick = () => {
                window.focus();
                notification.close();
            };
            
            this.notifications.push(notification);
            this.metrics.notificationsSent++;
            
            // Auto-dismiss after 5 seconds
            setTimeout(() => {
                notification.close();
            }, 5000);
            
            return notification;
            
        } catch (error) {
            console.error('❌ Notification display error:', error);
        }
    }
    
    /**
     * Setup background sync
     */
    setupBackgroundSync() {
        if (!this.config.enableBackgroundSync || !('serviceWorker' in navigator)) {
            return;
        }
        
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'BACKGROUND_SYNC') {
                this.handleBackgroundSync(event.data);
            }
        });
        
        // Register sync events
        navigator.serviceWorker.ready.then((registration) => {
            if ('sync' in registration) {
                console.log('🔄 Background sync supported');
                this.backgroundSync = registration.sync;
            }
        });
    }
    
    /**
     * Queue request for background sync
     */
    async queueBackgroundSync(url, options = {}) {
        if (!this.isOnline) {
            this.offlineQueue.push({ url, options, timestamp: Date.now() });
            
            if (this.backgroundSync) {
                try {
                    await this.backgroundSync.register('terminal-sync');
                    console.log('🔄 Background sync queued:', url);
                    this.metrics.backgroundSyncs++;
                } catch (error) {
                    console.error('❌ Background sync registration error:', error);
                }
            }
        }
    }
    
    /**
     * Process offline queue
     */
    async processOfflineQueue() {
        if (this.offlineQueue.length === 0) return;
        
        console.log(`🔄 Processing ${this.offlineQueue.length} offline requests`);
        
        const queue = [...this.offlineQueue];
        this.offlineQueue = [];
        
        for (const item of queue) {
            try {
                await fetch(item.url, item.options);
                console.log('✅ Offline request processed:', item.url);
            } catch (error) {
                console.error('❌ Offline request failed:', item.url, error);
                this.offlineQueue.push(item); // Re-queue on failure
            }
        }
    }
    
    /**
     * Setup app shortcuts
     */
    setupAppShortcuts() {
        // Add keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            // Ctrl/Cmd + K for command palette
            if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                event.preventDefault();
                this.openCommandPalette();
            }
            
            // Ctrl/Cmd + / for help
            if ((event.ctrlKey || event.metaKey) && event.key === '/') {
                event.preventDefault();
                this.showHelp();
            }
            
            // Ctrl/Cmd + R for refresh (override default)
            if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
                event.preventDefault();
                this.hardRefresh();
            }
        });
    }
    
    /**
     * Setup file handling
     */
    setupFileHandling() {
        if ('launchQueue' in window) {
            window.launchQueue.setConsumer((launchParams) => {
                if (launchParams.files && launchParams.files.length) {
                    this.handleFileOpen(launchParams.files);
                }
            });
        }
        
        // Handle drag and drop
        document.addEventListener('dragover', (event) => {
            event.preventDefault();
        });
        
        document.addEventListener('drop', (event) => {
            event.preventDefault();
            if (event.dataTransfer.files.length) {
                this.handleFileOpen(Array.from(event.dataTransfer.files));
            }
        });
    }
    
    /**
     * Setup share target
     */
    setupShareTarget() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'SHARE_TARGET') {
                    this.handleSharedContent(event.data.data);
                }
            });
        }
    }
    
    /**
     * Add terminal interface elements
     */
    addTerminalInterface() {
        // Add PWA status indicator
        this.addStatusIndicator();
        
        // Add terminal commands for PWA
        this.addTerminalCommands();
        
        // Add context menu items
        this.addContextMenu();
    }
    
    /**
     * Add PWA status indicator
     */
    addStatusIndicator() {
        const statusBar = document.querySelector('.bottom-bar .system-info');
        if (statusBar) {
            const pwaStatus = document.createElement('span');
            pwaStatus.className = 'pwa-status';
            pwaStatus.innerHTML = '📱 PWA';
            pwaStatus.title = 'Progressive Web App Active';
            
            statusBar.appendChild(document.createTextNode(' | '));
            statusBar.appendChild(pwaStatus);
        }
    }
    
    /**
     * Add terminal commands for PWA management
     */
    addTerminalCommands() {
        // Extend terminal processor if available
        if (window.terminalProcessor) {
            const originalExecute = window.terminalProcessor.execute;
            
            window.terminalProcessor.execute = (command) => {
                const parts = command.trim().toLowerCase().split(' ');
                const baseCommand = parts[0];
                
                switch (baseCommand) {
                    case 'pwa':
                        return this.handlePWACommand(parts.slice(1));
                    case 'install':
                        return this.handleInstallCommand();
                    case 'offline':
                        return this.handleOfflineCommand(parts.slice(1));
                    case 'sync':
                        return this.handleSyncCommand(parts.slice(1));
                    case 'cache':
                        return this.handleCacheCommand(parts.slice(1));
                    default:
                        return originalExecute.call(window.terminalProcessor, command);
                }
            };
        }
    }
    
    /**
     * Handle PWA terminal commands
     */
    handlePWACommand(args) {
        const subCommand = args[0] || 'status';
        
        switch (subCommand) {
            case 'status':
                return {
                    status: 'success',
                    message: this.getPWAStatus()
                };
            case 'metrics':
                return {
                    status: 'success',
                    message: this.getPWAMetrics()
                };
            case 'update':
                this.applyUpdate();
                return {
                    status: 'success',
                    message: 'Checking for updates...'
                };
            default:
                return {
                    status: 'error',
                    message: 'PWA commands: status, metrics, update'
                };
        }
    }
    
    /**
     * Get PWA status for terminal
     */
    getPWAStatus() {
        const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
        const timestamp = new Date().toLocaleString();
        
        return `PWA STATUS REPORT - ${timestamp}
├─ Installation: ${isInstalled ? 'INSTALLED' : 'BROWSER_MODE'}
├─ Service Worker: ${navigator.serviceWorker.controller ? 'ACTIVE' : 'INACTIVE'}
├─ Network: ${this.isOnline ? 'ONLINE' : 'OFFLINE'}
├─ Notifications: ${Notification.permission}
├─ Background Sync: ${this.backgroundSync ? 'SUPPORTED' : 'UNSUPPORTED'}
├─ Update Available: ${this.updateAvailable ? 'YES' : 'NO'}
└─ Cache Status: ${this.isOnline ? 'SYNCHRONIZED' : 'OFFLINE_MODE'}`;
    }
    
    /**
     * Get PWA metrics for terminal
     */
    getPWAMetrics() {
        const uptime = Date.now() - this.metrics.startTime;
        const hours = Math.floor(uptime / 3600000);
        const minutes = Math.floor((uptime % 3600000) / 60000);
        
        return `PWA PERFORMANCE METRICS:
├─ Uptime: ${hours}h ${minutes}m
├─ Cache Hits: ${this.metrics.cacheHits}
├─ Cache Misses: ${this.metrics.cacheMisses}
├─ Offline Requests: ${this.metrics.offlineRequests}
├─ Background Syncs: ${this.metrics.backgroundSyncs}
├─ Notifications: ${this.metrics.notificationsSent}
├─ Install Prompts: ${this.metrics.installPrompts}
└─ Hit Rate: ${this.getCacheHitRate()}%`;
    }
    
    /**
     * Calculate cache hit rate
     */
    getCacheHitRate() {
        const total = this.metrics.cacheHits + this.metrics.cacheMisses;
        return total > 0 ? Math.round((this.metrics.cacheHits / total) * 100) : 0;
    }
    
    /**
     * Add context menu for PWA features
     */
    addContextMenu() {
        document.addEventListener('contextmenu', (event) => {
            if (event.target.closest('.terminal-interface')) {
                event.preventDefault();
                this.showPWAContextMenu(event.clientX, event.clientY);
            }
        });
    }
    
    /**
     * Show PWA context menu
     */
    showPWAContextMenu(x, y) {
        const existingMenu = document.querySelector('.pwa-context-menu');
        if (existingMenu) existingMenu.remove();
        
        const menu = document.createElement('div');
        menu.className = 'pwa-context-menu';
        menu.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            background: var(--bg-black);
            border: 2px solid var(--terminal-green);
            color: var(--terminal-green);
            font-family: var(--font-mono);
            font-size: 0.9rem;
            z-index: 10000;
            min-width: 200px;
        `;
        
        const menuItems = [
            { label: '📱 Install App', action: () => this.promptInstall() },
            { label: '🔄 Check Updates', action: () => this.checkForUpdates() },
            { label: '💾 Clear Cache', action: () => this.clearCache() },
            { label: '🔔 Test Notification', action: () => this.testNotification() },
            { label: '📊 PWA Status', action: () => this.showPWADialog() }
        ];
        
        menuItems.forEach(item => {
            const menuItem = document.createElement('div');
            menuItem.style.cssText = `
                padding: 0.5rem 1rem;
                cursor: pointer;
                border-bottom: 1px solid var(--terminal-green);
            `;
            menuItem.textContent = item.label;
            menuItem.addEventListener('click', () => {
                item.action();
                menu.remove();
            });
            
            menuItem.addEventListener('mouseenter', () => {
                menuItem.style.background = 'var(--terminal-green)';
                menuItem.style.color = 'var(--bg-black)';
            });
            
            menuItem.addEventListener('mouseleave', () => {
                menuItem.style.background = 'transparent';
                menuItem.style.color = 'var(--terminal-green)';
            });
            
            menu.appendChild(menuItem);
        });
        
        document.body.appendChild(menu);
        
        // Remove menu on click outside
        setTimeout(() => {
            document.addEventListener('click', () => menu.remove(), { once: true });
        }, 100);
    }
    
    /**
     * Utility functions
     */
    
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');
        
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
    
    showToast(title, message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `terminal-toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
        `;
        
        toast.style.cssText = `
            position: fixed;
            top: 1rem;
            right: 1rem;
            background: var(--bg-black);
            border: 2px solid var(--terminal-green);
            color: var(--terminal-green);
            padding: 1rem;
            font-family: var(--font-mono);
            font-size: 0.9rem;
            z-index: 10000;
            max-width: 300px;
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease-in forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    
    showTerminalError(code, message) {
        console.error(`[${code}] ${message}`);
        this.showToast('PWA Error', `${code}: ${message}`, 'error');
    }
    
    // Additional utility methods for terminal integration
    checkForUpdates() {
        console.log('🔄 Checking for updates...');
        // Implementation for manual update check
    }
    
    clearCache() {
        if ('caches' in window) {
            caches.delete(this.config.cacheName).then(() => {
                this.showToast('Cache Cleared', 'Application cache cleared successfully', 'success');
            });
        }
    }
    
    testNotification() {
        this.showNotification('Terminal Test', {
            body: 'PWA notification system is working correctly',
            icon: '/static/icons/icon-192x192.png'
        });
    }
    
    showPWADialog() {
        // Implementation for PWA status dialog
        alert(this.getPWAStatus());
    }
}

// ===============================
// ENHANCED SERVICE WORKER COMMUNICATION
// ===============================

class ServiceWorkerManager {
    constructor() {
        this.registration = null;
        this.messageQueue = [];
        this.init();
    }
    
    async init() {
        if ('serviceWorker' in navigator) {
            try {
                this.registration = await navigator.serviceWorker.ready;
                this.setupMessageHandling();
            } catch (error) {
                console.error('ServiceWorker initialization error:', error);
            }
        }
    }
    
    setupMessageHandling() {
        navigator.serviceWorker.addEventListener('message', (event) => {
            this.handleMessage(event.data);
        });
    }
    
    handleMessage(data) {
        switch (data.type) {
            case 'CACHE_UPDATED':
                console.log('📦 Cache updated:', data.cacheName);
                break;
            case 'OFFLINE_FALLBACK':
                console.log('📴 Serving offline fallback for:', data.url);
                break;
            case 'BACKGROUND_SYNC':
                console.log('🔄 Background sync completed:', data.tag);
                break;
        }
    }
    
    async sendMessage(message) {
        if (this.registration && this.registration.active) {
            this.registration.active.postMessage(message);
        } else {
            this.messageQueue.push(message);
        }
    }
}

// ===============================
// INITIALIZATION
// ===============================

// Global PWA manager instance
let terminalPWA = null;
let serviceWorkerManager = null;

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePWA);
} else {
    initializePWA();
}

function initializePWA() {
    try {
        terminalPWA = new TerminalPWAManager();
        serviceWorkerManager = new ServiceWorkerManager();
        
        // Make globally available
        window.terminalPWA = terminalPWA;
        window.serviceWorkerManager = serviceWorkerManager;
        
        console.log('🚀 Terminal PWA system initialized');
        
    } catch (error) {
        console.error('❌ PWA initialization failed:', error);
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TerminalPWAManager, ServiceWorkerManager };
}
