"""
Memory Optimizer for E-con News Terminal v2.024
Smart memory management utilities for 512MB RAM environments
Designed specifically for Render.com free tier limitations
"""

import gc
import os
import sys
import time
import psutil
import logging
from typing import Dict, List, Optional, Callable, Any
from functools import wraps
from datetime import datetime, timedelta
import threading
from collections import defaultdict, deque

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MemoryOptimizer:
    """
    Advanced memory management system for terminal application
    Optimized for 512MB RAM constraint with brutalist efficiency
    """
    
    def __init__(self, max_memory_mb: int = 400, warning_threshold: float = 0.8):
        self.max_memory_mb = max_memory_mb
        self.warning_threshold = warning_threshold
        self.critical_threshold = 0.9
        
        # Memory tracking
        self.process = psutil.Process()
        self.memory_history = deque(maxlen=100)  # Last 100 memory readings
        self.gc_stats = {'collections': 0, 'freed_objects': 0, 'last_gc': None}
        
        # Cache management
        self.cache_registry = {}
        self.cache_priorities = defaultdict(int)
        self.cache_access_times = defaultdict(float)
        
        # Memory alerts
        self.alert_callbacks = []
        self.last_warning_time = 0
        self.warning_cooldown = 60  # seconds
        
        # Background monitoring
        self.monitoring_active = False
        self.monitoring_thread = None
        self.monitoring_interval = 10  # seconds
        
        # Performance metrics
        self.metrics = {
            'peak_memory': 0,
            'gc_triggers': 0,
            'cache_evictions': 0,
            'memory_warnings': 0,
            'optimization_runs': 0
        }
        
        logger.info(f"🧠 Memory Optimizer initialized - Max: {max_memory_mb}MB, Warning: {warning_threshold*100}%")
    
    def get_memory_usage(self) -> Dict[str, float]:
        """Get current memory usage statistics"""
        try:
            memory_info = self.process.memory_info()
            memory_mb = memory_info.rss / 1024 / 1024
            memory_percent = self.process.memory_percent()
            
            # Update history
            self.memory_history.append({
                'timestamp': time.time(),
                'memory_mb': memory_mb,
                'memory_percent': memory_percent
            })
            
            # Update peak memory
            if memory_mb > self.metrics['peak_memory']:
                self.metrics['peak_memory'] = memory_mb
            
            return {
                'memory_mb': round(memory_mb, 2),
                'memory_percent': round(memory_percent, 2),
                'max_memory_mb': self.max_memory_mb,
                'usage_ratio': round(memory_mb / self.max_memory_mb, 3),
                'available_mb': round(self.max_memory_mb - memory_mb, 2)
            }
        except Exception as e:
            logger.error(f"Error getting memory usage: {e}")
            return {'memory_mb': 0, 'memory_percent': 0, 'usage_ratio': 0, 'available_mb': self.max_memory_mb}
    
    def check_memory_pressure(self) -> str:
        """Check current memory pressure level"""
        usage = self.get_memory_usage()
        ratio = usage['usage_ratio']
        
        if ratio >= self.critical_threshold:
            return 'CRITICAL'
        elif ratio >= self.warning_threshold:
            return 'WARNING'
        elif ratio >= 0.6:
            return 'MODERATE'
        else:
            return 'NORMAL'
    
    def force_garbage_collection(self) -> Dict[str, int]:
        """Force garbage collection with statistics"""
        start_time = time.time()
        start_memory = self.get_memory_usage()['memory_mb']
        
        # Force GC for all generations
        collected = []
        for generation in range(3):
            collected.append(gc.collect(generation))
        
        end_memory = self.get_memory_usage()['memory_mb']
        freed_mb = start_memory - end_memory
        gc_time = time.time() - start_time
        
        # Update statistics
        self.gc_stats['collections'] += 1
        self.gc_stats['freed_objects'] += sum(collected)
        self.gc_stats['last_gc'] = datetime.now()
        self.metrics['gc_triggers'] += 1
        
        result = {
            'freed_mb': round(freed_mb, 2),
            'freed_objects': sum(collected),
            'gc_time_ms': round(gc_time * 1000, 2),
            'collections_per_gen': collected
        }
        
        logger.info(f"🗑️ GC completed: {result['freed_mb']}MB freed, {result['freed_objects']} objects")
        return result
    
    def register_cache(self, name: str, cache_object: Any, priority: int = 1, 
                      max_size: Optional[int] = None, cleanup_func: Optional[Callable] = None):
        """Register a cache for memory management"""
        self.cache_registry[name] = {
            'object': cache_object,
            'priority': priority,
            'max_size': max_size,
            'cleanup_func': cleanup_func or (lambda: cache_object.clear() if hasattr(cache_object, 'clear') else None),
            'last_access': time.time(),
            'access_count': 0
        }
        
        self.cache_priorities[name] = priority
        logger.info(f"📋 Cache registered: {name} (priority: {priority})")
    
    def access_cache(self, name: str):
        """Record cache access for LRU tracking"""
        if name in self.cache_registry:
            self.cache_registry[name]['last_access'] = time.time()
            self.cache_registry[name]['access_count'] += 1
            self.cache_access_times[name] = time.time()
    
    def cleanup_caches(self, aggressive: bool = False) -> Dict[str, int]:
        """Clean up caches based on priority and memory pressure"""
        cleaned_caches = []
        total_freed = 0
        
        # Sort caches by priority (lower = cleaned first) and last access time
        cache_items = sorted(
            self.cache_registry.items(),
            key=lambda x: (x[1]['priority'], -x[1]['last_access'])
        )
        
        memory_pressure = self.check_memory_pressure()
        
        for cache_name, cache_info in cache_items:
            should_clean = False
            
            # Aggressive cleanup
            if aggressive:
                should_clean = True
            # High memory pressure - clean low priority caches
            elif memory_pressure in ['CRITICAL', 'WARNING'] and cache_info['priority'] <= 2:
                should_clean = True
            # Moderate pressure - clean lowest priority only
            elif memory_pressure == 'MODERATE' and cache_info['priority'] == 1:
                should_clean = True
            # Clean old caches (not accessed in 10 minutes)
            elif time.time() - cache_info['last_access'] > 600:
                should_clean = True
            
            if should_clean:
                try:
                    before_size = self._get_cache_size(cache_info['object'])
                    cache_info['cleanup_func']()
                    after_size = self._get_cache_size(cache_info['object'])
                    
                    freed = before_size - after_size
                    total_freed += freed
                    cleaned_caches.append(cache_name)
                    
                    logger.info(f"🧹 Cleaned cache: {cache_name} ({freed} items)")
                    
                except Exception as e:
                    logger.error(f"Error cleaning cache {cache_name}: {e}")
        
        self.metrics['cache_evictions'] += len(cleaned_caches)
        
        return {
            'cleaned_caches': cleaned_caches,
            'total_freed': total_freed,
            'memory_pressure': memory_pressure
        }
    
    def _get_cache_size(self, cache_object: Any) -> int:
        """Get approximate size of cache object"""
        try:
            if hasattr(cache_object, '__len__'):
                return len(cache_object)
            elif hasattr(cache_object, 'size'):
                return cache_object.size
            elif isinstance(cache_object, dict):
                return len(cache_object)
            else:
                return 0
        except:
            return 0
    
    def optimize_memory(self, aggressive: bool = False) -> Dict[str, Any]:
        """Comprehensive memory optimization"""
        start_time = time.time()
        start_memory = self.get_memory_usage()
        
        self.metrics['optimization_runs'] += 1
        
        # Step 1: Force garbage collection
        gc_result = self.force_garbage_collection()
        
        # Step 2: Clean up caches
        cache_result = self.cleanup_caches(aggressive=aggressive)
        
        # Step 3: Additional optimizations for critical memory pressure
        if start_memory['usage_ratio'] >= self.critical_threshold:
            self._critical_memory_optimization()
        
        end_memory = self.get_memory_usage()
        optimization_time = time.time() - start_time
        
        result = {
            'start_memory_mb': start_memory['memory_mb'],
            'end_memory_mb': end_memory['memory_mb'],
            'freed_mb': round(start_memory['memory_mb'] - end_memory['memory_mb'], 2),
            'optimization_time_ms': round(optimization_time * 1000, 2),
            'gc_result': gc_result,
            'cache_result': cache_result,
            'memory_pressure_before': self.check_memory_pressure(),
            'memory_pressure_after': self.check_memory_pressure()
        }
        
        logger.info(f"⚡ Memory optimization completed: {result['freed_mb']}MB freed in {result['optimization_time_ms']}ms")
        return result
    
    def _critical_memory_optimization(self):
        """Emergency memory optimization for critical situations"""
        logger.warning("🚨 CRITICAL MEMORY PRESSURE - Emergency optimization")
        
        # Force aggressive cleanup
        self.cleanup_caches(aggressive=True)
        
        # Multiple GC passes
        for _ in range(3):
            gc.collect()
        
        # Clear import caches
        if hasattr(sys, '_clear_type_cache'):
            sys._clear_type_cache()
        
        # Clear any global caches we know about
        self._clear_global_caches()
    
    def _clear_global_caches(self):
        """Clear global application caches"""
        try:
            # Clear global seen articles cache
            import app
            if hasattr(app, 'global_seen_articles'):
                before_size = len(app.global_seen_articles)
                app.global_seen_articles.clear()
                logger.info(f"🧹 Cleared global_seen_articles cache: {before_size} items")
            
            # Clear user caches
            if hasattr(app, 'user_news_cache'):
                before_size = len(app.user_news_cache)
                app.user_news_cache.clear()
                logger.info(f"🧹 Cleared user_news_cache: {before_size} items")
                
        except Exception as e:
            logger.error(f"Error clearing global caches: {e}")
    
    def add_alert_callback(self, callback: Callable[[str, Dict], None]):
        """Add callback for memory alerts"""
        self.alert_callbacks.append(callback)
    
    def _trigger_memory_alert(self, level: str, memory_info: Dict):
        """Trigger memory alert callbacks"""
        current_time = time.time()
        
        # Cooldown to prevent spam
        if current_time - self.last_warning_time < self.warning_cooldown:
            return
        
        self.last_warning_time = current_time
        self.metrics['memory_warnings'] += 1
        
        for callback in self.alert_callbacks:
            try:
                callback(level, memory_info)
            except Exception as e:
                logger.error(f"Error in memory alert callback: {e}")
    
    def start_monitoring(self):
        """Start background memory monitoring"""
        if self.monitoring_active:
            return
        
        self.monitoring_active = True
        self.monitoring_thread = threading.Thread(target=self._monitoring_loop, daemon=True)
        self.monitoring_thread.start()
        
        logger.info("📊 Background memory monitoring started")
    
    def stop_monitoring(self):
        """Stop background memory monitoring"""
        self.monitoring_active = False
        if self.monitoring_thread:
            self.monitoring_thread.join(timeout=5)
        
        logger.info("📊 Background memory monitoring stopped")
    
    def _monitoring_loop(self):
        """Background monitoring loop"""
        while self.monitoring_active:
            try:
                memory_info = self.get_memory_usage()
                pressure = self.check_memory_pressure()
                
                # Auto-optimize on high pressure
                if pressure == 'CRITICAL':
                    logger.warning("🚨 Auto-triggering memory optimization due to critical pressure")
                    self.optimize_memory(aggressive=True)
                    self._trigger_memory_alert('CRITICAL', memory_info)
                    
                elif pressure == 'WARNING':
                    self.optimize_memory(aggressive=False)
                    self._trigger_memory_alert('WARNING', memory_info)
                
                # Sleep before next check
                time.sleep(self.monitoring_interval)
                
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                time.sleep(self.monitoring_interval)
    
    def get_memory_report(self) -> str:
        """Generate comprehensive memory report"""
        memory_info = self.get_memory_usage()
        pressure = self.check_memory_pressure()
        
        # Calculate averages from history
        if self.memory_history:
            avg_memory = sum(h['memory_mb'] for h in self.memory_history) / len(self.memory_history)
            max_memory = max(h['memory_mb'] for h in self.memory_history)
        else:
            avg_memory = memory_info['memory_mb']
            max_memory = memory_info['memory_mb']
        
        report = f"""
MEMORY OPTIMIZATION REPORT - Terminal v2.024
═══════════════════════════════════════════

CURRENT STATUS:
├─ Memory Usage: {memory_info['memory_mb']}MB / {self.max_memory_mb}MB
├─ Usage Ratio: {memory_info['usage_ratio']:.1%}
├─ Available: {memory_info['available_mb']}MB
├─ Pressure Level: {pressure}
└─ Peak Memory: {self.metrics['peak_memory']:.1f}MB

HISTORICAL DATA:
├─ Average Usage: {avg_memory:.1f}MB
├─ Peak Usage: {max_memory:.1f}MB
├─ History Entries: {len(self.memory_history)}
└─ Monitoring: {'ACTIVE' if self.monitoring_active else 'INACTIVE'}

GARBAGE COLLECTION:
├─ Total Collections: {self.gc_stats['collections']}
├─ Objects Freed: {self.gc_stats['freed_objects']:,}
├─ GC Triggers: {self.metrics['gc_triggers']}
└─ Last GC: {self.gc_stats['last_gc'] or 'Never'}

CACHE MANAGEMENT:
├─ Registered Caches: {len(self.cache_registry)}
├─ Cache Evictions: {self.metrics['cache_evictions']}
├─ Active Caches: {', '.join(self.cache_registry.keys()) if self.cache_registry else 'None'}
└─ Cache Priorities: {dict(self.cache_priorities) if self.cache_priorities else 'None'}

OPTIMIZATION METRICS:
├─ Optimization Runs: {self.metrics['optimization_runs']}
├─ Memory Warnings: {self.metrics['memory_warnings']}
├─ Alert Callbacks: {len(self.alert_callbacks)}
└─ Warning Threshold: {self.warning_threshold:.1%}

SYSTEM INFORMATION:
├─ Process ID: {self.process.pid}
├─ CPU Usage: {self.process.cpu_percent():.1f}%
├─ Thread Count: {self.process.num_threads()}
└─ Open Files: {self.process.num_fds() if hasattr(self.process, 'num_fds') else 'N/A'}
"""
        
        return report.strip()
    
    def get_terminal_stats(self) -> Dict[str, Any]:
        """Get stats formatted for terminal display"""
        memory_info = self.get_memory_usage()
        pressure = self.check_memory_pressure()
        
        return {
            'memory_mb': memory_info['memory_mb'],
            'memory_percent': memory_info['usage_ratio'] * 100,
            'pressure_level': pressure,
            'available_mb': memory_info['available_mb'],
            'gc_collections': self.gc_stats['collections'],
            'cache_count': len(self.cache_registry),
            'optimization_runs': self.metrics['optimization_runs'],
            'monitoring_active': self.monitoring_active,
            'peak_memory': self.metrics['peak_memory']
        }

