// ===================================================================
// E-con News Terminal - Retro Brutalism Service Worker v2.024
// Terminal-optimized caching & offline strategy for neo-brutalism
// Performance-first approach with ASCII aesthetics
// ===================================================================

'use strict';

// ===============================
// CACHE CONFIGURATION - TERMINAL STYLE
// ===============================

const CACHE_VERSION = '2.024.1';
const CACHE_PREFIX = 'econ-terminal';
const STATIC_CACHE = `${CACHE_PREFIX}-static-v${CACHE_VERSION}`;
const RUNTIME_CACHE = `${CACHE_PREFIX}-runtime-v${CACHE_VERSION}`;
const NEWS_CACHE = `${CACHE_PREFIX}-news-v${CACHE_VERSION}`;
const FONTS_CACHE = `${CACHE_PREFIX}-fonts-v${CACHE_VERSION}`;
const AI_CACHE = `${CACHE_PREFIX}-ai-v${CACHE_VERSION}`;

// Enhanced cache configuration for brutalism theme
const CACHE_CONFIG = {
    // Static assets - Terminal essentials
    maxStaticEntries: 30,
    maxRuntimeEntries: 20,
    maxNewsEntries: 15,
    maxFontEntries: 10,
    maxAIEntries: 8,
    
    // TTL configuration
    staticTTL: 7 * 24 * 60 * 60 * 1000,      // 7 days
    newsTTL: 4 * 60 * 60 * 1000,             // 4 hours  
    aiTTL: 2 * 60 * 60 * 1000,               // 2 hours
    runtimeTTL: 24 * 60 * 60 * 1000,         // 24 hours
    
    // Network timeouts
    networkTimeout: 8000,                     // 8 seconds
    offlineTimeout: 3000,                     // 3 seconds
    
    // Performance settings
    enablePreloading: true,
    enableBackgroundSync: true,
    enablePushNotifications: false            // Optional for news alerts
};

// ===============================
// STATIC RESOURCES - TERMINAL ESSENTIALS
// ===============================

const STATIC_RESOURCES = [
    // Core application files
    '/',
    '/static/style.css',
    '/static/script.js',
    '/static/manifest.json',
    
    // Terminal fonts - Critical for brutalism aesthetic
    'https://fonts.googleapis.com/css2?family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&family=Share+Tech+Mono&display=swap',
    'https://fonts.gstatic.com/s/jetbrainsmono/v18/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxjPVmUsaaDhw.woff2',
    'https://fonts.gstatic.com/s/sharetechmono/v15/J7aHnp1uDWRBEqV98dVQztYldFcLowEFA87Heg.woff2',
    
    // Fallback pages
    '/offline',
    '/error'
];

// ===============================
// TERMINAL ASCII ART & LOGGING
// ===============================

const ASCII_TERMINAL_BOOT = `
╔══════════════════════════════════════════════════════════════╗
║           SERVICE WORKER TERMINAL v2.024 - BOOTING          ║
║                    RETRO BRUTALISM MODE                     ║
╚══════════════════════════════════════════════════════════════╝`;

const ASCII_CACHE_SUCCESS = `
[✓] CACHE_OPERATION_SUCCESS`;

const ASCII_CACHE_ERROR = `
[✗] CACHE_OPERATION_FAILED`;

const ASCII_NETWORK_OFFLINE = `
[!] NETWORK_CONNECTION_LOST - ENTERING_OFFLINE_MODE`;

// Enhanced console logging with terminal aesthetics
function terminalLog(message, type = 'INFO', ascii = '') {
    const timestamp = new Date().toISOString().replace('T', '_').replace(/\..+/, '');
    const prefix = `[${timestamp}] [SW_TERMINAL] [${type}]`;
    
    if (ascii) {
        console.log(ascii);
    }
    console.log(`${prefix} ${message}`);
}

// ===============================
// INSTALL EVENT - TERMINAL INITIALIZATION
// ===============================

