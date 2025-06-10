// E-con Service Worker - Render.com Free Tier Optimized
// Version 2.0.0 - 2025

const CACHE_NAME = 'econ-news-v2.0.0';
const RUNTIME_CACHE = 'econ-runtime-v2.0.0';
const NEWS_CACHE = 'econ-news-data-v2.0.0';

// RENDER.COM OPTIMIZED: Minimal static resources for low bandwidth
const STATIC_RESOURCES = [
  '/',
  '/static/style.css',
  '/static/script.js',
  '/static/manifest.json',
  // Essential fonts only
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

// RENDER.COM OPTIMIZED: Limited cache sizes for low memory
const CACHE_CONFIG = {
  maxStaticEntries: 15,      // Reduced further for E-con
  maxRuntimeEntries: 10,     // Reduced for better performance  
  maxNewsEntries: 8,         // Reduced to prevent memory issues
  maxAge: 3 * 60 * 1000,     // 3 minutes (shorter for fresh news)
  networkTimeout: 6000       // 6 seconds (optimized for Render.com)
};

// News API endpoints to cache
const NEWS_ENDPOINTS = [
  '/api/news/all',
  '/api/news/domestic', 
  '/api/news/international'
];

// RENDER.COM OPTIMIZED: Lightweight install event
self.addEventListener('install', (event) => {
  console.log('📦 E-con Service Worker installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache essential static resources only
      caches.open(CACHE_NAME).then((cache) => {
        console.log('📝 Caching essential E-con resources...');
        return cache.addAll(STATIC_RESOURCES.slice(0, 4)); // Only cache first 4 essential files
      }),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// RENDER.COM OPTIMIZED: Fast activation
self.addEventListener('activate', (event) => {
  console.log('✅ E-con Service Worker activated');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches quickly
      cleanupOldCaches(),
      
      // Claim all clients
      self.clients.claim()
    ])
  );
});

// RENDER.COM OPTIMIZED: Simplified fetch handling
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
  
  // Handle different types of requests with simple strategies
  if (isStaticResource(url)) {
    event.respondWith(handleStaticResource(request));
  } else if (isNewsAPI(url)) {
    event.respondWith(handleNewsAPI(request));
  } else if (isNavigationRequest(request)) {
    event.respondWith(handleNavigation(request));
  } else {
    // Let other requests pass through
    return;
  }
});

// RENDER.COM OPTIMIZED: Simple resource type checking
function isStaticResource(url) {
  const staticExtensions = ['.css', '.js', '.png', '.jpg', '.svg', '.woff2'];
  const pathname = url.pathname.toLowerCase();
  
  return staticExtensions.some(ext => pathname.endsWith(ext)) ||
         pathname.startsWith('/static/') ||
         url.hostname === 'fonts.googleapis.com' ||
         url.hostname === 'fonts.gstatic.com';
}

function isNewsAPI(url) {
  return url.pathname.startsWith('/api/news/') || 
         url.pathname.startsWith('/api/article/') ||
         url.pathname.startsWith('/api/ai/');
}

function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

// RENDER.COM OPTIMIZED: Cache-first for static resources
async function handleStaticResource(request) {
  console.log('📁 E-con handling static resource:', request.url);
  
  try {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    
    if (cached) {
      console.log('💾 Serving from cache:', request.url);
      return cached;
    }
    
    console.log('🌐 Fetching from network:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Clone before caching
      cache.put(request, networkResponse.clone());
      
      // Cleanup cache if too large
      limitCacheSize(cache, CACHE_CONFIG.maxStaticEntries);
    }
    
    return networkResponse;
    
  } catch (error) {
    console.log('❌ Static resource failed:', error.message);
    
    // Return offline fallback for essential files
    if (request.url.includes('/static/style.css')) {
      return new Response('/* E-con offline */body{background:#0a0a0f;color:#fff;}', {
        headers: { 'Content-Type': 'text/css' }
      });
    }
    
    throw error;
  }
}

