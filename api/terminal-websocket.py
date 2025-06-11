"""
Real-time Terminal WebSocket Backend for E-con News Terminal v2.024
Advanced WebSocket implementation with brutalist terminal interface
Based on Flask-SocketIO and modern WebSocket patterns (2024)

Sources: Flask-SocketIO docs, Miguel Grinberg (2024), VideoSDK WebSocket guide
Features: Real-time command execution, terminal streaming, session management
"""

import asyncio
import json
import time
import uuid
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass, asdict
from collections import defaultdict, deque
import threading
import queue

from flask import Flask, request, session
from flask_socketio import SocketIO, emit, join_room, leave_room, disconnect
import eventlet

# Import application modules
try:
    from monitoring.health_check import get_health_monitor
    APP_MODULES_AVAILABLE = True
except ImportError:
    APP_MODULES_AVAILABLE = False

logger = logging.getLogger(__name__)

# ===============================
# WEBSOCKET DATA STRUCTURES
# ===============================

@dataclass
class TerminalSession:
    """Terminal session with brutalist tracking"""
    session_id: str
    user_id: str
    connected_at: float
    last_activity: float
    command_count: int = 0
    room: Optional[str] = None
    terminal_mode: str = "standard"  # standard, matrix, debug
    permissions: Set[str] = None
    client_info: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.permissions is None:
            self.permissions = {"basic", "news", "ai"}
        if self.client_info is None:
            self.client_info = {}
    
    def update_activity(self):
        """Update last activity timestamp"""
        self.last_activity = time.time()
    
    def session_duration(self) -> float:
        """Get session duration in seconds"""
        return time.time() - self.connected_at
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization"""
        return {
            'session_id': self.session_id,
            'user_id': self.user_id,
            'connected_at': self.connected_at,
            'last_activity': self.last_activity,
            'command_count': self.command_count,
            'session_duration': self.session_duration(),
            'terminal_mode': self.terminal_mode,
            'permissions': list(self.permissions),
            'client_info': self.client_info
        }

@dataclass
class TerminalMessage:
    """Terminal message with formatting"""
    type: str  # command, response, system, error, streaming
    content: str
    timestamp: float
    session_id: str
    metadata: Optional[Dict] = None
    
    def to_terminal_format(self) -> Dict:
        """Format for terminal display"""
        timestamp_str = datetime.fromtimestamp(self.timestamp).strftime("%H:%M:%S")
        
        formatted = {
            'type': self.type,
            'content': self.content,
            'timestamp': timestamp_str,
            'session_id': self.session_id,
            'metadata': self.metadata or {}
        }
        
        # Add terminal-style prefixes
        if self.type == 'command':
            formatted['display'] = f"[{timestamp_str}] user@terminal:~$ {self.content}"
        elif self.type == 'response':
            formatted['display'] = f"[{timestamp_str}] system> {self.content}"
        elif self.type == 'error':
            formatted['display'] = f"[{timestamp_str}] ERROR> {self.content}"
        elif self.type == 'system':
            formatted['display'] = f"[{timestamp_str}] SYSTEM> {self.content}"
        else:
            formatted['display'] = f"[{timestamp_str}] {self.content}"
        
        return formatted

# ===============================
# TERMINAL WEBSOCKET MANAGER
# ===============================

class TerminalWebSocketManager:
    def __init__(self, app: Flask, socketio: SocketIO, terminal_processor):
        self.app = app
        self.socketio = socketio
        self.terminal_processor = terminal_processor
        self.active_sessions: Dict[str, TerminalSession] = {}
        
        # Message history and monitoring
        self.message_history = deque(maxlen=1000)
        self.broadcast_subscribers: Set[str] = set()
        
        # Performance metrics
        self.metrics = {
            'total_connections': 0,
            'active_connections': 0,
            'messages_sent': 0,
            'commands_executed': 0,
            'errors': 0,
            'uptime_start': time.time()
        }
        
        # Background processing
        self.background_processor = None
        self.processing_active = False
        
        # Rate limiting
        self.rate_limits: Dict[str, deque] = defaultdict(lambda: deque(maxlen=10))
        self.rate_limit_window = 60  # seconds
        self.rate_limit_max = 30  # requests per window
        
        if app:
            self.init_app(app)
    
    def __init__(self, app: Flask):
        """Initialize WebSocket manager with Flask app"""
        self.app = app
        
        # Initialize SocketIO with terminal-optimized config
        self.socketio = SocketIO(
            app,
            cors_allowed_origins="*",
            async_mode='eventlet',
            logger=True,
            engineio_logger=False,
            ping_timeout=60,
            ping_interval=25,
            max_http_buffer_size=10000
        )
        
        # Register event handlers
        self.register_handlers()
        
        # Start background processing
        self.start_background_processing()
        
        logger.info("🔌 Terminal WebSocket Manager initialized")
    
    def _register_handlers(self):
        """Register all WebSocket event handlers"""
        
        @self.socketio.on('connect')
        def handle_connect():
            """Handle client connection"""
            try:
                # Create session
                session_id = str(uuid.uuid4())
                user_id = session.get('user_id', str(uuid.uuid4()))
                
                # Get client info
                client_info = {
                    'user_agent': request.headers.get('User-Agent', ''),
                    'remote_addr': request.remote_addr,
                    'referrer': request.headers.get('Referer', ''),
                    'language': request.headers.get('Accept-Language', '')
                }
                
                # Create terminal session
                terminal_session = TerminalSession(
                    session_id=session_id,
                    user_id=user_id,
                    connected_at=time.time(),
                    last_activity=time.time(),
                    client_info=client_info
                )
                
                # Store session
                self.active_sessions[session_id] = terminal_session
                session['terminal_session_id'] = session_id
                
                # Join user to personal room
                join_room(f"user_{user_id}")
                terminal_session.room = f"user_{user_id}"
                
                # Update metrics
                self.metrics['total_connections'] += 1
                self.metrics['active_connections'] += 1
                
                # Send welcome message
                welcome_msg = self._create_welcome_message(terminal_session)
                emit('terminal_message', welcome_msg.to_terminal_format())
                
                # Broadcast connection event
                self._broadcast_system_event('user_connected', {
                    'user_id': user_id,
                    'session_id': session_id,
                    'timestamp': time.time()
                })
                
                logger.info(f"🔌 Terminal connection: {session_id} (user: {user_id})")
                
            except Exception as e:
                logger.error(f"Connection error: {e}")
                emit('error', {'message': 'Connection failed', 'details': str(e)})
            pass
        
        @self.socketio.on('disconnect')
        def handle_disconnect():
            """Handle client disconnection"""
            try:
                session_id = session.get('terminal_session_id')
                if session_id and session_id in self.active_sessions:
                    terminal_session = self.active_sessions[session_id]
                    
                    # Leave room
                    if terminal_session.room:
                        leave_room(terminal_session.room)
                    
                    # Broadcast disconnection
                    self._broadcast_system_event('user_disconnected', {
                        'user_id': terminal_session.user_id,
                        'session_id': session_id,
                        'session_duration': terminal_session.session_duration(),
                        'command_count': terminal_session.command_count
                    })
                    
                    # Remove session
                    del self.active_sessions[session_id]
                    self.metrics['active_connections'] -= 1
                    
                    logger.info(f"🔌 Terminal disconnection: {session_id}")
                
            except Exception as e:
                logger.error(f"Disconnection error: {e}")
            pass
        
        @self.socketio.on('terminal_command')
        def handle_terminal_command(data):
            """Handle terminal command execution"""
            try:
                session_id = session.get('terminal_session_id')
                if not session_id or session_id not in self.active_sessions:
                    emit('error', {'message': 'Invalid session'})
                    return
                
                terminal_session = self.active_sessions[session_id]
                
                # Rate limiting
                if not self._check_rate_limit(session_id):
                    emit('error', {'message': 'Rate limit exceeded'})
                    return
                
                # Extract command
                command = data.get('command', '').strip()
                if not command:
                    emit('error', {'message': 'Empty command'})
                    return
                
                # Update session activity
                terminal_session.update_activity()
                terminal_session.command_count += 1
                
                # Create command message
                cmd_msg = TerminalMessage(
                    type='command',
                    content=command,
                    timestamp=time.time(),
                    session_id=session_id,
                    metadata={'user_id': terminal_session.user_id}
                )
                
                # Add to history
                self.message_history.append(cmd_msg)
                
                # Echo command back to user
                emit('terminal_message', cmd_msg.to_terminal_format())
                
                # Execute command asynchronously
                self._execute_command_async(command, terminal_session)
                
                # Update metrics
                self.metrics['commands_executed'] += 1
                
            except Exception as e:
                logger.error(f"Command execution error: {e}")
                emit('error', {'message': 'Command execution failed', 'details': str(e)})
                self.metrics['errors'] += 1
        
        @self.socketio.on('join_broadcast')
        def handle_join_broadcast():
            """Handle user joining broadcast channel"""
            try:
                session_id = session.get('terminal_session_id')
                if session_id and session_id in self.active_sessions:
                    self.broadcast_subscribers.add(session_id)
                    join_room('broadcast')
                    
                    emit('system_message', {
                        'type': 'info',
                        'message': 'Joined terminal broadcast channel',
                        'timestamp': datetime.now().strftime("%H:%M:%S")
                    })
                    
                    logger.info(f"📡 User joined broadcast: {session_id}")
                
            except Exception as e:
                logger.error(f"Broadcast join error: {e}")
        
        @self.socketio.on('leave_broadcast')
        def handle_leave_broadcast():
            """Handle user leaving broadcast channel"""
            try:
                session_id = session.get('terminal_session_id')
                if session_id in self.broadcast_subscribers:
                    self.broadcast_subscribers.remove(session_id)
                    leave_room('broadcast')
                    
                    emit('system_message', {
                        'type': 'info',
                        'message': 'Left terminal broadcast channel',
                        'timestamp': datetime.now().strftime("%H:%M:%S")
                    })
                    
                    logger.info(f"📡 User left broadcast: {session_id}")
                
            except Exception as e:
                logger.error(f"Broadcast leave error: {e}")
        
        @self.socketio.on('terminal_mode_change')
        def handle_mode_change(data):
            """Handle terminal mode changes (matrix, debug, etc.)"""
            try:
                session_id = session.get('terminal_session_id')
                if not session_id or session_id not in self.active_sessions:
                    return
                
                terminal_session = self.active_sessions[session_id]
                new_mode = data.get('mode', 'standard')
                
                if new_mode in ['standard', 'matrix', 'debug', 'minimal']:
                    terminal_session.terminal_mode = new_mode
                    terminal_session.update_activity()
                    
                    emit('terminal_message', {
                        'type': 'system',
                        'content': f'Terminal mode changed to: {new_mode.upper()}',
                        'timestamp': datetime.now().strftime("%H:%M:%S"),
                        'display': f'[{datetime.now().strftime("%H:%M:%S")}] SYSTEM> Mode: {new_mode.upper()}'
                    })
                    
                    logger.info(f"🖥️ Terminal mode change: {session_id} -> {new_mode}")
                
            except Exception as e:
                logger.error(f"Mode change error: {e}")
        
        @self.socketio.on('request_status')
        def handle_status_request():
            """Handle terminal status request"""
            try:
                session_id = session.get('terminal_session_id')
                if session_id and session_id in self.active_sessions:
                    terminal_session = self.active_sessions[session_id]
                    
                    status_data = {
                        'session': terminal_session.to_dict(),
                        'server_metrics': self._get_server_metrics(),
                        'active_users': len(self.active_sessions),
                        'server_time': datetime.now().isoformat()
                    }
                    
                    emit('status_response', status_data)
                
            except Exception as e:
                logger.error(f"Status request error: {e}")
    
    def _create_welcome_message(self, terminal_session: TerminalSession) -> TerminalMessage:
        """Create welcome message for new connections"""
        welcome_text = f"""