self.addEventListener('install', (event) => {
    terminalLog('Installing Service Worker...', 'BOOT', ASCII_TERMINAL_BOOT);
    
    event.waitUntil(
        Promise.all([
            // Cache critical terminal resources
            caches.open(STATIC_CACHE).then((cache) => {
                terminalLog('Caching terminal essentials...', 'CACHE');
                return cache.addAll(STATIC_RESOURCES.slice(0, 4)); // Core files first
            }),
            
            // Pre-cache terminal fonts separately
            caches.open(FONTS_CACHE).then((cache) => {
                terminalLog('Pre-caching terminal fonts...', 'CACHE');
                return cache.addAll(STATIC_RESOURCES.slice(4)); // Font files
            }).catch(error => {
                terminalLog(`Font pre-caching failed: ${error.message}`, 'ERROR');
            }),
            
            // Skip waiting for immediate activation
            self.skipWaiting()
        ]).then(() => {
            terminalLog('Terminal installation complete', 'SUCCESS', ASCII_CACHE_SUCCESS);
        }).catch(error => {
            terminalLog(`Installation failed: ${error.message}`, 'ERROR', ASCII_CACHE_ERROR);
        })
    );
});

// ===============================
// ACTIVATE EVENT - TERMINAL CONTROL
// ===============================

self.addEventListener('activate', (event) => {
    terminalLog('Activating Terminal Service Worker...', 'BOOT');
    
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            cleanupOldCaches(),
            
            // Claim all clients immediately
            self.clients.claim(),
            
            // Initialize performance monitoring
            initializeTerminalMonitoring()
        ]).then(() => {
            terminalLog('Terminal activation complete - System online', 'SUCCESS');
        })
    );
});

// ===============================
// FETCH EVENT - ENHANCED ROUTING FOR BRUTALISM
// ===============================

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip chrome-extension and non-http requests
    if (!url.protocol.startsWith('http')) {
        return;
    }
    
    // Enhanced request routing for terminal interface
    if (isTerminalStatic(url)) {
        event.respondWith(handleTerminalStatic(request));
    } else if (isNewsAPI(url)) {
        event.respondWith(handleNewsAPI(request));
    } else if (isAIAPI(url)) {
        event.respondWith(handleAIAPI(request));
    } else if (isTerminalAPI(url)) {
        event.respondWith(handleTerminalAPI(request));
    } else if (isTerminalFont(url)) {
        event.respondWith(handleTerminalFont(request));
    } else if (isNavigationRequest(request)) {
        event.respondWith(handleTerminalNavigation(request));
    } else {
        // Generic terminal-optimized handling
        event.respondWith(handleGenericTerminal(request));
    }
});

// ===============================
// RESOURCE TYPE DETECTION - TERMINAL SPECIFIC
// ===============================

function isTerminalStatic(url) {
    const staticExtensions = ['.css', '.js', '.json', '.ico', '.svg'];
    const pathname = url.pathname.toLowerCase();
    
    return staticExtensions.some(ext => pathname.endsWith(ext)) ||
           pathname.startsWith('/static/') ||
           pathname === '/' ||
           pathname.includes('terminal') ||
           pathname.includes('brutalism');
}

function isNewsAPI(url) {
    return url.pathname.startsWith('/api/news/') || 
           url.pathname.startsWith('/api/article/');
}

function isAIAPI(url) {
    return url.pathname.startsWith('/api/ai/');
}

function isTerminalAPI(url) {
    return url.pathname.startsWith('/api/terminal/') ||
           url.pathname.startsWith('/api/system/');
}

function isTerminalFont(url) {
    const fontExtensions = ['.woff', '.woff2', '.ttf', '.otf'];
    const pathname = url.pathname.toLowerCase();
    
    return fontExtensions.some(ext => pathname.endsWith(ext)) ||
           url.hostname === 'fonts.googleapis.com' ||
           url.hostname === 'fonts.gstatic.com' ||
           pathname.includes('jetbrains') ||
           pathname.includes('mono');
}

function isNavigationRequest(request) {
    return request.mode === 'navigate';
}

// ===============================
// TERMINAL STATIC HANDLER - CACHE FIRST
// ===============================

async function handleTerminalStatic(request) {
    terminalLog(`Handling terminal static: ${request.url}`, 'FETCH');
    
    try {
        const cache = await caches.open(STATIC_CACHE);
        const cached = await cache.match(request);
        
        if (cached) {
            terminalLog(`Serving from terminal cache: ${request.url}`, 'CACHE');
            
            // Stale-while-revalidate for CSS/JS
            if (request.url.includes('.css') || request.url.includes('.js')) {
                updateTerminalResourceInBackground(request, cache);
            }
            
            return cached;
        }
        
        terminalLog(`Fetching from network: ${request.url}`, 'NETWORK');
        const networkResponse = await fetchWithTerminalTimeout(request, 6000);
        
        if (networkResponse && networkResponse.ok) {
            // Clone and cache for terminal
            cache.put(request, networkResponse.clone());
            await limitCacheSize(cache, CACHE_CONFIG.maxStaticEntries);
        }
        
        return networkResponse || createTerminalOfflineResponse(request);
        
    } catch (error) {
        terminalLog(`Terminal static failed: ${error.message}`, 'ERROR');
        return createTerminalOfflineResponse(request);
    }
}