# Decorator for memory-aware functions
def memory_optimized(threshold: float = 0.8, auto_gc: bool = True):
    """Decorator to automatically optimize memory for functions"""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Get optimizer from global scope
            optimizer = getattr(sys.modules.get('__main__'), 'memory_optimizer', None)
            
            if optimizer:
                # Check memory before execution
                memory_info = optimizer.get_memory_usage()
                if memory_info['usage_ratio'] > threshold:
                    logger.warning(f"🧠 High memory before {func.__name__}: {memory_info['memory_mb']}MB")
                    optimizer.optimize_memory()
                
                # Execute function
                result = func(*args, **kwargs)
                
                # Optional GC after execution
                if auto_gc and memory_info['usage_ratio'] > 0.7:
                    gc.collect()
                
                return result
            else:
                return func(*args, **kwargs)
        
        return wrapper
    return decorator

# Global optimizer instance
_global_optimizer = None

def get_memory_optimizer() -> MemoryOptimizer:
    """Get or create global memory optimizer instance"""
    global _global_optimizer
    
    if _global_optimizer is None:
        # Determine max memory based on environment
        max_memory = int(os.getenv('MAX_MEMORY_MB', '400'))
        
        # Adjust for Render.com free tier
        if os.getenv('RENDER') or os.getenv('PORT'):
            max_memory = min(max_memory, 400)  # Leave 112MB buffer
        
        _global_optimizer = MemoryOptimizer(max_memory_mb=max_memory)
    
    return _global_optimizer

