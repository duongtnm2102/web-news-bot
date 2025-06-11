"""
Advanced Cache Manager for E-con News Terminal v2.024
Intelligent caching strategies optimized for 512MB RAM environments
Multi-tier caching with LRU, TTL, and memory-aware eviction
"""

import time
import threading
import hashlib
import pickle
import gzip
import json
from typing import Any, Dict, List, Optional, Callable, Union
from datetime import datetime, timedelta
from collections import OrderedDict, defaultdict
from dataclasses import dataclass, field
from enum import Enum
import logging
import gc
import sys

logger = logging.getLogger(__name__)

class CachePriority(Enum):
    """Cache priority levels for intelligent eviction"""
    CRITICAL = 1    # Never evict (system data)
    HIGH = 2        # High priority (user data)
    MEDIUM = 3      # Medium priority (news data)
    LOW = 4         # Low priority (temporary data)
    DISPOSABLE = 5  # First to evict (debug data)

@dataclass
class CacheEntry:
    """Enhanced cache entry with metadata"""
    key: str
    value: Any
    created_at: float
    last_accessed: float
    access_count: int = 0
    priority: CachePriority = CachePriority.MEDIUM
    ttl: Optional[float] = None
    size_bytes: int = 0
    compressed: bool = False
    tags: List[str] = field(default_factory=list)
    
    @property
    def age(self) -> float:
        """Age in seconds"""
        return time.time() - self.created_at
    
    @property
    def idle_time(self) -> float:
        """Time since last access"""
        return time.time() - self.last_accessed
    
    @property
    def is_expired(self) -> bool:
        """Check if entry is expired"""
        if self.ttl is None:
            return False
        return self.age > self.ttl
    
    def access(self):
        """Record access to this entry"""
        self.last_accessed = time.time()
        self.access_count += 1

class CacheStats:
    """Cache statistics tracking"""
    def __init__(self):
        self.hits = 0
        self.misses = 0
        self.evictions = 0
        self.compressions = 0
        self.memory_pressure_events = 0
        self.total_size_bytes = 0
        self.start_time = time.time()
    
    @property
    def hit_rate(self) -> float:
        total = self.hits + self.misses
        return (self.hits / total * 100) if total > 0 else 0
    
    @property
    def uptime(self) -> float:
        return time.time() - self.start_time
    
    def reset(self):
        """Reset statistics"""
        self.hits = 0
        self.misses = 0
        self.evictions = 0
        self.compressions = 0
        self.memory_pressure_events = 0
        self.start_time = time.time()

