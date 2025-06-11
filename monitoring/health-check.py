"""
Advanced Health Check System for E-con News Terminal v2.024
Comprehensive monitoring endpoint optimized for terminal interface
Based on latest Flask health check best practices (2024-2025)

Sources: APIPark (2025), Index.dev (2024), Flask-SocketIO docs
Terminal-style health monitoring with brutalist aesthetic
"""

import time
import psutil
import os
import sys
import asyncio
import aiohttp
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
import json
import logging
from flask import Blueprint, jsonify, request
import threading
from collections import defaultdict, deque

# Import application modules
try:
    from config.memory_optimizer import get_memory_optimizer
    from utils.cache_manager import get_cache_manager
    INTERNAL_MODULES_AVAILABLE = True
except ImportError:
    INTERNAL_MODULES_AVAILABLE = False

logger = logging.getLogger(__name__)

# ===============================
# HEALTH CHECK DATA STRUCTURES
# ===============================

@dataclass
class HealthMetric:
    """Terminal-style health metric with brutalist formatting"""
    name: str
    value: Any
    status: str  # ONLINE, WARNING, CRITICAL, OFFLINE
    timestamp: float
    unit: Optional[str] = None
    threshold_warning: Optional[float] = None
    threshold_critical: Optional[float] = None
    details: Optional[str] = None
    
    def to_terminal_format(self) -> str:
        """Format metric for terminal display"""
        status_icon = {
            'ONLINE': '✅',
            'WARNING': '⚠️', 
            'CRITICAL': '🚨',
            'OFFLINE': '❌'
        }.get(self.status, '⚪')
        
        value_str = f"{self.value}{self.unit or ''}"
        timestamp_str = datetime.fromtimestamp(self.timestamp).strftime("%H:%M:%S")
        
        return f"├─ {status_icon} {self.name}: {value_str} [{self.status}] ({timestamp_str})"

@dataclass
class SystemStatus:
    """System-wide health status for terminal interface"""
    overall_status: str
    uptime_seconds: float
    total_checks: int
    failed_checks: int
    last_check: float
    system_load: float
    memory_usage_mb: float
    active_connections: int
    error_rate: float
    
    def to_terminal_report(self) -> str:
        """Generate terminal-style status report"""
        uptime_formatted = f"{int(self.uptime_seconds//3600)}h {int((self.uptime_seconds%3600)//60)}m"
        success_rate = ((self.total_checks - self.failed_checks) / max(self.total_checks, 1)) * 100
        
        return f"""SYSTEM HEALTH REPORT - TERMINAL v2.024
[{datetime.now().strftime('%Y.%m.%d_%H:%M:%S')}]

├─ OVERALL_STATUS: {self.overall_status}
├─ SYSTEM_UPTIME: {uptime_formatted}
├─ HEALTH_CHECKS: {self.total_checks} total, {self.failed_checks} failed
├─ SUCCESS_RATE: {success_rate:.1f}%
├─ SYSTEM_LOAD: {self.system_load}%
├─ MEMORY_USAGE: {self.memory_usage_mb:.1f}MB
├─ CONNECTIONS: {self.active_connections}
├─ ERROR_RATE: {self.error_rate:.2f}%
└─ LAST_CHECK: {datetime.fromtimestamp(self.last_check).strftime('%H:%M:%S')}"""

# ===============================
# HEALTH CHECK ENGINE
# ===============================

