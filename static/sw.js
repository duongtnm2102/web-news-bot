// iOS 26 Liquid Glass News Portal - Enhanced Service Worker
// Version 2.1.0 - Optimized for Production Deployment

const CACHE_NAME = 'ios26-news-portal-v2.1.0';
const RUNTIME_CACHE = 'ios26-runtime-v2.1.0';
const NEWS_CACHE = 'ios26-news-data-v2.1.0';
const IMAGES_CACHE = 'ios26-images-v2.1.0';

// === OPTIMIZED CACHE CONFIGURATION ===
const CACHE_CONFIG = {
    maxStaticEntries: 25,      // iOS 26 optimized
    maxRuntimeEntries: 15,     // Enhanced for better UX
    maxNewsEntries: 12,        // Balanced for performance
    maxImageEntries: 20,       // Image caching for offline
    maxAge: 4 * 60 * 1000,     // 4 minutes for fresh news
    networkTimeout: 8000,      // 8 seconds network timeout
    staleWhileRevalidate: true // Background updates
};

// === STATIC RESOURCES FOR iOS 26 PORTAL ===
const STATIC_RESOURCES = [
    '/',
    '/static/style.css',
    '/static/script.js',
    '/static/manifest.json',
    // iOS 26 specific resources
    'https://fonts.googleapis.com/css2?family=SF+Pro+Display:wght@300;400;500;600;700;800;900&display=swap',
    'https://fonts.gstatic.com/s/sfprodisplay/v1/6xKwdSBYKcSV-LCoeQqfX1RYOo3qNa7lujVj9_mf.woff2'
];

// === NEWS API ENDPOINTS ===
const NEWS_ENDPOINTS = [
    '/api/news/all',
    '/api/news/domestic', 
    '/api/news/international',
    '/api/ai/ask',
    '/api/ai/debate'
];

// === INSTALL EVENT ===
self.addEventListener('install', (event) => {
    console.log('📦 iOS 26 Service Worker installing...');
    
    event.waitUntil(
        Promise.all([
            // Cache essential static resources
            caches.open(CACHE_NAME).then((cache) => {
                console.log('📝 Caching iOS 26 essential resources...');
                return cache.addAll(STATIC_RESOURCES.slice(0, 4)); // Core files first
            }),
            
            // Pre-cache fonts
            caches.open(CACHE_NAME).then((cache) => {
                console.log('🔤 Pre-caching iOS 26 fonts...');
                return cache.addAll(STATIC_RESOURCES.slice(4)); // Font files
            }).catch(error => {
                console.log('⚠️ Font pre-caching failed:', error);
            }),
            
            // Skip waiting for immediate activation
            self.skipWaiting()
        ])
    );
});

// === ACTIVATE EVENT ===
self.addEventListener('activate', (event) => {
    console.log('✅ iOS 26 Service Worker activated');
    
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            cleanupOldCaches(),
            
            // Claim all clients immediately
            self.clients.claim(),
            
            // Initialize performance monitoring
            initializePerformanceMonitoring()
        ])
    );
});

// === FETCH EVENT - ENHANCED FOR iOS 26 ===
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip chrome-extension and other non-http requests
    if (!url.protocol.startsWith('http')) {
        return;
    }
    
    // Enhanced request routing
    if (isStaticResource(url)) {
        event.respondWith(handleStaticResource(request));
    } else if (isNewsAPI(url)) {
        event.respondWith(handleNewsAPI(request));
    } else if (isImageResource(url)) {
        event.respondWith(handleImageResource(request));
    } else if (isNavigationRequest(request)) {
        event.respondWith(handleNavigation(request));
    } else if (isFontResource(url)) {
        event.respondWith(handleFontResource(request));
    } else {
        // Let other requests pass through with basic caching
        event.respondWith(handleGenericRequest(request));
    }
});

// === RESOURCE TYPE DETECTION ===
function isStaticResource(url) {
    const staticExtensions = ['.css', '.js', '.json', '.ico'];
    const pathname = url.pathname.toLowerCase();
    
    return staticExtensions.some(ext => pathname.endsWith(ext)) ||
           pathname.startsWith('/static/') ||
           pathname === '/';
}

function isNewsAPI(url) {
    return url.pathname.startsWith('/api/news/') || 
           url.pathname.startsWith('/api/article/') ||
           url.pathname.startsWith('/api/ai/');
}