// ===============================
// NEWS API HANDLER - NETWORK FIRST WITH TERMINAL CACHING
// ===============================

async function handleNewsAPI(request) {
    terminalLog(`Handling news API: ${request.url}`, 'FETCH');
    
    try {
        // Enhanced network-first strategy
        const networkResponse = await fetchWithTerminalTimeout(request, CACHE_CONFIG.networkTimeout);
        
        if (networkResponse && networkResponse.ok) {
            terminalLog(`News API success: ${request.url}`, 'SUCCESS');
            
            // Cache with terminal metadata
            const cache = await caches.open(NEWS_CACHE);
            
            // Add terminal timestamp headers
            const responseWithTerminalData = new Response(networkResponse.body, {
                status: networkResponse.status,
                statusText: networkResponse.statusText,
                headers: {
                    ...Object.fromEntries(networkResponse.headers.entries()),
                    'sw-terminal-cached-at': Date.now().toString(),
                    'sw-terminal-version': CACHE_VERSION
                }
            });
            
            cache.put(request, responseWithTerminalData);
            await limitCacheSize(cache, CACHE_CONFIG.maxNewsEntries);
            
            return networkResponse;
        }
        
    } catch (error) {
        terminalLog(`Network failed, checking terminal cache: ${error.message}`, 'WARN');
    }
    
    // Fallback to terminal cache with freshness check
    const cache = await caches.open(NEWS_CACHE);
    const cached = await cache.match(request);
    
    if (cached) {
        const cachedAt = cached.headers.get('sw-terminal-cached-at');
        const age = cachedAt ? Date.now() - parseInt(cachedAt) : Infinity;
        
        if (age < CACHE_CONFIG.newsTTL) {
            terminalLog(`Serving fresh terminal cached news: ${request.url}`, 'CACHE');
            return cached;
        } else {
            terminalLog(`Terminal cached news is stale, removing: ${request.url}`, 'CACHE');
            cache.delete(request);
        }
    }
    
    // Final fallback - terminal offline response
    return createTerminalOfflineNewsResponse();
}

// ===============================
// AI API HANDLER - CACHE WITH INTELLIGENCE
// ===============================

async function handleAIAPI(request) {
    terminalLog(`Handling AI API: ${request.url}`, 'AI');
    
    try {
        const networkResponse = await fetchWithTerminalTimeout(request, 15000); // Longer timeout for AI
        
        if (networkResponse && networkResponse.ok) {
            // Cache AI responses with terminal formatting
            if (request.method === 'POST') {
                // Don't cache POST requests, but log for analytics
                terminalLog(`AI POST request completed: ${request.url}`, 'AI');
                return networkResponse;
            }
            
            const cache = await caches.open(AI_CACHE);
            cache.put(request, networkResponse.clone());
            await limitCacheSize(cache, CACHE_CONFIG.maxAIEntries);
            
            return networkResponse;
        }
        
    } catch (error) {
        terminalLog(`AI API error: ${error.message}`, 'ERROR');
    }
    
    // AI fallback with terminal aesthetics
    return createTerminalAIOfflineResponse();
}

// ===============================
// TERMINAL API HANDLER - COMMAND INTERFACE
// ===============================

async function handleTerminalAPI(request) {
    terminalLog(`Handling terminal API: ${request.url}`, 'TERMINAL');
    
    try {
        const networkResponse = await fetchWithTerminalTimeout(request, 5000);
        
        if (networkResponse && networkResponse.ok) {
            // Log terminal commands for analytics
            if (request.url.includes('/api/terminal/command')) {
                terminalLog(`Terminal command executed via API`, 'TERMINAL');
            }
            return networkResponse;
        }
        
    } catch (error) {
        terminalLog(`Terminal API error: ${error.message}`, 'ERROR');
    }
    
    // Terminal API offline fallback
    return createTerminalCommandOfflineResponse();
}

