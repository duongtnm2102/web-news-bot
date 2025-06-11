// Tiền Phong Service Worker - SYNC Backend Optimized
// Version 3.0.0 - 2025 - Fixed for SYNC Backend

const CACHE_NAME = 'tienphong-news-v3.0.0';
const RUNTIME_CACHE = 'tienphong-runtime-v3.0.0';
const NEWS_CACHE = 'tienphong-news-data-v3.0.0';

// RENDER.COM OPTIMIZED: Minimal static resources for better performance
const STATIC_RESOURCES = [
  '/',
  '/static/style.css',
  '/static/script.js',
  '/static/manifest.json'
];

// RENDER.COM OPTIMIZED: Reduced cache sizes for memory efficiency
const CACHE_CONFIG = {
  maxStaticEntries: 10,      // Reduced for memory efficiency
  maxRuntimeEntries: 8,      // Reduced for Render.com free tier  
  maxNewsEntries: 5,         // Reduced to prevent memory issues
  maxAge: 2 * 60 * 1000,     // 2 minutes (shorter for fresh news)
  networkTimeout: 8000       // 8 seconds (increased for SYNC backend)
};

// News API endpoints to cache
const NEWS_ENDPOINTS = [
  '/api/news/all',
  '/api/news/domestic', 
  '/api/news/international'
];

// RENDER.COM OPTIMIZED: Fast install event
self.addEventListener('install', (event) => {
  console.log('📦 Tiền Phong Service Worker installing (SYNC optimized)...');
  
  event.waitUntil(
    Promise.all([
      // Cache essential static resources only
      caches.open(CACHE_NAME).then((cache) => {
        console.log('📝 Caching essential Tiền Phong resources...');
        return cache.addAll(STATIC_RESOURCES);
      }).catch(error => {
        console.warn('⚠️ Static resource caching failed:', error);
        // Don't fail installation if caching fails
      }),
      
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// RENDER.COM OPTIMIZED: Fast activation
self.addEventListener('activate', (event) => {
  console.log('✅ Tiền Phong Service Worker activated (SYNC version)');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches quickly
      cleanupOldCaches(),
      
      // Claim all clients
      self.clients.claim()
    ])
  );
});

// RENDER.COM OPTIMIZED: Enhanced fetch handling for SYNC backend
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Skip POST requests to AI endpoints (they're not cacheable)
  if (url.pathname.includes('/api/ai/')) {
    return;
  }
  
  // Handle different types of requests with optimized strategies
  if (isStaticResource(url)) {
    event.respondWith(handleStaticResource(request));
  } else if (isNewsAPI(url)) {
    event.respondWith(handleNewsAPI(request));
  } else if (isNavigationRequest(request)) {
    event.respondWith(handleNavigation(request));
  }
});

// RENDER.COM OPTIMIZED: Simple resource type checking
function isStaticResource(url) {
  const staticExtensions = ['.css', '.js', '.png', '.jpg', '.svg', '.woff2', '.ico'];
  const pathname = url.pathname.toLowerCase();
  
  return staticExtensions.some(ext => pathname.endsWith(ext)) ||
         pathname.startsWith('/static/') ||
         url.hostname === 'fonts.googleapis.com' ||
         url.hostname === 'fonts.gstatic.com';
}

function isNewsAPI(url) {
  return url.pathname.startsWith('/api/news/') || 
         url.pathname.startsWith('/api/article/');
}

function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

// RENDER.COM OPTIMIZED: Cache-first for static resources with fallback
async function handleStaticResource(request) {
  console.log('📁 Tiền Phong handling static resource:', request.url);
  
  try {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    
    if (cached) {
      console.log('💾 Serving from cache:', request.url);
      // Check if cache is fresh (optional background update)
      backgroundUpdateStatic(request, cache);
      return cached;
    }
    
    console.log('🌐 Fetching from network:', request.url);
    const networkResponse = await fetchWithTimeout(request, CACHE_CONFIG.networkTimeout);
    
    if (networkResponse && networkResponse.ok) {
      // Clone before caching
      const responseToCache = networkResponse.clone();
      cache.put(request, responseToCache);
      
      // Cleanup cache if too large
      limitCacheSize(cache, CACHE_CONFIG.maxStaticEntries);
    }
    
    return networkResponse || createFallbackResponse(request);
    
  } catch (error) {
    console.log('❌ Static resource failed:', error.message);
    return createFallbackResponse(request);
  }
}

// Background update for static resources
async function backgroundUpdateStatic(request, cache) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
  } catch (error) {
    console.log('⚠️ Background update failed:', error.message);
  }
}