class MemoryAwareLRUCache:
    """Memory-aware LRU cache with compression and intelligent eviction"""
    
    def __init__(self, 
                 max_size: int = 100,
                 max_memory_mb: int = 50,
                 default_ttl: Optional[float] = None,
                 compression_threshold: int = 1024,
                 auto_cleanup: bool = True):
        
        self.max_size = max_size
        self.max_memory_bytes = max_memory_mb * 1024 * 1024
        self.default_ttl = default_ttl
        self.compression_threshold = compression_threshold
        self.auto_cleanup = auto_cleanup
        
        # Thread-safe storage
        self._cache: OrderedDict[str, CacheEntry] = OrderedDict()
        self._lock = threading.RLock()
        self._stats = CacheStats()
        
        # Memory tracking
        self._current_memory = 0
        self._memory_warning_threshold = 0.8
        self._memory_critical_threshold = 0.95
        
        # Tag-based indexing
        self._tags: Dict[str, set] = defaultdict(set)
        
        # Event handlers
        self._eviction_handlers: List[Callable] = []
        self._memory_pressure_handlers: List[Callable] = []
        
        # Cleanup thread
        self._cleanup_thread = None
        self._shutdown = False
        
        if auto_cleanup:
            self.start_cleanup_thread()
        
        logger.info(f"🗄️ Memory-aware cache initialized: {max_size} entries, {max_memory_mb}MB")
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get value from cache with LRU ordering"""
        with self._lock:
            entry = self._cache.get(key)
            
            if entry is None:
                self._stats.misses += 1
                return default
            
            # Check expiration
            if entry.is_expired:
                self._remove_entry(key)
                self._stats.misses += 1
                return default
            
            # Update access and move to end (most recent)
            entry.access()
            self._cache.move_to_end(key)
            self._stats.hits += 1
            
            # Decompress if needed
            value = self._decompress_value(entry.value) if entry.compressed else entry.value
            return value
    
    def set(self, 
            key: str, 
            value: Any, 
            ttl: Optional[float] = None, 
            priority: CachePriority = CachePriority.MEDIUM,
            tags: Optional[List[str]] = None) -> bool:
        """Set value in cache with intelligent storage"""
        
        if value is None:
            return False
        
        with self._lock:
            # Serialize and optionally compress
            serialized_value, size_bytes, compressed = self._prepare_value(value)
            
            # Create cache entry
            entry = CacheEntry(
                key=key,
                value=serialized_value,
                created_at=time.time(),
                last_accessed=time.time(),
                priority=priority,
                ttl=ttl or self.default_ttl,
                size_bytes=size_bytes,
                compressed=compressed,
                tags=tags or []
            )
            
            # Check if we need to make space
            required_space = size_bytes
            if not self._ensure_space(required_space, priority):
                logger.warning(f"Cannot cache {key}: insufficient space")
                return False
            
            # Remove existing entry if updating
            if key in self._cache:
                self._remove_entry(key)
            
            # Add new entry
            self._cache[key] = entry
            self._current_memory += size_bytes
            self._stats.total_size_bytes += size_bytes
            
            # Update tag indexing
            for tag in entry.tags:
                self._tags[tag].add(key)
            
            # Check memory pressure
            self._check_memory_pressure()
            
            return True
    
    def delete(self, key: str) -> bool:
        """Delete specific key from cache"""
        with self._lock:
            if key in self._cache:
                self._remove_entry(key)
                return True
            return False
    
    def clear(self) -> None:
        """Clear all cache entries"""
        with self._lock:
            self._cache.clear()
            self._tags.clear()
            self._current_memory = 0
            logger.info("🗄️ Cache cleared")
    
    def clear_by_tag(self, tag: str) -> int:
        """Clear all entries with specific tag"""
        with self._lock:
            if tag not in self._tags:
                return 0
            
            keys_to_delete = list(self._tags[tag])
            for key in keys_to_delete:
                self._remove_entry(key)
            
            return len(keys_to_delete)
    
    def clear_expired(self) -> int:
        """Clear all expired entries"""
        with self._lock:
            expired_keys = [
                key for key, entry in self._cache.items() 
                if entry.is_expired
            ]
            
            for key in expired_keys:
                self._remove_entry(key)
            
            if expired_keys:
                logger.info(f"🗄️ Cleared {len(expired_keys)} expired entries")
            
            return len(expired_keys)
    
    def optimize_memory(self, target_reduction_mb: float = 10) -> Dict[str, Any]:
        """Aggressive memory optimization"""
        with self._lock:
            initial_memory = self._current_memory
            target_bytes = target_reduction_mb * 1024 * 1024
            
            optimization_stats = {
                'initial_memory_mb': initial_memory / 1024 / 1024,
                'target_reduction_mb': target_reduction_mb,
                'expired_cleared': 0,
                'low_priority_evicted': 0,
                'compressed': 0,
                'final_memory_mb': 0,
                'memory_freed_mb': 0
            }
            
            # Step 1: Clear expired entries
            optimization_stats['expired_cleared'] = self.clear_expired()
            
            # Step 2: Evict low priority entries
            if self._current_memory > initial_memory - target_bytes:
                optimization_stats['low_priority_evicted'] = self._evict_by_priority([
                    CachePriority.DISPOSABLE, 
                    CachePriority.LOW
                ])
            
            # Step 3: Compress large entries
            if self._current_memory > initial_memory - target_bytes:
                optimization_stats['compressed'] = self._compress_large_entries()
            
            # Step 4: LRU eviction if still needed
            if self._current_memory > initial_memory - target_bytes:
                while (self._current_memory > initial_memory - target_bytes and 
                       len(self._cache) > 0):
                    oldest_key = next(iter(self._cache))
                    self._remove_entry(oldest_key)
            
            optimization_stats['final_memory_mb'] = self._current_memory / 1024 / 1024
            optimization_stats['memory_freed_mb'] = (initial_memory - self._current_memory) / 1024 / 1024
            
            logger.info(f"🗄️ Memory optimization: {optimization_stats['memory_freed_mb']:.1f}MB freed")
            return optimization_stats
    
    def _prepare_value(self, value: Any) -> tuple[Any, int, bool]:
        """Serialize and optionally compress value"""
        try:
            # Serialize value
            serialized = pickle.dumps(value)
            size_bytes = len(serialized)
            compressed = False
            
            # Compress if above threshold
            if size_bytes > self.compression_threshold:
                try:
                    compressed_data = gzip.compress(serialized)
                    if len(compressed_data) < size_bytes * 0.8:  # At least 20% reduction
                        serialized = compressed_data
                        size_bytes = len(compressed_data)
                        compressed = True
                        self._stats.compressions += 1
                except Exception as e:
                    logger.warning(f"Compression failed: {e}")
            
            return serialized, size_bytes, compressed
            
        except Exception as e:
            logger.error(f"Value serialization failed: {e}")
            raise
    
    def _decompress_value(self, value: Any) -> Any:
        """Decompress and deserialize value"""
        try:
            if isinstance(value, bytes):
                # Try decompression first
                try:
                    decompressed = gzip.decompress(value)
                    return pickle.loads(decompressed)
                except:
                    # Not compressed, just pickled
                    return pickle.loads(value)
            return value
        except Exception as e:
            logger.error(f"Value decompression failed: {e}")
            raise
    
    def _ensure_space(self, required_bytes: int, priority: CachePriority) -> bool:
        """Ensure sufficient space for new entry"""
        # Check if we're at size limit
        if len(self._cache) >= self.max_size:
            if not self._evict_lru_entries(1):
                return False
        
        # Check memory limit
        if self._current_memory + required_bytes > self.max_memory_bytes:
            # Try to free enough memory
            target_free = required_bytes + (self.max_memory_bytes * 0.1)  # 10% buffer
            
            # First, clear expired
            self.clear_expired()
            
            # Then evict by priority (but not higher priority than new entry)
            evictable_priorities = [p for p in CachePriority if p.value > priority.value]
            if not self._evict_by_priority(evictable_priorities, target_free):
                # Last resort: LRU eviction
                return self._evict_memory_based(target_free)
        
        return True
    
    def _evict_lru_entries(self, count: int) -> bool:
        """Evict least recently used entries"""
        evicted = 0
        keys_to_remove = []
        
        for key, entry in self._cache.items():
            if entry.priority != CachePriority.CRITICAL and evicted < count:
                keys_to_remove.append(key)
                evicted += 1
        
        for key in keys_to_remove:
            self._remove_entry(key)
        
        return evicted > 0
    
    def _evict_by_priority(self, priorities: List[CachePriority], target_bytes: Optional[int] = None) -> int:
        """Evict entries by priority level"""
        evicted_count = 0
        freed_bytes = 0
        keys_to_remove = []
        
        for key, entry in self._cache.items():
            if entry.priority in priorities:
                keys_to_remove.append(key)
                freed_bytes += entry.size_bytes
                evicted_count += 1
                
                if target_bytes and freed_bytes >= target_bytes:
                    break
        
        for key in keys_to_remove:
            self._remove_entry(key)
        
        return evicted_count
    
    def _evict_memory_based(self, target_bytes: int) -> bool:
        """Evict entries based on memory usage"""
        freed_bytes = 0
        keys_to_remove = []
        
        # Sort by access patterns and size
        entries = list(self._cache.items())
        entries.sort(key=lambda x: (
            x[1].priority.value,  # Priority first
            x[1].idle_time,       # Then by idle time
            -x[1].size_bytes      # Then by size (larger first)
        ), reverse=True)
        
        for key, entry in entries:
            if entry.priority != CachePriority.CRITICAL:
                keys_to_remove.append(key)
                freed_bytes += entry.size_bytes
                
                if freed_bytes >= target_bytes:
                    break
        
        for key in keys_to_remove:
            self._remove_entry(key)
        
        return freed_bytes >= target_bytes
    
    def _compress_large_entries(self) -> int:
        """Compress large uncompressed entries"""
        compressed_count = 0
        
        for entry in self._cache.values():
            if (not entry.compressed and 
                entry.size_bytes > self.compression_threshold and 
                entry.priority != CachePriority.CRITICAL):
                
                try:
                    compressed_data = gzip.compress(entry.value)
                    if len(compressed_data) < entry.size_bytes * 0.8:
                        memory_saved = entry.size_bytes - len(compressed_data)
                        entry.value = compressed_data
                        entry.size_bytes = len(compressed_data)
                        entry.compressed = True
                        self._current_memory -= memory_saved
                        compressed_count += 1
                        self._stats.compressions += 1
                except Exception as e:
                    logger.warning(f"Runtime compression failed: {e}")
        
        return compressed_count
    
    def _remove_entry(self, key: str) -> None:
        """Remove entry and update indexes"""
        if key not in self._cache:
            return
        
        entry = self._cache[key]
        
        # Update memory tracking
        self._current_memory -= entry.size_bytes
        
        # Remove from tag indexes
        for tag in entry.tags:
            self._tags[tag].discard(key)
            if not self._tags[tag]:
                del self._tags[tag]
        
        # Remove from cache
        del self._cache[key]
        self._stats.evictions += 1
    
    def _check_memory_pressure(self) -> None:
        """Check and respond to memory pressure"""
        memory_ratio = self._current_memory / self.max_memory_bytes
        
        if memory_ratio > self._memory_critical_threshold:
            self._stats.memory_pressure_events += 1
            logger.warning(f"🗄️ Critical memory pressure: {memory_ratio:.1%}")
            self._trigger_memory_pressure_handlers('critical')
            self.optimize_memory(self.max_memory_bytes * 0.2 / 1024 / 1024)  # Free 20%
            
        elif memory_ratio > self._memory_warning_threshold:
            logger.info(f"🗄️ Memory warning: {memory_ratio:.1%}")
            self._trigger_memory_pressure_handlers('warning')
    
    def _trigger_memory_pressure_handlers(self, level: str) -> None:
        """Trigger memory pressure event handlers"""
        for handler in self._memory_pressure_handlers:
            try:
                handler(level, self.get_stats())
            except Exception as e:
                logger.error(f"Memory pressure handler error: {e}")
    
    def add_memory_pressure_handler(self, handler: Callable) -> None:
        """Add memory pressure event handler"""
        self._memory_pressure_handlers.append(handler)
    
    def start_cleanup_thread(self) -> None:
        """Start background cleanup thread"""
        if self._cleanup_thread is not None:
            return
        
        def cleanup_worker():
            while not self._shutdown:
                try:
                    time.sleep(60)  # Run every minute
                    if not self._shutdown:
                        with self._lock:
                            expired_count = self.clear_expired()
                            if expired_count > 0:
                                logger.debug(f"🗄️ Background cleanup: {expired_count} expired entries")
                except Exception as e:
                    logger.error(f"Cleanup thread error: {e}")
        
        self._cleanup_thread = threading.Thread(target=cleanup_worker, daemon=True)
        self._cleanup_thread.start()
        logger.info("🗄️ Cleanup thread started")
    
    def stop_cleanup_thread(self) -> None:
        """Stop background cleanup thread"""
        self._shutdown = True
        if self._cleanup_thread:
            self._cleanup_thread.join(timeout=5)
        logger.info("🗄️ Cleanup thread stopped")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        with self._lock:
            return {
                'entries': len(self._cache),
                'max_size': self.max_size,
                'memory_mb': self._current_memory / 1024 / 1024,
                'max_memory_mb': self.max_memory_bytes / 1024 / 1024,
                'memory_usage_percent': (self._current_memory / self.max_memory_bytes) * 100,
                'hit_rate_percent': self._stats.hit_rate,
                'hits': self._stats.hits,
                'misses': self._stats.misses,
                'evictions': self._stats.evictions,
                'compressions': self._stats.compressions,
                'memory_pressure_events': self._stats.memory_pressure_events,
                'uptime_seconds': self._stats.uptime,
                'tags': len(self._tags)
            }
    
    def get_terminal_report(self) -> str:
        """Get formatted terminal report"""
        stats = self.get_stats()
        
        return f"""CACHE MANAGER REPORT:
├─ Entries: {stats['entries']}/{stats['max_size']}
├─ Memory: {stats['memory_mb']:.1f}MB/{stats['max_memory_mb']:.1f}MB ({stats['memory_usage_percent']:.1f}%)
├─ Hit Rate: {stats['hit_rate_percent']:.1f}%
├─ Operations: {stats['hits']} hits, {stats['misses']} misses
├─ Evictions: {stats['evictions']}
├─ Compressions: {stats['compressions']}
├─ Memory Pressure: {stats['memory_pressure_events']} events
├─ Tags: {stats['tags']} categories
└─ Uptime: {stats['uptime_seconds']:.0f}s"""
    
    def __del__(self):
        """Cleanup on destruction"""
        self.stop_cleanup_thread()

# Global cache manager instance
_global_cache_manager = None

def get_cache_manager(max_size: int = 100, max_memory_mb: int = 50) -> MemoryAwareLRUCache:
    """Get or create global cache manager"""
    global _global_cache_manager
    
    if _global_cache_manager is None:
        _global_cache_manager = MemoryAwareLRUCache(
            max_size=max_size,
            max_memory_mb=max_memory_mb,
            default_ttl=3600,  # 1 hour default TTL
            compression_threshold=1024,  # 1KB
            auto_cleanup=True
        )
    
    return _global_cache_manager

# Cache decorators for easy integration
def cached(ttl: Optional[float] = None, 
          priority: CachePriority = CachePriority.MEDIUM,
          tags: Optional[List[str]] = None,
          key_func: Optional[Callable] = None):
    """Decorator for caching function results"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            cache = get_cache_manager()
            
            # Generate cache key
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                cache_key = f"{func.__name__}_{hash((args, tuple(sorted(kwargs.items()))))}"
            
            # Try to get from cache
            result = cache.get(cache_key)
            if result is not None:
                return result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            cache.set(cache_key, result, ttl=ttl, priority=priority, tags=tags)
            
            return result
        return wrapper
    return decorator