function isImageResource(url) {
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
    const pathname = url.pathname.toLowerCase();
    
    return imageExtensions.some(ext => pathname.endsWith(ext)) ||
           url.hostname.includes('images') ||
           url.hostname.includes('cdn');
}

function isFontResource(url) {
    const fontExtensions = ['.woff', '.woff2', '.ttf', '.otf'];
    const pathname = url.pathname.toLowerCase();
    
    return fontExtensions.some(ext => pathname.endsWith(ext)) ||
           url.hostname === 'fonts.googleapis.com' ||
           url.hostname === 'fonts.gstatic.com';
}

function isNavigationRequest(request) {
    return request.mode === 'navigate';
}

// === STATIC RESOURCE HANDLER - CACHE FIRST ===
async function handleStaticResource(request) {
    console.log('📁 Handling static resource:', request.url);
    
    try {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        
        if (cached) {
            console.log('💾 Serving from cache:', request.url);
            
            // Stale-while-revalidate for CSS/JS
            if (request.url.includes('.css') || request.url.includes('.js')) {
                updateResourceInBackground(request, cache);
            }
            
            return cached;
        }
        
        console.log('🌐 Fetching from network:', request.url);
        const networkResponse = await fetchWithTimeout(request, 5000);
        
        if (networkResponse && networkResponse.ok) {
            // Clone and cache
            cache.put(request, networkResponse.clone());
            await limitCacheSize(cache, CACHE_CONFIG.maxStaticEntries);
        }
        
        return networkResponse || createOfflineResponse(request);
        
    } catch (error) {
        console.log('❌ Static resource failed:', error.message);
        return createOfflineResponse(request);
    }
}

// === NEWS API HANDLER - NETWORK FIRST WITH ENHANCED CACHING ===
async function handleNewsAPI(request) {
    console.log('📊 Handling news API:', request.url);
    
    try {
        // Enhanced network-first strategy
        const networkResponse = await fetchWithTimeout(request, CACHE_CONFIG.networkTimeout);
        
        if (networkResponse && networkResponse.ok) {
            console.log('✅ Network success, caching news:', request.url);
            
            // Cache the response with intelligent TTL
            const cache = await caches.open(NEWS_CACHE);
            
            // Add timestamp to response headers for TTL management
            const responseClone = networkResponse.clone();
            const responseWithTimestamp = new Response(responseClone.body, {
                status: responseClone.status,
                statusText: responseClone.statusText,
                headers: {
                    ...Object.fromEntries(responseClone.headers.entries()),
                    'sw-cached-at': Date.now().toString()
                }
            });
            
            cache.put(request, responseWithTimestamp);
            await limitCacheSize(cache, CACHE_CONFIG.maxNewsEntries);
            
            return networkResponse;
        }
        
    } catch (error) {
        console.log('❌ Network failed, trying cache:', error.message);
    }
    
    // Fallback to cache with freshness check
    const cache = await caches.open(NEWS_CACHE);
    const cached = await cache.match(request);
    
    if (cached) {
        const cachedAt = cached.headers.get('sw-cached-at');
        const age = cachedAt ? Date.now() - parseInt(cachedAt) : Infinity;
        
        if (age < CACHE_CONFIG.maxAge) {
            console.log('💾 Serving fresh cached news:', request.url);
            return cached;
        } else {
            console.log('⏰ Cached news is stale, removing:', request.url);
            cache.delete(request);
        }
    }
    
    // Final fallback - offline response
    return createOfflineNewsResponse();
}

// === IMAGE HANDLER - CACHE FIRST WITH LAZY LOADING ===
async function handleImageResource(request) {
    console.log('🖼️ Handling image resource:', request.url);
    
    try {
        const cache = await caches.open(IMAGES_CACHE);
        const cached = await cache.match(request);
        
        if (cached) {
            console.log('💾 Serving cached image:', request.url);
            return cached;
        }
        
        // Fetch with timeout for images
        const networkResponse = await fetchWithTimeout(request, 10000);
        
        if (networkResponse && networkResponse.ok) {
            // Only cache successful image responses
            if (networkResponse.headers.get('content-type')?.startsWith('image/')) {
                cache.put(request, networkResponse.clone());
                await limitCacheSize(cache, CACHE_CONFIG.maxImageEntries);
            }
        }
        
        return networkResponse || createPlaceholderImage();
        
    } catch (error) {
        console.log('❌ Image loading failed:', error.message);
        return createPlaceholderImage();
    }
}