// RENDER.COM OPTIMIZED: Stale-while-revalidate for news API with SYNC backend support
async function handleNewsAPI(request) {
  console.log('📊 Tiền Phong handling news API (SYNC):', request.url);
  
  try {
    const cache = await caches.open(NEWS_CACHE);
    const cached = await cache.match(request);
    
    // Serve cached version immediately if available
    if (cached) {
      console.log('💾 Serving cached news (will update in background):', request.url);
      
      // Background update for fresh content
      backgroundUpdateNews(request, cache);
      
      return cached;
    }
    
    // No cache available, fetch from network with timeout
    console.log('🌐 Fetching fresh news from SYNC backend:', request.url);
    const networkResponse = await fetchWithTimeout(request, CACHE_CONFIG.networkTimeout);
    
    if (networkResponse && networkResponse.ok) {
      console.log('✅ SYNC backend success, caching news:', request.url);
      
      // Cache the response
      const responseToCache = networkResponse.clone();
      cache.put(request, responseToCache);
      
      // Cleanup cache
      limitCacheSize(cache, CACHE_CONFIG.maxNewsEntries);
      
      return networkResponse;
    } else {
      throw new Error('Network response not ok');
    }
    
  } catch (error) {
    console.log('❌ News API failed, trying cache fallback:', error.message);
    
    // Try cache as final fallback
    const cache = await caches.open(NEWS_CACHE);
    const cached = await cache.match(request);
    
    if (cached) {
      console.log('💾 Serving stale cached news as fallback:', request.url);
      return cached;
    }
    
    // Final fallback - offline message optimized for SYNC backend
    return createNewsOfflineFallback();
  }
}

// Background update for news
async function backgroundUpdateNews(request, cache) {
  try {
    const networkResponse = await fetchWithTimeout(request, CACHE_CONFIG.networkTimeout);
    if (networkResponse && networkResponse.ok) {
      cache.put(request, networkResponse.clone());
      console.log('🔄 Background updated news cache:', request.url);
    }
  } catch (error) {
    console.log('⚠️ Background news update failed:', error.message);
  }
}

// Enhanced fetch with timeout
async function fetchWithTimeout(request, timeout) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}