// ===============================
// FONT HANDLER - TERMINAL TYPOGRAPHY CACHE
// ===============================

async function handleTerminalFont(request) {
    terminalLog(`Handling terminal font: ${request.url}`, 'FONT');
    
    try {
        const cache = await caches.open(FONTS_CACHE);
        const cached = await cache.match(request);
        
        if (cached) {
            terminalLog(`Serving cached terminal font: ${request.url}`, 'CACHE');
            return cached;
        }
        
        const networkResponse = await fetchWithTerminalTimeout(request, 20000); // Long timeout for fonts
        
        if (networkResponse && networkResponse.ok) {
            // Terminal fonts are cached for extended periods
            cache.put(request, networkResponse.clone());
            await limitCacheSize(cache, CACHE_CONFIG.maxFontEntries);
        }
        
        return networkResponse;
        
    } catch (error) {
        terminalLog(`Terminal font loading failed: ${error.message}`, 'ERROR');
        // Don't provide fallback for fonts - let browser handle it
        throw error;
    }
}

// ===============================
// NAVIGATION HANDLER - TERMINAL INTERFACE
// ===============================

async function handleTerminalNavigation(request) {
    terminalLog(`Handling terminal navigation: ${request.url}`, 'NAV');
    
    try {
        const networkResponse = await fetchWithTerminalTimeout(request, 10000);
        if (networkResponse && networkResponse.ok) {
            return networkResponse;
        }
    } catch (error) {
        terminalLog(`Navigation network failed: ${error.message}`, 'ERROR');
    }
    
    // Fallback to cached index with terminal interface
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match('/');
    
    if (cached) {
        terminalLog('Serving cached terminal index for navigation', 'CACHE');
        return cached;
    }
    
    // Ultimate fallback - terminal offline page
    return createTerminalOfflinePage();
}

// ===============================
// GENERIC HANDLER - TERMINAL OPTIMIZED
// ===============================

async function handleGenericTerminal(request) {
    try {
        const networkResponse = await fetchWithTerminalTimeout(request, 8000);
        
        if (networkResponse && networkResponse.ok) {
            // Light caching for other resources
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(request, networkResponse.clone());
            await limitCacheSize(cache, CACHE_CONFIG.maxRuntimeEntries);
        }
        
        return networkResponse;
        
    } catch (error) {
        // Try cache fallback
        const cache = await caches.open(RUNTIME_CACHE);
        const cached = await cache.match(request);
        
        if (cached) {
            terminalLog(`Serving cached generic resource: ${request.url}`, 'CACHE');
            return cached;
        }
        
        throw error;
    }
}

// ===============================
// UTILITY FUNCTIONS - TERMINAL ENHANCED
// ===============================

async function fetchWithTerminalTimeout(request, timeout = 8000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(request, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        throw error;
    }
}

async function updateTerminalResourceInBackground(request, cache) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            cache.put(request, response);
            terminalLog(`Updated terminal resource in background: ${request.url}`, 'CACHE');
        }
    } catch (error) {
        terminalLog(`Background terminal update failed: ${error.message}`, 'WARN');
    }
}

async function limitCacheSize(cache, maxEntries) {
    try {
        const keys = await cache.keys();
        if (keys.length > maxEntries) {
            const keysToDelete = keys.slice(0, keys.length - maxEntries);
            await Promise.all(keysToDelete.map(key => cache.delete(key)));
            terminalLog(`Terminal cache cleanup: removed ${keysToDelete.length} entries`, 'CACHE');
        }
    } catch (error) {
        terminalLog(`Terminal cache cleanup error: ${error.message}`, 'ERROR');
    }
}

async function cleanupOldCaches() {
    try {
        const cacheNames = await caches.keys();
        const currentCaches = [STATIC_CACHE, RUNTIME_CACHE, NEWS_CACHE, FONTS_CACHE, AI_CACHE];
        
        const deletePromises = cacheNames
            .filter(cacheName => !currentCaches.includes(cacheName) && cacheName.startsWith(CACHE_PREFIX))
            .map(cacheName => {
                terminalLog(`Deleting old terminal cache: ${cacheName}`, 'CACHE');
                return caches.delete(cacheName);
            });
        
        return Promise.all(deletePromises);
    } catch (error) {
        terminalLog(`Terminal cache cleanup error: ${error.message}`, 'ERROR');
    }
}

// ===============================
// OFFLINE RESPONSES - TERMINAL AESTHETICS
// ===============================