// RENDER.COM OPTIMIZED: Network-first for news with short timeout
async function handleNewsAPI(request) {
  console.log('📊 E-con handling news API:', request.url);
  
  try {
    // Try network first with timeout
    const networkPromise = fetch(request);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Network timeout')), CACHE_CONFIG.networkTimeout)
    );
    
    const networkResponse = await Promise.race([networkPromise, timeoutPromise]);
    
    if (networkResponse.ok) {
      console.log('✅ Network success, caching news:', request.url);
      
      // Cache the response
      const cache = await caches.open(NEWS_CACHE);
      cache.put(request, networkResponse.clone());
      
      // Cleanup cache
      limitCacheSize(cache, CACHE_CONFIG.maxNewsEntries);
      
      return networkResponse;
    }
  } catch (error) {
    console.log('❌ Network failed, trying cache:', error.message);
  }
  
  // Fallback to cache
  const cache = await caches.open(NEWS_CACHE);
  const cached = await cache.match(request);
  
  if (cached) {
    console.log('💾 Serving cached news as fallback:', request.url);
    return cached;
  }
  
  // Final fallback - offline message
  return new Response(JSON.stringify({
    error: 'Không có kết nối internet và không có dữ liệu đã lưu',
    offline: true,
    news: [],
    page: 1,
    total_pages: 1
  }), {
    status: 503,
    statusText: 'Service Unavailable',
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

// RENDER.COM OPTIMIZED: Simple navigation handling
async function handleNavigation(request) {
  console.log('🧭 E-con handling navigation:', request.url);
  
  try {
    // Try network first for navigation
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
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
  
  // Ultimate fallback - simple offline page
  return new Response(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>E-con News - Offline</title>
      <style>
        body { 
          font-family: Inter, sans-serif; 
          background: linear-gradient(135deg, #4ecdc4 0%, #ff6b6b 50%, #45b7d1 100%);
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
          backdrop-filter: blur(15px);
          border-radius: 20px;
          padding: 2rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
        }
        button {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          cursor: pointer;
          margin-top: 1rem;
          font-size: 1rem;
          transition: all 0.3s ease;
        }
        button:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
        }
        .emoji {
          font-size: 4rem;
          margin-bottom: 1rem;
          animation: bounce 2s infinite;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      </style>
    </head>
    <body>
      <div class="offline-container">
        <div class="emoji">📊</div>
        <h1>E-con News</h1>
        <h2>📱 Chế độ Offline</h2>
        <p>Không có kết nối internet. Vui lòng kiểm tra kết nối và thử lại.</p>
        <button onclick="location.reload()">🔄 Thử lại</button>
      </div>
    </body>
    </html>
  `, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' }
  });
}

// RENDER.COM OPTIMIZED: Efficient cache cleanup
async function cleanupOldCaches() {
  try {
    const cacheNames = await caches.keys();
    const currentCaches = [CACHE_NAME, RUNTIME_CACHE, NEWS_CACHE];
    
    const deletePromises = cacheNames
      .filter(cacheName => !currentCaches.includes(cacheName))
      .map(cacheName => {
        console.log('🗑️ Deleting old E-con cache:', cacheName);
        return caches.delete(cacheName);
      });
    
    return Promise.all(deletePromises);
  } catch (error) {
    console.log('⚠️ Cache cleanup error:', error);
  }
}

// RENDER.COM OPTIMIZED: Simple cache size limiting
async function limitCacheSize(cache, maxEntries) {
  try {
    const keys = await cache.keys();
    if (keys.length > maxEntries) {
      const keysToDelete = keys.slice(0, keys.length - maxEntries);
      await Promise.all(keysToDelete.map(key => cache.delete(key)));
      console.log(`🧹 E-con cleaned up ${keysToDelete.length} cache entries`);
    }
  } catch (error) {
    console.log('⚠️ Cache size limiting error:', error);
  }
}

// RENDER.COM OPTIMIZED: Background sync for failed requests (simplified)
self.addEventListener('sync', (event) => {
  console.log('🔄 E-con background sync triggered:', event.tag);
  
  if (event.tag === 'econ-retry-requests') {
    event.waitUntil(retryFailedRequests());
  }
});

async function retryFailedRequests() {
  console.log('🔄 E-con retrying failed requests...');
  
  try {
    // Simple retry logic - just ping the main endpoint
    const response = await fetch('/api/news/all?page=1&limit=1');
    if (response.ok) {
      console.log('✅ E-con retry successful');
      
      // Notify all clients that we're back online
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'BACK_ONLINE',
          message: 'Kết nối đã được khôi phục'
        });
      });
    }
  } catch (error) {
    console.log('❌ E-con retry failed:', error);
  }
}

// RENDER.COM OPTIMIZED: Simple push notifications
self.addEventListener('push', (event) => {
  console.log('🔔 E-con push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'Tin tức mới từ E-con!',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%234ecdc4;stop-opacity:1" /><stop offset="50%" style="stop-color:%23ff6b6b;stop-opacity:1" /><stop offset="100%" style="stop-color:%2345b7d1;stop-opacity:1" /></linearGradient></defs><rect width="100" height="100" fill="url(%23grad)" rx="20"/><text x="50" y="65" font-size="45" text-anchor="middle" fill="white">📊</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%234ecdc4"/><text x="50" y="65" font-size="45" text-anchor="middle" fill="white">📊</text></svg>',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 'econ-news'
    },
    actions: [
      {
        action: 'explore',
        title: 'Xem tin tức',
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>'
      },
      {
        action: 'close',
        title: 'Đóng',
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>'
      }
    ],
    tag: 'econ-news',
    requireInteraction: false
  };
  
  event.waitUntil(
    self.registration.showNotification('E-con News Portal', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ E-con notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// RENDER.COM OPTIMIZED: Periodic cache cleanup (every 20 minutes)
setInterval(() => {
  console.log('🧹 E-con periodic cache cleanup...');
  cleanupOldCaches();
  
  // Also clean up individual caches
  [CACHE_NAME, RUNTIME_CACHE, NEWS_CACHE].forEach(async (cacheName) => {
    try {
      const cache = await caches.open(cacheName);
      const maxEntries = cacheName === NEWS_CACHE ? CACHE_CONFIG.maxNewsEntries : 
                         cacheName === RUNTIME_CACHE ? CACHE_CONFIG.maxRuntimeEntries : 
                         CACHE_CONFIG.maxStaticEntries;
      await limitCacheSize(cache, maxEntries);
    } catch (error) {
      console.log('⚠️ Periodic cleanup error:', error);
    }
  });
}, 20 * 60 * 1000); // 20 minutes

// RENDER.COM OPTIMIZED: Message handling from main thread
self.addEventListener('message', (event) => {
  console.log('💬 E-con SW received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'WARM_UP') {
    // Respond to warm-up ping from main thread
    event.ports[0].postMessage({
      type: 'WARM_UP_RESPONSE',
      timestamp: Date.now()
    });
  }
});

// Log service worker status
console.log('🚀 E-con Service Worker loaded successfully');
console.log('📋 Cache configuration:', CACHE_CONFIG);
console.log('💾 Static resources to cache:', STATIC_RESOURCES.length);
console.log('📱 Optimized for Render.com free tier');
console.log('🎨 Theme: Colorful Rainbow with Glassmorphism');

// RENDER.COM OPTIMIZED: Check available storage
if ('storage' in navigator && 'estimate' in navigator.storage) {
  navigator.storage.estimate().then(estimate => {
    console.log('💾 Storage quota:', Math.round(estimate.quota / 1024 / 1024) + 'MB');
    console.log('💾 Storage usage:', Math.round(estimate.usage / 1024 / 1024) + 'MB');
  });
}