// === FONT HANDLER - CACHE FIRST WITH LONG TTL ===
async function handleFontResource(request) {
    console.log('🔤 Handling font resource:', request.url);
    
    try {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        
        if (cached) {
            console.log('💾 Serving cached font:', request.url);
            return cached;
        }
        
        const networkResponse = await fetchWithTimeout(request, 15000);
        
        if (networkResponse && networkResponse.ok) {
            // Fonts are cached for long periods
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
        
    } catch (error) {
        console.log('❌ Font loading failed:', error.message);
        // Don't provide fallback for fonts - let browser handle it
        throw error;
    }
}

// === NAVIGATION HANDLER - NETWORK FIRST ===
async function handleNavigation(request) {
    console.log('🧭 Handling navigation:', request.url);
    
    try {
        const networkResponse = await fetchWithTimeout(request, 8000);
        if (networkResponse && networkResponse.ok) {
            return networkResponse;
        }
    } catch (error) {
        console.log('❌ Navigation network failed:', error.message);
    }
    
    // Fallback to cached index
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match('/');
    
    if (cached) {
        console.log('💾 Serving cached index for navigation');
        return cached;
    }
    
    // Ultimate fallback - enhanced offline page
    return createEnhancedOfflinePage();
}

// === GENERIC REQUEST HANDLER ===
async function handleGenericRequest(request) {
    try {
        const networkResponse = await fetchWithTimeout(request, 6000);
        
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
            console.log('💾 Serving cached generic resource:', request.url);
            return cached;
        }
        
        throw error;
    }
}

// === UTILITY FUNCTIONS ===
async function fetchWithTimeout(request, timeout = 5000) {
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

async function updateResourceInBackground(request, cache) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            cache.put(request, response);
            console.log('🔄 Updated resource in background:', request.url);
        }
    } catch (error) {
        console.log('⚠️ Background update failed:', error.message);
    }
}

async function limitCacheSize(cache, maxEntries) {
    try {
        const keys = await cache.keys();
        if (keys.length > maxEntries) {
            const keysToDelete = keys.slice(0, keys.length - maxEntries);
            await Promise.all(keysToDelete.map(key => cache.delete(key)));
            console.log(`🧹 Cleaned up ${keysToDelete.length} cache entries`);
        }
    } catch (error) {
        console.log('⚠️ Cache cleanup error:', error);
    }
}

async function cleanupOldCaches() {
    try {
        const cacheNames = await caches.keys();
        const currentCaches = [CACHE_NAME, RUNTIME_CACHE, NEWS_CACHE, IMAGES_CACHE];
        
        const deletePromises = cacheNames
            .filter(cacheName => !currentCaches.includes(cacheName))
            .map(cacheName => {
                console.log('🗑️ Deleting old cache:', cacheName);
                return caches.delete(cacheName);
            });
        
        return Promise.all(deletePromises);
    } catch (error) {
        console.log('⚠️ Cache cleanup error:', error);
    }
}

// === OFFLINE RESPONSES ===
function createOfflineResponse(request) {
    if (request.url.includes('.css')) {
        return new Response('/* iOS 26 Offline */body{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff;font-family:SF Pro Display,sans-serif;}', {
            headers: { 'Content-Type': 'text/css' }
        });
    }
    
    if (request.url.includes('.js')) {
        return new Response('console.log("iOS 26 Portal - Offline Mode");', {
            headers: { 'Content-Type': 'application/javascript' }
        });
    }
    
    return new Response('Offline - iOS 26 Portal', {
        status: 503,
        statusText: 'Service Unavailable'
    });
}

function createOfflineNewsResponse() {
    return new Response(JSON.stringify({
        error: 'Không có kết nối internet và không có dữ liệu đã lưu',
        offline: true,
        news: [],
        page: 1,
        total_pages: 1,
        offline_message: 'Vui lòng kiểm tra kết nối mạng và thử lại'
    }), {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
        }
    });
}