function createTerminalOfflineResponse(request) {
    const terminalStyle = `
        body {
            font-family: 'JetBrains Mono', 'Share Tech Mono', 'Courier New', monospace;
            background: #000000;
            color: #00ff00;
            margin: 0;
            padding: 2rem;
            line-height: 1.4;
        }
        .terminal-container {
            border: 2px solid #00ff00;
            padding: 2rem;
            max-width: 800px;
            margin: 0 auto;
        }
        .ascii-header {
            font-size: 12px;
            line-height: 1;
            margin-bottom: 2rem;
            text-align: center;
        }
        .terminal-text {
            font-size: 14px;
            margin-bottom: 1rem;
        }
        .blink {
            animation: blink 1s infinite;
        }
        @keyframes blink {
            0%, 50% { opacity: 1; }
            51%, 100% { opacity: 0; }
        }
    `;

    if (request.url.includes('.css')) {
        return new Response(`/* Terminal Offline CSS */ ${terminalStyle}`, {
            headers: { 'Content-Type': 'text/css' }
        });
    }
    
    if (request.url.includes('.js')) {
        return new Response('console.log("Terminal offline mode - JavaScript unavailable");', {
            headers: { 'Content-Type': 'application/javascript' }
        });
    }
    
    return new Response('Terminal Offline', {
        status: 503,
        statusText: 'Service Unavailable'
    });
}

function createTerminalOfflineNewsResponse() {
    return new Response(JSON.stringify({
        error: 'NETWORK_CONNECTION_OFFLINE',
        terminal_status: 'No cached news data available',
        offline: true,
        news: [],
        page: 1,
        total_pages: 1,
        terminal_message: 'Check network connection and retry',
        ascii_status: ASCII_NETWORK_OFFLINE
    }), {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'SW-Terminal-Offline': 'true'
        }
    });
}

function createTerminalAIOfflineResponse() {
    return new Response(JSON.stringify({
        error: 'AI_SYSTEM_OFFLINE',
        response: `**TERMINAL ERROR: AI_MODULE_UNAVAILABLE**

SYSTEM STATUS: Network connection lost
AI ENGINE: Gemini offline
CACHED DATA: None available

**ERROR CODE:** NETWORK_TIMEOUT
**ACTION:** Check connection and retry
**FALLBACK:** Use terminal commands for basic functionality

[TERMINAL] AI services will resume when network is restored`,
        terminal_offline: true,
        timestamp: new Date().toISOString()
    }), {
        status: 503,
        headers: {
            'Content-Type': 'application/json',
            'SW-Terminal-AI-Offline': 'true'
        }
    });
}

function createTerminalCommandOfflineResponse() {
    return new Response(JSON.stringify({
        status: 'error',
        message: 'TERMINAL_API_OFFLINE - Network connection required for command execution',
        terminal_status: 'offline',
        available_commands: ['help', 'status', 'cache'],
        error_code: 'NETWORK_UNAVAILABLE'
    }), {
        status: 503,
        headers: {
            'Content-Type': 'application/json',
            'SW-Terminal-Command-Offline': 'true'
        }
    });
}