def setup_memory_optimization(app=None, max_memory_mb: int = 400):
    """Setup memory optimization for Flask app"""
    optimizer = get_memory_optimizer()
    
    if app:
        # Register Flask app caches
        if hasattr(app, 'cache'):
            optimizer.register_cache('flask_cache', app.cache, priority=2)
        
        # Add memory alert handler
        def memory_alert_handler(level: str, memory_info: Dict):
            app.logger.warning(f"🚨 Memory Alert [{level}]: {memory_info['memory_mb']}MB used")
        
        optimizer.add_alert_callback(memory_alert_handler)
        
        # Add memory monitoring endpoint
        @app.route('/api/system/memory')
        def memory_status():
            return optimizer.get_terminal_stats()
        
        # Store optimizer reference
        app.memory_optimizer = optimizer
    
    # Start background monitoring
    optimizer.start_monitoring()
    
    logger.info(f"🧠 Memory optimization setup complete - Max: {max_memory_mb}MB")
    return optimizer

# Terminal command integration
def execute_memory_command(command: str, args: List[str] = None) -> str:
    """Execute memory-related terminal commands"""
    optimizer = get_memory_optimizer()
    args = args or []
    
    if command == 'status':
        return optimizer.get_memory_report()
    
    elif command == 'optimize':
        aggressive = 'aggressive' in args or 'force' in args
        result = optimizer.optimize_memory(aggressive=aggressive)
        return f"Memory optimization completed: {result['freed_mb']}MB freed"
    
    elif command == 'gc':
        result = optimizer.force_garbage_collection()
        return f"Garbage collection: {result['freed_mb']}MB freed, {result['freed_objects']} objects"
    
    elif command == 'caches':
        if not optimizer.cache_registry:
            return "No registered caches"
        
        cache_info = []
        for name, info in optimizer.cache_registry.items():
            size = optimizer._get_cache_size(info['object'])
            cache_info.append(f"├─ {name}: {size} items (priority: {info['priority']})")
        
        return "REGISTERED CACHES:\n" + "\n".join(cache_info)
    
    elif command == 'monitor':
        if 'start' in args:
            optimizer.start_monitoring()
            return "Background monitoring started"
        elif 'stop' in args:
            optimizer.stop_monitoring()
            return "Background monitoring stopped"
        else:
            status = "ACTIVE" if optimizer.monitoring_active else "INACTIVE"
            return f"Monitoring status: {status}"
    
    elif command == 'clear':
        result = optimizer.cleanup_caches(aggressive=True)
        return f"Cache cleanup: {len(result['cleaned_caches'])} caches cleared"
    
    else:
        return "Memory commands: status, optimize, gc, caches, monitor [start|stop], clear"

if __name__ == "__main__":
    # Test the memory optimizer
    optimizer = MemoryOptimizer()
    
    # Test memory reporting
    print(optimizer.get_memory_report())
    
    # Test optimization
    result = optimizer.optimize_memory()
    print(f"\nOptimization result: {result}")