function createPlaceholderImage() {
    // Create a simple SVG placeholder
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">
        <defs>
            <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#007AFF;stop-opacity:0.3" />
                <stop offset="100%" style="stop-color:#AF52DE;stop-opacity:0.3" />
            </linearGradient>
        </defs>
        <rect width="400" height="200" fill="url(#grad)"/>
        <text x="200" y="100" text-anchor="middle" fill="#007AFF" font-family="SF Pro Display, sans-serif" font-size="16">📷 Ảnh không tải được</text>
        <text x="200" y="120" text-anchor="middle" fill="#64D2FF" font-family="SF Pro Display, sans-serif" font-size="12">iOS 26 Portal</text>
    </svg>`;
    
    return new Response(svg, {
        headers: {
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'no-cache'
        }
    });
}

function createEnhancedOfflinePage() {
    const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>iOS 26 E-con News - Offline</title>
        <style>
            body { 
                font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
                color: white; 
                text-align: center; 
                padding: 2rem;
                margin: 0;
                min-height: 100vh;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
            }
            .offline-container {
                background: rgba(255, 255, 255, 0.15);
                backdrop-filter: blur(20px);
                -webkit-backdrop-filter: blur(20px);
                border-radius: 24px;
                padding: 3rem 2rem;
                border: 1px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.15);
                max-width: 500px;
            }
            .logo {
                width: 80px;
                height: 80px;
                background: #007AFF;
                border-radius: 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 40px;
                margin: 0 auto 2rem;
                animation: pulse 2s infinite;
            }
            @keyframes pulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.05); opacity: 0.9; }
            }
            h1 { font-size: 2rem; margin-bottom: 1rem; font-weight: 700; }
            h2 { font-size: 1.5rem; margin-bottom: 1rem; color: #64D2FF; }
            p { margin-bottom: 2rem; line-height: 1.6; opacity: 0.9; }
            button {
                background: rgba(255, 255, 255, 0.2);
                border: 1px solid rgba(255, 255, 255, 0.3);
                color: white;
                padding: 1rem 2rem;
                border-radius: 50px;
                cursor: pointer;
                font-size: 1rem;
                font-weight: 600;
                transition: all 0.3s ease;
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
            }
            button:hover {
                background: rgba(255, 255, 255, 0.3);
                transform: translateY(-2px);
                box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
            }
            .features {
                margin-top: 2rem;
                text-align: left;
                opacity: 0.8;
            }
            .features h3 { color: #64D2FF; margin-bottom: 1rem; }
            .features ul { list-style: none; padding: 0; }
            .features li { margin-bottom: 0.5rem; }
            .features li::before { content: "✨ "; }
        </style>
    </head>
    <body>
        <div class="offline-container">
            <div class="logo">📊</div>
            <h1>E-con News</h1>
            <h2>📱 Chế độ Offline</h2>
            <p>Bạn đang offline, nhưng iOS 26 Portal vẫn hoạt động! Một số tính năng có thể bị giới hạn.</p>
            
            <div class="features">
                <h3>Tính năng khả dụng:</h3>
                <ul>
                    <li>Xem tin tức đã lưu cache</li>
                    <li>Giao diện Liquid Glass</li>
                    <li>Chức năng cơ bản</li>
                </ul>
            </div>
            
            <button onclick="location.reload()">🔄 Thử kết nối lại</button>
        </div>
        
        <script>
            // Auto-retry connection
            let retryCount = 0;
            const maxRetries = 3;
            
            function checkConnection() {
                if (navigator.onLine && retryCount < maxRetries) {
                    retryCount++;
                    console.log('Attempting to reconnect...', retryCount);
                    location.reload();
                }
            }
            
            window.addEventListener('online', checkConnection);
            
            // Retry every 30 seconds
            setInterval(() => {
                if (navigator.onLine) {
                    checkConnection();
                }
            }, 30000);
        </script>
    </body>
    </html>`;
    
    return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
}

// === PERFORMANCE MONITORING ===
function initializePerformanceMonitoring() {
    // Track cache hit rates
    self.cacheHitRate = {
        hits: 0,
        misses: 0,
        getRate() {
            const total = this.hits + this.misses;
            return total > 0 ? (this.hits / total * 100).toFixed(2) + '%' : '0%';
        }
    };
    
    console.log('📊 Performance monitoring initialized');
}