# Cache management functions for Flask integration
def setup_app_caching(app):
    """Setup caching for Flask application"""
    cache_manager = get_cache_manager()
    
    # Store reference in app
    app.cache_manager = cache_manager
    
    # Add cache management endpoints
    @app.route('/api/cache/stats')
    def cache_stats():
        return cache_manager.get_stats()
    
    @app.route('/api/cache/clear', methods=['POST'])
    def clear_cache():
        cache_manager.clear()
        return {'status': 'success', 'message': 'Cache cleared'}
    
    @app.route('/api/cache/optimize', methods=['POST'])
    def optimize_cache():
        result = cache_manager.optimize_memory()
        return {'status': 'success', 'optimization': result}
    
    # Memory pressure handler
    def memory_pressure_handler(level, stats):
        app.logger.warning(f"Cache memory pressure [{level}]: {stats['memory_usage_percent']:.1f}%")
    
    cache_manager.add_memory_pressure_handler(memory_pressure_handler)
    
    logger.info("🗄️ App caching configured")
    return cache_manager

if __name__ == "__main__":
    # Test the cache manager
    cache = MemoryAwareLRUCache(max_size=10, max_memory_mb=1)
    
    # Test basic operations
    cache.set("test1", "value1", tags=["test"])
    cache.set("test2", {"data": "value2"}, priority=CachePriority.HIGH)
    
    print("Value 1:", cache.get("test1"))
    print("Value 2:", cache.get("test2"))
    print("Stats:", cache.get_terminal_report())
    
    # Test memory optimization
    result = cache.optimize_memory(0.5)
    print("Optimization result:", result)