// RENDER.COM OPTIMIZED: Simple navigation handling
async function handleNavigation(request) {
  console.log('🧭 Tiền Phong handling navigation (SYNC):', request.url);
  
  try {
    // Try network first for navigation with timeout
    const networkResponse = await fetchWithTimeout(request, CACHE_CONFIG.networkTimeout);
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
  
  // Ultimate fallback - optimized offline page for Tiền Phong
  return createNavigationFallback();
}

// Create fallback response for static resources
function createFallbackResponse(request) {
  const url = new URL(request.url);
  
  if (url.pathname.endsWith('.css')) {
    return new Response(`/* Tiền Phong offline CSS */
      body { 
        font-family: 'Times New Roman', serif; 
        background: #ffffff; 
        color: #000000; 
        margin: 0; 
        padding: 20px;
        text-align: center;
      }
      .offline-notice {
        border: 2px solid #dc2626;
        padding: 20px;
        margin: 20px 0;
        background: #fef2f2;
      }`, {
      headers: { 'Content-Type': 'text/css' }
    });
  }
  
  if (url.pathname.endsWith('.js')) {
    return new Response(`console.log('Tiền Phong: Script loaded in offline mode');`, {
      headers: { 'Content-Type': 'application/javascript' }
    });
  }
  
  return new Response('Tiền Phong: Resource unavailable offline', {
    status: 503,
    statusText: 'Service Unavailable'
  });
}

// Create news offline fallback
function createNewsOfflineFallback() {
  return new Response(JSON.stringify({
    error: 'Không có kết nối internet',
    offline: true,
    message: 'Tiền Phong: Vui lòng kiểm tra kết nối mạng và thử lại',
    news: [],
    page: 1,
    total_pages: 1
  }), {
    status: 503,
    statusText: 'Service Unavailable',
    headers: {
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
}

// Create navigation fallback
function createNavigationFallback() {
  return new Response(`<!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Tiền Phong - Offline</title>
      <style>
        body { 
          font-family: 'Times New Roman', serif; 
          background: #ffffff;
          color: #000000; 
          text-align: center; 
          padding: 2rem;
          margin: 0;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          line-height: 1.6;
        }
        .masthead {
          font-size: 3rem;
          font-weight: bold;
          color: #dc2626;
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 2px;
        }
        .tagline {
          font-size: 0.9rem;
          color: #666;
          margin-bottom: 2rem;
          border-bottom: 2px solid #dc2626;
          padding-bottom: 1rem;
        }
        .offline-container {
          background: #fef2f2;
          border: 3px solid #dc2626;
          padding: 2rem;
          max-width: 500px;
          margin: 2rem 0;
        }
        .offline-title {
          font-size: 1.5rem;
          font-weight: bold;
          margin-bottom: 1rem;
          color: #dc2626;
        }
        .offline-message {
          margin-bottom: 1.5rem;
          color: #333;
        }
        button {
          background: #dc2626;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          cursor: pointer;
          margin: 0.5rem;
          font-family: inherit;
          text-transform: uppercase;
          letter-spacing: 1px;
          transition: background 0.2s ease;
        }
        button:hover {
          background: #b91c1c;
        }
        .date {
          margin-top: 2rem;
          font-size: 0.9rem;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="masthead">Tiền Phong</div>
      <div class="tagline">www.tienphong.vn • Tin Tức Tài Chính - Chứng Khoán</div>
      
      <div class="offline-container">
        <div class="offline-title">📱 Chế độ Offline</div>
        <div class="offline-message">
          Không có kết nối internet. Tiền Phong cần kết nối để cập nhật tin tức mới nhất.
        </div>
        <button onclick="location.reload()">🔄 Thử lại</button>
        <button onclick="if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(function(registrations){for(let registration of registrations){registration.unregister();}});} location.reload();">🔧 Tải lại hoàn toàn</button>
      </div>
      
      <div class="date">
        ${new Date().toLocaleDateString('vi-VN', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
      </div>
      
      <script>
        // Auto-retry every 30 seconds
        setTimeout(() => {
          if (navigator.onLine) {
            location.reload();
          }
        }, 30000);
        
        // Listen for online event
        window.addEventListener('online', () => {
          location.reload();
        });
      </script>
    </body>
    </html>`, {
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
        console.log('🗑️ Deleting old Tiền Phong cache:', cacheName);
        return caches.delete(cacheName);
      });
    
    await Promise.all(deletePromises);
    console.log(`🧹 Cleaned up ${deletePromises.length} old caches`);
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
      console.log(`🧹 Tiền Phong cleaned up ${keysToDelete.length} cache entries`);
    }
  } catch (error) {
    console.log('⚠️ Cache size limiting error:', error);
  }
}

// RENDER.COM OPTIMIZED: Background sync for failed requests
self.addEventListener('sync', (event) => {
  console.log('🔄 Tiền Phong background sync triggered:', event.tag);
  
  if (event.tag === 'tienphong-retry-requests') {
    event.waitUntil(retryFailedRequests());
  }
});

async function retryFailedRequests() {
  console.log('🔄 Tiền Phong retrying failed requests...');
  
  try {
    // Simple retry logic - ping main endpoint
    const response = await fetchWithTimeout(
      new Request('/api/news/all?page=1&limit=1'), 
      CACHE_CONFIG.networkTimeout
    );
    
    if (response && response.ok) {
      console.log('✅ Tiền Phong retry successful');
      
      // Notify all clients that we're back online
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'BACK_ONLINE',
          message: 'Kết nối đã được khôi phục - Tiền Phong'
        });
      });
    }
  } catch (error) {
    console.log('❌ Tiền Phong retry failed:', error);
  }
}