function createTerminalOfflinePage() {
    const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>E-con Terminal - Offline Mode</title>
        <style>
            body {
                font-family: 'JetBrains Mono', 'Share Tech Mono', 'Courier New', monospace;
                background: #000000;
                color: #00ff00;
                margin: 0;
                padding: 0;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                line-height: 1.4;
            }
            .terminal-container {
                border: 2px solid #00ff00;
                padding: 3rem 2rem;
                max-width: 600px;
                width: 90%;
                background: rgba(0, 255, 0, 0.05);
                text-align: center;
            }
            .ascii-logo {
                font-size: 10px;
                line-height: 1;
                margin-bottom: 2rem;
                color: #00ff00;
                text-shadow: 0 0 10px #00ff00;
            }
            h1 {
                font-size: 1.5rem;
                margin: 2rem 0 1rem 0;
                text-transform: uppercase;
                letter-spacing: 2px;
            }
            .status {
                color: #ff0000;
                font-weight: bold;
                margin: 1rem 0;
                font-size: 1.1rem;
            }
            .message {
                margin: 2rem 0;
                font-size: 0.9rem;
                line-height: 1.6;
            }
            .button {
                background: transparent;
                border: 2px solid #00ff00;
                color: #00ff00;
                padding: 1rem 2rem;
                font-family: inherit;
                font-size: 0.9rem;
                cursor: pointer;
                margin-top: 2rem;
                transition: all 0.3s ease;
                text-transform: uppercase;
                letter-spacing: 1px;
            }
            .button:hover {
                background: #00ff00;
                color: #000000;
                box-shadow: 0 0 20px #00ff00;
            }
            .features {
                text-align: left;
                margin-top: 2rem;
                font-size: 0.8rem;
                line-height: 1.8;
            }
            .blink {
                animation: blink 1s infinite;
            }
            @keyframes blink {
                0%, 50% { opacity: 1; }
                51%, 100% { opacity: 0; }
            }
            @media (max-width: 600px) {
                .terminal-container {
                    padding: 2rem 1rem;
                }
                .ascii-logo {
                    font-size: 8px;
                }
            }
        </style>
    </head>
    <body>
        <div class="terminal-container">
            <div class="ascii-logo">
╔══════════════════════════════════════════════════════════════╗
║  ███████╗       ██████╗ ██████╗ ███╗   ██╗                  ║
║  ██╔════╝      ██╔════╝██╔═══██╗████╗  ██║                  ║
║  █████╗  █████╗██║     ██║   ██║██╔██╗ ██║                  ║
║  ██╔══╝  ╚════╝██║     ██║   ██║██║╚██╗██║                  ║
║  ███████╗      ╚██████╗╚██████╔╝██║ ╚████║                  ║
║  ╚══════╝       ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝                  ║
║                     TERMINAL OFFLINE MODE                   ║
╚══════════════════════════════════════════════════════════════╝
            </div>
            
            <h1>Terminal Disconnected</h1>
            <div class="status">STATUS: NETWORK_OFFLINE <span class="blink">█</span></div>
            
            <div class="message">
                Your terminal session has been disconnected from the network.<br>
                Some cached content may still be available offline.
            </div>
            
            <div class="features">
                <strong>AVAILABLE OFFLINE:</strong><br>
                • Cached news articles<br>
                • Terminal interface<br>
                • Local storage data<br>
                • Service worker functionality<br><br>
                
                <strong>NETWORK REQUIRED FOR:</strong><br>
                • Live news updates<br>
                • AI analysis features<br>
                • Real-time data sync<br>
                • Terminal API commands
            </div>
            
            <button class="button" onclick="location.reload()">
                🔄 RETRY CONNECTION
            </button>
        </div>
        
        <script>
            // Auto-retry connection
            let retryCount = 0;
            const maxRetries = 5;
            
            function checkConnection() {
                if (navigator.onLine && retryCount < maxRetries) {
                    retryCount++;
                    console.log('Terminal: Attempting reconnection...', retryCount);
                    setTimeout(() => location.reload(), 1000);
                }
            }
            
            window.addEventListener('online', checkConnection);
            
            // Retry every 30 seconds
            setInterval(() => {
                if (navigator.onLine) {
                    checkConnection();
                }
            }, 30000);
            
            // Terminal-style logging
            console.log('E-con Terminal - Offline Mode v2.024');
            console.log('Network status:', navigator.onLine ? 'ONLINE' : 'OFFLINE');
        </script>
    </body>
    </html>`;
    
    return new Response(html, {
        headers: { 
            'Content-Type': 'text/html; charset=utf-8',
            'SW-Terminal-Offline-Page': 'true'
        }
    });
}

// ===============================
// PERFORMANCE MONITORING - TERMINAL STYLE
// ===============================

function initializeTerminalMonitoring() {
    // Initialize performance tracking
    self.terminalPerformance = {
        cacheHits: 0,
        cacheMisses: 0,
        networkRequests: 0,
        offlineRequests: 0,
        startTime: Date.now(),
        
        getHitRate() {
            const total = this.cacheHits + this.cacheMisses;
            return total > 0 ? (this.cacheHits / total * 100).toFixed(1) + '%' : '0%';
        },
        
        getUptime() {
            return Math.floor((Date.now() - this.startTime) / 1000);
        }
    };
    
    terminalLog('Terminal performance monitoring initialized', 'INIT');
}

// ===============================
// BACKGROUND SYNC & PUSH NOTIFICATIONS
// ===============================

self.addEventListener('sync', (event) => {
    terminalLog(`Background sync triggered: ${event.tag}`, 'SYNC');
    
    if (event.tag === 'terminal-retry-requests') {
        event.waitUntil(retryFailedTerminalRequests());
    } else if (event.tag === 'terminal-cache-maintenance') {
        event.waitUntil(performTerminalMaintenance());
    }
});

async function retryFailedTerminalRequests() {
    terminalLog('Retrying failed terminal requests...', 'SYNC');
    
    try {
        // Test connectivity with main endpoint
        const response = await fetch('/api/news/all?page=1&limit=1');
        if (response.ok) {
            terminalLog('Terminal connection restored', 'SUCCESS');
            
            // Notify all clients
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
                client.postMessage({
                    type: 'TERMINAL_CONNECTION_RESTORED',
                    message: 'Network connection restored - Terminal online'
                });
            });
        }
    } catch (error) {
        terminalLog(`Terminal retry failed: ${error.message}`, 'ERROR');
    }
}

async function performTerminalMaintenance() {
    terminalLog('Performing terminal maintenance...', 'MAINT');
    
    try {
        await cleanupOldCaches();
        
        // Clean up expired news cache
        const newsCache = await caches.open(NEWS_CACHE);
        const requests = await newsCache.keys();
        
        for (const request of requests) {
            const response = await newsCache.match(request);
            if (response) {
                const cachedAt = response.headers.get('sw-terminal-cached-at');
                if (cachedAt) {
                    const age = Date.now() - parseInt(cachedAt);
                    if (age > CACHE_CONFIG.newsTTL * 2) {
                        await newsCache.delete(request);
                        terminalLog(`Deleted expired terminal cache: ${request.url}`, 'MAINT');
                    }
                }
            }
        }
        
        terminalLog('Terminal maintenance completed', 'SUCCESS');
    } catch (error) {
        terminalLog(`Terminal maintenance error: ${error.message}`, 'ERROR');
    }
}

// ===============================
// MESSAGE HANDLING - TERMINAL COMMUNICATION
// ===============================

self.addEventListener('message', (event) => {
    terminalLog(`Terminal message received: ${event.data?.type}`, 'MSG');
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_TERMINAL_STATUS') {
        event.ports[0].postMessage({
            type: 'TERMINAL_STATUS',
            performance: self.terminalPerformance,
            version: CACHE_VERSION,
            caches: {
                static: STATIC_CACHE,
                runtime: RUNTIME_CACHE,
                news: NEWS_CACHE,
                fonts: FONTS_CACHE,
                ai: AI_CACHE
            },
            timestamp: Date.now()
        });
    }
    
    if (event.data && event.data.type === 'CLEAR_TERMINAL_CACHE') {
        event.waitUntil(
            Promise.all([
                caches.delete(STATIC_CACHE),
                caches.delete(RUNTIME_CACHE),
                caches.delete(NEWS_CACHE),
                caches.delete(AI_CACHE)
            ]).then(() => {
                event.ports[0].postMessage({
                    type: 'TERMINAL_CACHE_CLEARED',
                    timestamp: Date.now()
                });
            })
        );
    }
});

// ===============================
// STARTUP SEQUENCE - TERMINAL BOOT
// ===============================

terminalLog('E-con Terminal Service Worker v2.024 loaded', 'BOOT');
terminalLog(`Cache configuration: ${JSON.stringify(CACHE_CONFIG)}`, 'CONFIG');
terminalLog(`Static resources: ${STATIC_RESOURCES.length} files`, 'CONFIG');
terminalLog('Terminal brutalism optimization: ENABLED', 'CONFIG');
terminalLog('Matrix/glitch effects support: READY', 'CONFIG');

// Enhanced performance tracking for retro brutalism
if ('storage' in navigator && 'estimate' in navigator.storage) {
    navigator.storage.estimate().then(estimate => {
        terminalLog(`Storage quota: ${Math.round(estimate.quota / 1024 / 1024)}MB`, 'STORAGE');
        terminalLog(`Storage usage: ${Math.round(estimate.usage / 1024 / 1024)}MB`, 'STORAGE');
        terminalLog(`Usage percentage: ${Math.round(estimate.usage / estimate.quota * 100)}%`, 'STORAGE');
    }).catch(() => {
        terminalLog('Storage estimation not available', 'WARN');
    });
}

// Terminal boot complete
terminalLog('Terminal Service Worker boot sequence complete', 'READY', `
[✓] TERMINAL_READY - All systems operational`);