╔════════════════════════════════════════════════════════════════════════════════╗
║  TERMINAL_CONNECTION_ESTABLISHED - SESSION: {terminal_session.session_id[:8]}  ║
║  E-CON NEWS TERMINAL v2.024 - WEBSOCKET INTERFACE                              ║
║  Connection Time: {datetime.now().strftime('%Y.%m.%d_%H:%M:%S')}               ║
║  User ID: {terminal_session.user_id[:12]}...                                   ║
║  Permissions: {', '.join(sorted(terminal_session.permissions))}                ║
║  Protocol: WebSocket + SocketIO                                                ║
╚════════════════════════════════════════════════════════════════════════════════╝

Type 'help' for commands or start typing to begin terminal session.
Real-time mode: ACTIVE | Background sync: ENABLED | AI: READY
"""
        
        return TerminalMessage(
            type='system',
            content=welcome_text.strip(),
            timestamp=time.time(),
            session_id=terminal_session.session_id,
            metadata={'welcome': True}
        )
    
    def _check_rate_limit(self, session_id: str) -> bool:
        """Check if session is within rate limits"""
        current_time = time.time()
        user_requests = self.rate_limits[session_id]
        
        # Remove old requests outside window
        while user_requests and current_time - user_requests[0] > self.rate_limit_window:
            user_requests.popleft()
        
        # Check if under limit
        if len(user_requests) >= self.rate_limit_max:
            return False
        
        # Add current request
        user_requests.append(current_time)
        return True
    
    def _execute_command_async(self, command: str, terminal_session: TerminalSession):
        """Execute terminal command asynchronously"""
        def execute():
            try:
                # THÊM DÒNG IMPORT VÀO ĐÂY
                from app import terminal_processor
                # Check permissions
                if not self._check_command_permissions(command, terminal_session):
                    self._send_to_session(terminal_session.session_id, TerminalMessage(
                        type='error',
                        content='Insufficient permissions for this command',
                        timestamp=time.time(),
                        session_id=terminal_session.session_id
                    ))
                    return
                
                # Execute command
                if APP_MODULES_AVAILABLE:
                    result = self.terminal_processor.execute(command)
                else:
                    result = self._handle_basic_command(command)
                
                # Handle different result types
                if isinstance(result, dict):
                    if result.get('status') == 'error':
                        msg_type = 'error'
                        content = result.get('message', 'Unknown error')
                    else:
                        msg_type = 'response'
                        content = result.get('message', str(result))
                        
                        # Handle special actions
                        if 'action' in result:
                            self._handle_command_action(result['action'], terminal_session)
                else:
                    msg_type = 'response'
                    content = str(result)
                
                # Send response
                response_msg = TerminalMessage(
                    type=msg_type,
                    content=content,
                    timestamp=time.time(),
                    session_id=terminal_session.session_id,
                    metadata={'command': command}
                )
                
                self._send_to_session(terminal_session.session_id, response_msg)
                
            except Exception as e:
                logger.error(f"Command execution error: {e}")
                error_msg = TerminalMessage(
                    type='error',
                    content=f'Command execution failed: {str(e)}',
                    timestamp=time.time(),
                    session_id=terminal_session.session_id
                )
                self._send_to_session(terminal_session.session_id, error_msg)
        
        # Execute in background thread
        threading.Thread(target=execute, daemon=True).start()
    
    def _check_command_permissions(self, command: str, terminal_session: TerminalSession) -> bool:
        """Check if user has permission to execute command"""
        cmd_parts = command.lower().split()
        if not cmd_parts:
            return True
        
        base_command = cmd_parts[0]
        
        # Admin commands require admin permission
        admin_commands = {'debug', 'system', 'users', 'cache', 'monitor'}
        if base_command in admin_commands:
            return 'admin' in terminal_session.permissions
        
        # AI commands require AI permission
        ai_commands = {'ai', 'debate', 'summarize'}
        if base_command in ai_commands:
            return 'ai' in terminal_session.permissions
        
        # Basic commands available to all
        return True
    
    def _handle_command_action(self, action: str, terminal_session: TerminalSession):
        """Handle special command actions"""
        try:
            if action == 'activate_matrix':
                self._send_to_session(terminal_session.session_id, TerminalMessage(
                    type='system',
                    content='MATRIX_MODE_ACTIVATED',
                    timestamp=time.time(),
                    session_id=terminal_session.session_id,
                    metadata={'action': 'matrix_mode', 'duration': 5000}
                ))
            
            elif action == 'trigger_glitch':
                self._send_to_session(terminal_session.session_id, TerminalMessage(
                    type='system',
                    content='GLITCH_EFFECT_TRIGGERED',
                    timestamp=time.time(),
                    session_id=terminal_session.session_id,
                    metadata={'action': 'glitch_effect', 'intensity': 'medium'}
                ))
            
            elif action == 'open_chat':
                self._send_to_session(terminal_session.session_id, TerminalMessage(
                    type='system',
                    content='OPENING_AI_CHAT_INTERFACE',
                    timestamp=time.time(),
                    session_id=terminal_session.session_id,
                    metadata={'action': 'open_chat'}
                ))
            
            elif action == 'refresh_all':
                self._broadcast_system_event('refresh_triggered', {
                    'triggered_by': terminal_session.user_id,
                    'timestamp': time.time()
                })
        
        except Exception as e:
            logger.error(f"Action handling error: {e}")
    
    def _handle_basic_command(self, command: str) -> dict:
        """Handle basic commands when app modules not available"""
        cmd_parts = command.lower().split()
        base_cmd = cmd_parts[0] if cmd_parts else ''
        
        if base_cmd == 'help':
            return {
                'status': 'success',
                'message': '''TERMINAL COMMANDS (WebSocket Mode):
├─ help          │ Show this help
├─ status        │ Show session status  
├─ time          │ Show current time
├─ ping          │ Test connection
├─ clear         │ Clear terminal
└─ exit          │ Disconnect session'''
            }
        
        elif base_cmd == 'status':
            return {
                'status': 'success',
                'message': f'''SESSION STATUS:
├─ Active Sessions: {len(self.active_sessions)}
├─ Server Uptime: {int(time.time() - self.metrics["uptime_start"])}s
├─ Commands Executed: {self.metrics["commands_executed"]}
└─ WebSocket Status: CONNECTED'''
            }
        
        elif base_cmd == 'time':
            return {
                'status': 'success',
                'message': f'Current time: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}'
            }
        
        elif base_cmd == 'ping':
            return {
                'status': 'success',
                'message': 'PONG - WebSocket connection active'
            }
        
        elif base_cmd == 'clear':
            return {
                'status': 'success',
                'message': 'CLEAR_TERMINAL',
                'action': 'clear_terminal'
            }
        
        elif base_cmd == 'exit':
            return {
                'status': 'success',
                'message': 'DISCONNECTING...',
                'action': 'disconnect'
            }
        
        else:
            return {
                'status': 'error',
                'message': f'Unknown command: {base_cmd}. Type "help" for available commands.'
            }
    
    def _send_to_session(self, session_id: str, message: TerminalMessage):
        """Send message to specific session"""
        try:
            if session_id in self.active_sessions:
                terminal_session = self.active_sessions[session_id]
                
                # Add to history
                self.message_history.append(message)
                
                # Send via SocketIO
                self.socketio.emit(
                    'terminal_message',
                    message.to_terminal_format(),
                    room=terminal_session.room
                )
                
                self.metrics['messages_sent'] += 1
                
        except Exception as e:
            logger.error(f"Send message error: {e}")
    
    def _broadcast_system_event(self, event_type: str, data: Dict):
        """Broadcast system event to subscribers"""
        try:
            if self.broadcast_subscribers:
                system_msg = {
                    'event_type': event_type,
                    'data': data,
                    'timestamp': datetime.now().isoformat()
                }
                
                self.socketio.emit('system_event', system_msg, room='broadcast')
                logger.debug(f"📡 Broadcast: {event_type}")
                
        except Exception as e:
            logger.error(f"Broadcast error: {e}")
    
    def _get_server_metrics(self) -> Dict:
        """Get server metrics for status"""
        uptime = time.time() - self.metrics['uptime_start']
        
        return {
            'uptime_seconds': uptime,
            'uptime_formatted': f"{int(uptime//3600)}h {int((uptime%3600)//60)}m",
            'active_connections': self.metrics['active_connections'],
            'total_connections': self.metrics['total_connections'],
            'messages_sent': self.metrics['messages_sent'],
            'commands_executed': self.metrics['commands_executed'],
            'error_count': self.metrics['errors'],
            'broadcast_subscribers': len(self.broadcast_subscribers)
        }
    
    # ===============================
    # BACKGROUND PROCESSING
    # ===============================
    
    def start_background_processing(self):
        """Start background processing for cleanup and monitoring"""
        if self.processing_active:
            return
        
        self.processing_active = True
        self.background_processor = threading.Thread(target=self._background_loop, daemon=True)
        self.background_processor.start()
        
        logger.info("🔄 Background WebSocket processing started")
    
    def stop_background_processing(self):
        """Stop background processing"""
        self.processing_active = False
        if self.background_processor:
            self.background_processor.join(timeout=5)
        
        logger.info("⏹️ Background WebSocket processing stopped")
    
    def _background_loop(self):
        """Background processing loop"""
        while self.processing_active:
            try:
                # Clean inactive sessions
                self._cleanup_inactive_sessions()
                
                # Update system stats
                self._update_system_stats()
                
                # Send periodic status updates to subscribers
                if len(self.broadcast_subscribers) > 0:
                    status_update = {
                        'type': 'status_update',
                        'metrics': self._get_server_metrics(),
                        'timestamp': datetime.now().isoformat()
                    }
                    
                    self.socketio.emit('system_event', status_update, room='broadcast')
                
                # Sleep between cycles
                time.sleep(30)  # 30 second intervals
                
            except Exception as e:
                logger.error(f"Background processing error: {e}")
                time.sleep(10)
    
    def _cleanup_inactive_sessions(self):
        """Clean up inactive sessions"""
        current_time = time.time()
        inactive_threshold = 1800  # 30 minutes
        
        inactive_sessions = [
            session_id for session_id, session in self.active_sessions.items()
            if current_time - session.last_activity > inactive_threshold
        ]
        
        for session_id in inactive_sessions:
            try:
                session = self.active_sessions[session_id]
                logger.info(f"🧹 Cleaning inactive session: {session_id}")
                
                # Remove from broadcast if subscribed
                self.broadcast_subscribers.discard(session_id)
                
                # Remove session
                del self.active_sessions[session_id]
                self.metrics['active_connections'] -= 1
                
            except Exception as e:
                logger.error(f"Session cleanup error: {e}")
    
    def _update_system_stats(self):
        """Update system statistics"""
        if APP_MODULES_AVAILABLE:
            try:
                # Update global system stats with WebSocket metrics
                system_stats.update({
                    'websocket_connections': self.metrics['active_connections'],
                    'websocket_messages': self.metrics['messages_sent'],
                    'websocket_commands': self.metrics['commands_executed']
                })
            except:
                pass
    
    # ===============================
    # PUBLIC API METHODS
    # ===============================
    
    def broadcast_news_update(self, news_data: Dict):
        """Broadcast news update to all subscribers"""
        try:
            if self.broadcast_subscribers:
                broadcast_msg = {
                    'event_type': 'news_update',
                    'data': news_data,
                    'timestamp': datetime.now().isoformat()
                }
                
                self.socketio.emit('system_event', broadcast_msg, room='broadcast')
                logger.info("📰 News update broadcast sent")
                
        except Exception as e:
            logger.error(f"News broadcast error: {e}")
    
    def send_ai_response(self, session_id: str, response: str, response_type: str = 'ai_response'):
        """Send AI response to specific session"""
        try:
            if session_id in self.active_sessions:
                ai_msg = TerminalMessage(
                    type='response',
                    content=response,
                    timestamp=time.time(),
                    session_id=session_id,
                    metadata={'type': response_type, 'source': 'ai'}
                )
                
                self._send_to_session(session_id, ai_msg)
                
        except Exception as e:
            logger.error(f"AI response send error: {e}")
    
    def get_active_sessions(self) -> List[Dict]:
        """Get list of active sessions"""
        return [session.to_dict() for session in self.active_sessions.values()]
    
    def get_metrics(self) -> Dict:
        """Get WebSocket metrics"""
        return {
            **self.metrics,
            'server_metrics': self._get_server_metrics(),
            'session_count': len(self.active_sessions),
            'broadcast_subscribers': len(self.broadcast_subscribers),
            'message_history_size': len(self.message_history)
        }