// === BACKGROUND SYNC ===
self.addEventListener('sync', (event) => {
    console.log('🔄 Background sync triggered:', event.tag);
    
    if (event.tag === 'ios26-retry-requests') {
        event.waitUntil(retryFailedRequests());
    } else if (event.tag === 'ios26-cache-cleanup') {
        event.waitUntil(performMaintenanceTasks());
    }
});

async function retryFailedRequests() {
    console.log('🔄 Retrying failed requests...');
    
    try {
        // Test connectivity with main endpoint
        const response = await fetch('/api/news/all?page=1&limit=1');
        if (response.ok) {
            console.log('✅ Connection restored');
            
            // Notify all clients
            const clients = await self.clients.matchAll();
            clients.forEach(client => {
                client.postMessage({
                    type: 'CONNECTION_RESTORED',
                    message: 'Kết nối đã được khôi phục'
                });
            });
        }
    } catch (error) {
        console.log('❌ Retry failed:', error);
    }
}

async function performMaintenanceTasks() {
    console.log('🧹 Performing maintenance tasks...');
    
    try {
        await cleanupOldCaches();
        
        // Clean up expired news cache
        const newsCache = await caches.open(NEWS_CACHE);
        const requests = await newsCache.keys();
        
        for (const request of requests) {
            const response = await newsCache.match(request);
            if (response) {
                const cachedAt = response.headers.get('sw-cached-at');
                if (cachedAt) {
                    const age = Date.now() - parseInt(cachedAt);
                    if (age > CACHE_CONFIG.maxAge * 2) {
                        await newsCache.delete(request);
                        console.log('🗑️ Deleted expired news cache:', request.url);
                    }
                }
            }
        }
        
        console.log('✅ Maintenance completed');
    } catch (error) {
        console.log('⚠️ Maintenance error:', error);
    }
}

// === PUSH NOTIFICATIONS ===
self.addEventListener('push', (event) => {
    console.log('🔔 Push notification received');
    
    const options = {
        body: event.data ? event.data.text() : 'Tin tức mới từ iOS 26 E-con Portal!',
        icon: '/static/icon-192x192.png',
        badge: '/static/badge-72x72.png',
        image: '/static/notification-image.jpg',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 'ios26-news',
            url: '/'
        },
        actions: [
            {
                action: 'explore',
                title: 'Xem tin tức',
                icon: '/static/action-explore.png'
            },
            {
                action: 'close',
                title: 'Đóng',
                icon: '/static/action-close.png'
            }
        ],
        tag: 'ios26-news',
        requireInteraction: false,
        silent: false
    };
    
    event.waitUntil(
        self.registration.showNotification('E-con News - iOS 26 Portal', options)
    );
});

self.addEventListener('notificationclick', (event) => {
    console.log('🖱️ Notification clicked:', event.action);
    
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow(event.notification.data.url || '/')
        );
    }
});

// === MESSAGE HANDLING ===
self.addEventListener('message', (event) => {
    console.log('💬 SW received message:', event.data);
    
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_CACHE_STATUS') {
        event.ports[0].postMessage({
            type: 'CACHE_STATUS',
            cacheHitRate: self.cacheHitRate ? self.cacheHitRate.getRate() : '0%',
            timestamp: Date.now()
        });
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys().then(cacheNames => {
                return Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
            }).then(() => {
                event.ports[0].postMessage({
                    type: 'CACHE_CLEARED',
                    timestamp: Date.now()
                });
            })
        );
    }
});

// === STARTUP LOG ===
console.log('🚀 iOS 26 Liquid Glass Service Worker loaded successfully');
console.log('📋 Cache configuration:', CACHE_CONFIG);
console.log('💾 Static resources:', STATIC_RESOURCES.length);
console.log('📱 Optimized for iOS 26 design system');
console.log('🎨 Features: Stale-while-revalidate, Background sync, Push notifications');

// === PERFORMANCE TRACKING ===
if ('storage' in navigator && 'estimate' in navigator.storage) {
    navigator.storage.estimate().then(estimate => {
        console.log('💾 Storage quota:', Math.round(estimate.quota / 1024 / 1024) + 'MB');
        console.log('💾 Storage usage:', Math.round(estimate.usage / 1024 / 1024) + 'MB');
        console.log('💾 Usage percentage:', Math.round(estimate.usage / estimate.quota * 100) + '%');
    }).catch(() => {
        console.log('💾 Storage estimation not available');
    });
}