class TerminalHealthMonitor:
    """
    Advanced health monitoring system with terminal aesthetics
    Features: Real-time monitoring, brutalist reporting, memory-aware checks
    """
    
    def __init__(self, app=None):
        self.app = app
        self.start_time = time.time()
        self.checks_registry = {}
        self.metrics_history = defaultdict(lambda: deque(maxlen=100))
        self.alert_handlers = []
        self.monitoring_active = False
        self.monitoring_thread = None
        
        # Health statistics
        self.stats = {
            'total_checks': 0,
            'failed_checks': 0,
            'last_check': time.time(),
            'check_intervals': deque(maxlen=50),
            'alert_count': 0
        }
        
        # Terminal monitoring config
        self.config = {
            'check_interval': 30,  # seconds
            'history_retention': 3600,  # 1 hour
            'memory_warning_threshold': 0.8,
            'memory_critical_threshold': 0.9,
            'response_time_warning': 1000,  # ms
            'response_time_critical': 3000,  # ms
            'enable_background_monitoring': True
        }
        
        # Register default checks
        self._register_default_checks()
        
        if app:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize with Flask application"""
        self.app = app
        
        # Create health check blueprint
        health_bp = Blueprint('health', __name__)
        
        @health_bp.route('/health', methods=['GET'])
        def health_check():
            return self.comprehensive_health_check()
        
        @health_bp.route('/health/status', methods=['GET'])
        def health_status():
            return self.get_system_status()
        
        @health_bp.route('/health/metrics', methods=['GET'])
        def health_metrics():
            return self.get_detailed_metrics()
        
        @health_bp.route('/health/terminal', methods=['GET'])
        def health_terminal():
            return self.get_terminal_report()
        
        app.register_blueprint(health_bp)
        
        # Start background monitoring
        if self.config['enable_background_monitoring']:
            self.start_monitoring()
        
        logger.info("🏥 Terminal Health Monitor initialized")
    
    def _register_default_checks(self):
        """Register essential health checks"""
        self.register_check('system_memory', self._check_system_memory)
        self.register_check('cpu_usage', self._check_cpu_usage)
        self.register_check('disk_space', self._check_disk_space)
        self.register_check('python_process', self._check_python_process)
        
        if INTERNAL_MODULES_AVAILABLE:
            self.register_check('memory_optimizer', self._check_memory_optimizer)
            self.register_check('cache_manager', self._check_cache_manager)
        
        # Application-specific checks
        self.register_check('flask_app', self._check_flask_app)
        self.register_check('response_time', self._check_response_time)
    
    def register_check(self, name: str, check_func: callable, 
                      warning_threshold: float = None, 
                      critical_threshold: float = None):
        """Register custom health check"""
        self.checks_registry[name] = {
            'func': check_func,
            'warning_threshold': warning_threshold,
            'critical_threshold': critical_threshold,
            'last_run': 0,
            'failure_count': 0
        }
        logger.info(f"🔧 Registered health check: {name}")
    
    async def run_all_checks(self) -> Dict[str, HealthMetric]:
        """Execute all registered health checks asynchronously"""
        results = {}
        check_start = time.time()
        
        for check_name, check_config in self.checks_registry.items():
            try:
                # Execute check
                metric = await self._execute_check(check_name, check_config)
                results[check_name] = metric
                
                # Update history
                self.metrics_history[check_name].append(metric)
                
                # Check thresholds and trigger alerts
                if metric.status in ['WARNING', 'CRITICAL']:
                    await self._trigger_alert(metric)
                
                check_config['last_run'] = time.time()
                self.stats['total_checks'] += 1
                
            except Exception as e:
                logger.error(f"Health check failed for {check_name}: {e}")
                check_config['failure_count'] += 1
                self.stats['failed_checks'] += 1
                
                # Create failure metric
                results[check_name] = HealthMetric(
                    name=check_name,
                    value="ERROR",
                    status="CRITICAL",
                    timestamp=time.time(),
                    details=str(e)
                )
        
        # Update timing stats
        check_duration = time.time() - check_start
        self.stats['check_intervals'].append(check_duration)
        self.stats['last_check'] = time.time()
        
        return results
    
    async def _execute_check(self, name: str, config: Dict) -> HealthMetric:
        """Execute individual health check with error handling"""
        try:
            if asyncio.iscoroutinefunction(config['func']):
                result = await config['func']()
            else:
                result = config['func']()
            
            # Handle different return types
            if isinstance(result, HealthMetric):
                return result
            elif isinstance(result, dict):
                return HealthMetric(name=name, **result)
            elif isinstance(result, tuple):
                value, status = result
                return HealthMetric(
                    name=name,
                    value=value,
                    status=status,
                    timestamp=time.time()
                )
            else:
                return HealthMetric(
                    name=name,
                    value=result,
                    status="ONLINE",
                    timestamp=time.time()
                )
                
        except Exception as e:
            return HealthMetric(
                name=name,
                value="ERROR",
                status="CRITICAL", 
                timestamp=time.time(),
                details=str(e)
            )
    
    # ===============================
    # DEFAULT HEALTH CHECKS
    # ===============================
    
    def _check_system_memory(self) -> HealthMetric:
        """Check system memory usage"""
        memory = psutil.virtual_memory()
        percent = memory.percent
        
        status = "ONLINE"
        if percent > 90:
            status = "CRITICAL"
        elif percent > 75:
            status = "WARNING"
        
        return HealthMetric(
            name="SYSTEM_MEMORY",
            value=percent,
            status=status,
            timestamp=time.time(),
            unit="%",
            threshold_warning=75,
            threshold_critical=90,
            details=f"Used: {memory.used // 1024 // 1024}MB / {memory.total // 1024 // 1024}MB"
        )
    
    def _check_cpu_usage(self) -> HealthMetric:
        """Check CPU usage"""
        cpu_percent = psutil.cpu_percent(interval=1)
        
        status = "ONLINE"
        if cpu_percent > 85:
            status = "CRITICAL"
        elif cpu_percent > 70:
            status = "WARNING"
        
        return HealthMetric(
            name="CPU_USAGE",
            value=cpu_percent,
            status=status,
            timestamp=time.time(),
            unit="%",
            threshold_warning=70,
            threshold_critical=85
        )
    
    def _check_disk_space(self) -> HealthMetric:
        """Check disk space usage"""
        disk = psutil.disk_usage('/')
        percent = (disk.used / disk.total) * 100
        
        status = "ONLINE"
        if percent > 90:
            status = "CRITICAL"
        elif percent > 80:
            status = "WARNING"
        
        return HealthMetric(
            name="DISK_SPACE",
            value=percent,
            status=status,
            timestamp=time.time(),
            unit="%",
            threshold_warning=80,
            threshold_critical=90,
            details=f"Free: {(disk.free // 1024 // 1024 // 1024)}GB"
        )
    
    def _check_python_process(self) -> HealthMetric:
        """Check Python process health"""
        process = psutil.Process()
        memory_mb = process.memory_info().rss / 1024 / 1024
        cpu_percent = process.cpu_percent()
        
        status = "ONLINE"
        if memory_mb > 400:  # 400MB limit for Render.com
            status = "CRITICAL"
        elif memory_mb > 300:
            status = "WARNING"
        
        return HealthMetric(
            name="PYTHON_PROCESS",
            value=memory_mb,
            status=status,
            timestamp=time.time(),
            unit="MB",
            threshold_warning=300,
            threshold_critical=400,
            details=f"CPU: {cpu_percent}%, Threads: {process.num_threads()}"
        )
    
    def _check_flask_app(self) -> HealthMetric:
        """Check Flask application health"""
        if not self.app:
            return HealthMetric(
                name="FLASK_APP",
                value="NOT_INITIALIZED",
                status="WARNING",
                timestamp=time.time()
            )
        
        try:
            # Check if app is responding
            with self.app.test_client() as client:
                response = client.get('/health')
                
            status = "ONLINE" if response.status_code == 200 else "WARNING"
            
            return HealthMetric(
                name="FLASK_APP",
                value=response.status_code,
                status=status,
                timestamp=time.time(),
                details=f"Response: {response.status_code}"
            )
            
        except Exception as e:
            return HealthMetric(
                name="FLASK_APP",
                value="ERROR",
                status="CRITICAL",
                timestamp=time.time(),
                details=str(e)
            )
    
    async def _check_response_time(self) -> HealthMetric:
        """Check application response time"""
        if not self.app:
            return HealthMetric(
                name="RESPONSE_TIME",
                value=0,
                status="WARNING",
                timestamp=time.time(),
                details="App not available for testing"
            )
        
        try:
            start_time = time.time()
            
            # Test local response time
            with self.app.test_client() as client:
                response = client.get('/')
            
            response_time_ms = (time.time() - start_time) * 1000
            
            status = "ONLINE"
            if response_time_ms > self.config['response_time_critical']:
                status = "CRITICAL"
            elif response_time_ms > self.config['response_time_warning']:
                status = "WARNING"
            
            return HealthMetric(
                name="RESPONSE_TIME",
                value=response_time_ms,
                status=status,
                timestamp=time.time(),
                unit="ms",
                threshold_warning=self.config['response_time_warning'],
                threshold_critical=self.config['response_time_critical']
            )
            
        except Exception as e:
            return HealthMetric(
                name="RESPONSE_TIME",
                value=0,
                status="CRITICAL",
                timestamp=time.time(),
                details=str(e)
            )
    
    def _check_memory_optimizer(self) -> HealthMetric:
        """Check memory optimizer status"""
        try:
            optimizer = get_memory_optimizer()
            stats = optimizer.get_terminal_stats()
            
            status = "ONLINE"
            if stats['pressure_level'] == 'CRITICAL':
                status = "CRITICAL"
            elif stats['pressure_level'] == 'WARNING':
                status = "WARNING"
            
            return HealthMetric(
                name="MEMORY_OPTIMIZER",
                value=stats['memory_mb'],
                status=status,
                timestamp=time.time(),
                unit="MB",
                details=f"Pressure: {stats['pressure_level']}, GC: {stats['gc_collections']}"
            )
            
        except Exception as e:
            return HealthMetric(
                name="MEMORY_OPTIMIZER",
                value="ERROR",
                status="WARNING",
                timestamp=time.time(),
                details=str(e)
            )
    
    def _check_cache_manager(self) -> HealthMetric:
        """Check cache manager status"""
        try:
            cache = get_cache_manager()
            stats = cache.get_stats()
            
            status = "ONLINE"
            if stats['memory_usage_percent'] > 90:
                status = "CRITICAL"
            elif stats['memory_usage_percent'] > 75:
                status = "WARNING"
            
            return HealthMetric(
                name="CACHE_MANAGER",
                value=stats['entries'],
                status=status,
                timestamp=time.time(),
                unit=" entries",
                details=f"Memory: {stats['memory_usage_percent']:.1f}%, Hit Rate: {stats['hit_rate_percent']:.1f}%"
            )
            
        except Exception as e:
            return HealthMetric(
                name="CACHE_MANAGER",
                value="ERROR",
                status="WARNING",
                timestamp=time.time(),
                details=str(e)
            )
    
    # ===============================
    # MONITORING & ALERTS
    # ===============================
    
    def start_monitoring(self):
        """Start background health monitoring"""
        if self.monitoring_active:
            return
        
        self.monitoring_active = True
        self.monitoring_thread = threading.Thread(target=self._monitoring_loop, daemon=True)
        self.monitoring_thread.start()
        logger.info("🔄 Background health monitoring started")
    
    def stop_monitoring(self):
        """Stop background health monitoring"""
        self.monitoring_active = False
        if self.monitoring_thread:
            self.monitoring_thread.join(timeout=5)
        logger.info("⏹️ Background health monitoring stopped")
    
    def _monitoring_loop(self):
        """Background monitoring loop"""
        while self.monitoring_active:
            try:
                # Run health checks
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                
                results = loop.run_until_complete(self.run_all_checks())
                
                # Log critical issues
                critical_issues = [
                    metric for metric in results.values() 
                    if metric.status == 'CRITICAL'
                ]
                
                if critical_issues:
                    logger.warning(f"🚨 {len(critical_issues)} critical health issues detected")
                
                loop.close()
                
            except Exception as e:
                logger.error(f"Health monitoring error: {e}")
            
            time.sleep(self.config['check_interval'])
    
    async def _trigger_alert(self, metric: HealthMetric):
        """Trigger alert for health issue"""
        self.stats['alert_count'] += 1
        
        alert_data = {
            'metric': asdict(metric),
            'timestamp': datetime.now().isoformat(),
            'alert_id': f"alert_{int(time.time())}"
        }
        
        for handler in self.alert_handlers:
            try:
                if asyncio.iscoroutinefunction(handler):
                    await handler(alert_data)
                else:
                    handler(alert_data)
            except Exception as e:
                logger.error(f"Alert handler error: {e}")
    
    def add_alert_handler(self, handler: callable):
        """Add custom alert handler"""
        self.alert_handlers.append(handler)
        logger.info(f"📢 Alert handler registered: {handler.__name__}")
    
    # ===============================
    # API ENDPOINTS
    # ===============================
    
    def comprehensive_health_check(self):
        """Main health check endpoint"""
        try:
            # Run synchronous version of checks
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            results = loop.run_until_complete(self.run_all_checks())
            loop.close()
            
            # Determine overall status
            statuses = [metric.status for metric in results.values()]
            if 'CRITICAL' in statuses:
                overall_status = 'CRITICAL'
                http_status = 503
            elif 'WARNING' in statuses:
                overall_status = 'WARNING'
                http_status = 200
            else:
                overall_status = 'ONLINE'
                http_status = 200
            
            # Build response
            response_data = {
                'status': overall_status,
                'timestamp': datetime.now().isoformat(),
                'uptime_seconds': time.time() - self.start_time,
                'checks': {name: asdict(metric) for name, metric in results.items()},
                'summary': {
                    'total_checks': len(results),
                    'online': sum(1 for m in results.values() if m.status == 'ONLINE'),
                    'warning': sum(1 for m in results.values() if m.status == 'WARNING'),
                    'critical': sum(1 for m in results.values() if m.status == 'CRITICAL'),
                    'offline': sum(1 for m in results.values() if m.status == 'OFFLINE')
                },
                'version': 'v2.024',
                'node': os.getenv('RENDER_INSTANCE_ID', 'local')
            }
            
            return jsonify(response_data), http_status
            
        except Exception as e:
            logger.error(f"Health check error: {e}")
            return jsonify({
                'status': 'CRITICAL',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }), 503
    
    def get_system_status(self):
        """Get system status summary"""
        uptime = time.time() - self.start_time
        memory = psutil.virtual_memory()
        cpu = psutil.cpu_percent()
        
        status = SystemStatus(
            overall_status="ONLINE",
            uptime_seconds=uptime,
            total_checks=self.stats['total_checks'],
            failed_checks=self.stats['failed_checks'],
            last_check=self.stats['last_check'],
            system_load=cpu,
            memory_usage_mb=memory.used / 1024 / 1024,
            active_connections=len(psutil.net_connections()),
            error_rate=(self.stats['failed_checks'] / max(self.stats['total_checks'], 1)) * 100
        )
        
        return jsonify(asdict(status))
    
    def get_detailed_metrics(self):
        """Get detailed metrics with history"""
        metrics_data = {}
        
        for check_name, history in self.metrics_history.items():
            if history:
                latest = history[-1]
                metrics_data[check_name] = {
                    'latest': asdict(latest),
                    'history_count': len(history),
                    'avg_value': sum(m.value for m in history if isinstance(m.value, (int, float))) / max(len(history), 1),
                    'failure_rate': sum(1 for m in history if m.status in ['CRITICAL', 'OFFLINE']) / len(history) * 100
                }
        
        return jsonify({
            'metrics': metrics_data,
            'collection_stats': {
                'total_checks': self.stats['total_checks'],
                'failed_checks': self.stats['failed_checks'],
                'alert_count': self.stats['alert_count'],
                'avg_check_duration': sum(self.stats['check_intervals']) / max(len(self.stats['check_intervals']), 1) if self.stats['check_intervals'] else 0
            },
            'timestamp': datetime.now().isoformat()
        })
    
    def get_terminal_report(self):
        """Get terminal-formatted health report"""
        try:
            # Quick sync check
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            results = loop.run_until_complete(self.run_all_checks())
            loop.close()
            
            # Generate terminal report
            report_lines = [
                "🖥️ TERMINAL HEALTH DIAGNOSTICS v2.024",
                "═" * 60,
                f"TIMESTAMP: {datetime.now().strftime('%Y.%m.%d_%H:%M:%S')}",
                f"NODE_ID: {os.getenv('RENDER_INSTANCE_ID', 'local')}",
                f"UPTIME: {int((time.time() - self.start_time)//3600)}h {int(((time.time() - self.start_time)%3600)//60)}m",
                "",
                "SYSTEM_HEALTH_MATRIX:",
            ]
            
            # Add metrics in terminal format
            for metric in results.values():
                report_lines.append(metric.to_terminal_format())
            
            # Add summary
            online_count = sum(1 for m in results.values() if m.status == 'ONLINE')
            warning_count = sum(1 for m in results.values() if m.status == 'WARNING')
            critical_count = sum(1 for m in results.values() if m.status == 'CRITICAL')
            
            report_lines.extend([
                "",
                "SUMMARY_STATISTICS:",
                f"├─ ✅ ONLINE: {online_count}",
                f"├─ ⚠️ WARNING: {warning_count}",
                f"├─ 🚨 CRITICAL: {critical_count}",
                f"├─ 📊 SUCCESS_RATE: {((len(results) - critical_count) / len(results) * 100):.1f}%",
                f"└─ 🔄 MONITORING: {'ACTIVE' if self.monitoring_active else 'INACTIVE'}",
                "",
                "═" * 60,
                "[END_TERMINAL_HEALTH_REPORT]"
            ])
            
            return {
                'content_type': 'text/plain',
                'body': '\n'.join(report_lines)
            }, 200
            
        except Exception as e:
            return {
                'content_type': 'text/plain', 
                'body': f"TERMINAL_HEALTH_ERROR: {str(e)}"
            }, 500

# ===============================
# GLOBAL HEALTH MONITOR INSTANCE
# ===============================

# Global instance for easy access
_global_health_monitor = None

def get_health_monitor() -> TerminalHealthMonitor:
    """Get or create global health monitor instance"""
    global _global_health_monitor
    
    if _global_health_monitor is None:
        _global_health_monitor = TerminalHealthMonitor()
    
    return _global_health_monitor

def setup_health_monitoring(app):
    """Setup health monitoring for Flask app"""
    monitor = get_health_monitor()
    monitor.init_app(app)
    
    # Add custom alert handler for logging
    def log_alert_handler(alert_data):
        metric = alert_data['metric']
        app.logger.warning(f"🚨 Health Alert: {metric['name']} is {metric['status']} - {metric['value']}")
    
    monitor.add_alert_handler(log_alert_handler)
    
    # Store reference in app
    app.health_monitor = monitor
    
    logger.info("🏥 Health monitoring setup complete")
    return monitor

# ===============================
# TERMINAL COMMAND INTEGRATION
# ===============================

def execute_health_command(command: str, args: List[str] = None) -> str:
    """Execute health-related terminal commands"""
    monitor = get_health_monitor()
    args = args or []
    
    if command == 'status':
        # Quick health status
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        results = loop.run_until_complete(monitor.run_all_checks())
        loop.close()
        
        online = sum(1 for m in results.values() if m.status == 'ONLINE')
        total = len(results)
        
        return f"Health Status: {online}/{total} systems ONLINE"
    
    elif command == 'report':
        # Full terminal report
        report_data, status_code = monitor.get_terminal_report()
        return report_data['body']
    
    elif command == 'monitor':
        if 'start' in args:
            monitor.start_monitoring()
            return "Background health monitoring started"
        elif 'stop' in args:
            monitor.stop_monitoring()
            return "Background health monitoring stopped"
        else:
            status = "ACTIVE" if monitor.monitoring_active else "INACTIVE"
            return f"Health monitoring status: {status}"
    
    elif command == 'check':
        # Run specific check
        if args:
            check_name = args[0]
            if check_name in monitor.checks_registry:
                try:
                    metric = monitor.checks_registry[check_name]['func']()
                    return f"{check_name}: {metric.value} [{metric.status}]"
                except Exception as e:
                    return f"{check_name}: ERROR - {str(e)}"
            else:
                return f"Check not found: {check_name}"
        else:
            return f"Available checks: {', '.join(monitor.checks_registry.keys())}"
    
    else:
        return "Health commands: status, report, monitor [start|stop], check [name]"

if __name__ == "__main__":
    # Test the health monitor
    monitor = TerminalHealthMonitor()
    
    # Run test checks
    import asyncio
    loop = asyncio.get_event_loop()
    results = loop.run_until_complete(monitor.run_all_checks())
    
    # Display results
    for name, metric in results.items():
        print(metric.to_terminal_format())