// RENDER.COM OPTIMIZED: Push notifications for news updates
self.addEventListener('push', (event) => {
  console.log('🔔 Tiền Phong push notification received');
  
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || 'Tin tức mới từ Tiền Phong!',
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23dc2626"/><text x="50" y="65" font-size="40" text-anchor="middle" fill="white" font-family="serif">TP</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23dc2626"/><text x="50" y="65" font-size="30" text-anchor="middle" fill="white">📰</text></svg>',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 'tienphong-news',
      url: data.url || '/'
    },
    actions: [
      {
        action: 'open',
        title: 'Đọc tin tức',
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>'
      },
      {
        action: 'close',
        title: 'Đóng',
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>'
      }
    ],
    tag: 'tienphong-news',
    requireInteraction: false,
    silent: false
  };
  
  event.waitUntil(
    self.registration.showNotification('Tiền Phong - Tin Tức Tài Chính', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ Tiền Phong notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'open' || !event.action) {
    const urlToOpen = event.notification.data?.url || '/';
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(clientList => {
        // Check if a window is already open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  }
});

// RENDER.COM OPTIMIZED: Periodic cache maintenance (every 30 minutes)
setInterval(() => {
  console.log('🧹 Tiền Phong periodic cache maintenance...');
  
  // Clean up old caches
  cleanupOldCaches();
  
  // Clean up individual caches
  [CACHE_NAME, RUNTIME_CACHE, NEWS_CACHE].forEach(async (cacheName) => {
    try {
      const cache = await caches.open(cacheName);
      let maxEntries;
      
      switch (cacheName) {
        case NEWS_CACHE:
          maxEntries = CACHE_CONFIG.maxNewsEntries;
          break;
        case RUNTIME_CACHE:
          maxEntries = CACHE_CONFIG.maxRuntimeEntries;
          break;
        default:
          maxEntries = CACHE_CONFIG.maxStaticEntries;
      }
      
      await limitCacheSize(cache, maxEntries);
    } catch (error) {
      console.log('⚠️ Periodic maintenance error:', error);
    }
  });
}, 30 * 60 * 1000); // 30 minutes

// RENDER.COM OPTIMIZED: Message handling from main thread
self.addEventListener('message', (event) => {
  console.log('💬 Tiền Phong SW received message:', event.data);
  
  const { type, data } = event.data || {};
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'WARM_UP':
      // Respond to warm-up ping from main thread
      if (event.ports[0]) {
        event.ports[0].postMessage({
          type: 'WARM_UP_RESPONSE',
          timestamp: Date.now(),
          version: '3.0.0'
        });
      }
      break;
      
    case 'CLEAR_CACHE':
      // Clear specific cache or all caches
      event.waitUntil(
        data?.cacheName ? 
          caches.delete(data.cacheName) : 
          cleanupOldCaches()
      );
      break;
      
    case 'CACHE_NEWS':
      // Preemptively cache news data
      if (data?.url) {
        event.waitUntil(
          caches.open(NEWS_CACHE).then(cache => 
            fetch(data.url).then(response => {
              if (response.ok) {
                cache.put(data.url, response.clone());
              }
            })
          )
        );
      }
      break;
  }
});

// Log service worker status
console.log('🚀 Tiền Phong Service Worker loaded successfully (SYNC optimized)');
console.log('📋 Cache configuration:', CACHE_CONFIG);
console.log('💾 Static resources to cache:', STATIC_RESOURCES.length);
console.log('📱 Optimized for Render.com free tier with SYNC backend');
console.log('🎨 Theme: Traditional Tiền Phong Newspaper');

// RENDER.COM OPTIMIZED: Storage quota check
if ('storage' in navigator && 'estimate' in navigator.storage) {
  navigator.storage.estimate().then(estimate => {
    const quotaMB = Math.round(estimate.quota / 1024 / 1024);
    const usageMB = Math.round(estimate.usage / 1024 / 1024);
    console.log(`💾 Storage quota: ${quotaMB}MB, usage: ${usageMB}MB`);
    
    // Warn if approaching storage limit
    if (usageMB > quotaMB * 0.8) {
      console.warn('⚠️ Approaching storage quota limit, cleaning up...');
      cleanupOldCaches();
    }
  }).catch(error => {
    console.log('⚠️ Storage estimate unavailable:', error);
  });
}
