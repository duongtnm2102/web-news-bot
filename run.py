"""
run.py - Fixed eventlet and WebSocket issues với proper error handling
IMPORTANT: eventlet.monkey_patch() MUST be first import
"""

import eventlet
eventlet.monkey_patch()

import os
import sys
import logging
import traceback
import importlib
from datetime import datetime
from flask_socketio import SocketIO

# =============================================================================
# ENHANCED LOGGING SETUP
# =============================================================================

def setup_debug_logging():
    """Setup comprehensive debug logging"""
    log_level = logging.DEBUG if os.getenv('DEBUG_MODE', 'False').lower() == 'true' else logging.INFO
    
    # Create formatters
    detailed_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - [%(filename)s:%(lineno)d] - %(message)s'
    )
    
    simple_formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s'
    )
    
    # Setup root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    
    # Clear any existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(simple_formatter)
    root_logger.addHandler(console_handler)
    
    # File handler for debug
    if log_level == logging.DEBUG:
        try:
            file_handler = logging.FileHandler('econ_news_debug.log')
            file_handler.setLevel(logging.DEBUG)
            file_handler.setFormatter(detailed_formatter)
            root_logger.addHandler(file_handler)
            print("📝 Debug logging enabled - writing to econ_news_debug.log")
        except Exception as e:
            print(f"⚠️ Could not setup file logging: {e}")
    
    return root_logger

# Setup logging early
logger = setup_debug_logging()

# =============================================================================
# SAFE IMPORT FUNCTIONS
# =============================================================================

def safe_import_module(module_path, fallback_name=None):
    """
    Safely import module với fallback mechanisms
    Args:
        module_path: đường dẫn module (có thể có dấu gạch ngang)
        fallback_name: tên fallback nếu import thất bại
    """
    try:
        logger.debug(f"🔄 Attempting to import module: {module_path}")
        
        # Use importlib for modules with dash/hyphen
        module = importlib.import_module(module_path)
        logger.info(f"✅ Successfully imported {module_path} using importlib")
        return module
        
    except ImportError as e:
        logger.warning(f"⚠️ Failed to import {module_path}: {e}")
        
        if fallback_name:
            logger.info(f"🔄 Trying fallback import: {fallback_name}")
            try:
                fallback_module = importlib.import_module(fallback_name)
                logger.info(f"✅ Successfully imported fallback: {fallback_name}")
                return fallback_module
            except ImportError as fallback_error:
                logger.error(f"❌ Fallback import also failed: {fallback_error}")
        
        return None
    except Exception as e:
        logger.error(f"❌ Unexpected error importing {module_path}: {e}")
        logger.debug(f"📋 Full traceback: {traceback.format_exc()}")
        return None

def safe_get_class_from_module(module, class_name):
    """Safely get class from module với error handling"""
    try:
        if module is None:
            logger.warning(f"⚠️ Module is None, cannot get class {class_name}")
            return None
        
        if hasattr(module, class_name):
            cls = getattr(module, class_name)
            logger.debug(f"✅ Successfully got class {class_name} from module")
            return cls
        else:
            logger.warning(f"⚠️ Class {class_name} not found in module")
            available_attrs = [attr for attr in dir(module) if not attr.startswith('_')]
            logger.debug(f"📋 Available attributes: {available_attrs}")
            return None
            
    except Exception as e:
        logger.error(f"❌ Error getting class {class_name}: {e}")
        logger.debug(f"📋 Full traceback: {traceback.format_exc()}")
        return None

# =============================================================================
# ENHANCED APP INITIALIZATION
# =============================================================================

def create_app_with_error_handling():
    """Create app với comprehensive error handling"""
    try:
        logger.info("🚀 Starting E-con News Terminal v2.024.2")
        logger.info("📊 Creating Flask app instance...")
        
        # Import app module
        from app import create_app
        app = create_app()
        
        if app is None:
            raise RuntimeError("Failed to create Flask app")
        
        logger.info("✅ Flask app created successfully")
        
        # Verify app has required attributes
        required_attrs = ['terminal_processor']
        for attr in required_attrs:
            if not hasattr(app, attr):
                logger.warning(f"⚠️ App missing attribute: {attr}")
            else:
                logger.debug(f"✅ App has required attribute: {attr}")
        
        return app
        
    except Exception as e:
        logger.error(f"❌ Failed to create Flask app: {e}")
        logger.debug(f"📋 Full traceback: {traceback.format_exc()}")
        raise

def initialize_socketio_with_fallback(app):
    """Initialize SocketIO với fallback mechanism"""
    try:
        logger.info("🔌 Initializing SocketIO...")
        
        # Create SocketIO instance với enhanced config
        socketio = SocketIO(
            app,
            cors_allowed_origins="*",
            async_mode='eventlet',
            logger=logger.level == logging.DEBUG,  # Enable SocketIO logging in debug mode
            engineio_logger=logger.level == logging.DEBUG,
            ping_timeout=60,
            ping_interval=25,
            max_http_buffer_size=1e8  # 100MB for large content
        )
        
        logger.info("✅ SocketIO initialized successfully")
        return socketio
        
    except Exception as e:
        logger.error(f"❌ SocketIO initialization failed: {e}")
        logger.debug(f"📋 Full traceback: {traceback.format_exc()}")
        return None

def setup_websocket_manager(app, socketio):
    """Setup WebSocket manager với improved error handling"""
    try:
        logger.info("🔌 Setting up WebSocket terminal manager...")
        
        # Import WebSocket module using safe import với dấu gạch ngang
        terminal_websocket_module = safe_import_module('api.terminal-websocket')
        
        if terminal_websocket_module is None:
            logger.warning("⚠️ WebSocket module not available, skipping WebSocket features")
            return None
        
        # Get WebSocket manager class
        TerminalWebSocketManager = safe_get_class_from_module(
            terminal_websocket_module, 
            'TerminalWebSocketManager'
        )
        
        if TerminalWebSocketManager is None:
            logger.warning("⚠️ TerminalWebSocketManager class not found")
            return None
        
        # Initialize WebSocket manager với multiple fallback strategies
        websocket_manager = None
        
        # Strategy 1: Full signature
        try:
            logger.debug("🔄 Trying full signature initialization...")
            websocket_manager = TerminalWebSocketManager(
                app=app,
                socketio=socketio,
                terminal_processor=getattr(app, 'terminal_processor', None)
            )
            logger.info("✅ WebSocket manager initialized with full signature")
            
        except TypeError as te:
            logger.warning(f"⚠️ Full signature failed: {te}")
            
            # Strategy 2: App-only signature  
            try:
                logger.debug("🔄 Trying app-only signature...")
                websocket_manager = TerminalWebSocketManager(app=app)
                
                # Set attributes manually
                if hasattr(websocket_manager, 'socketio'):
                    websocket_manager.socketio = socketio
                if hasattr(websocket_manager, 'terminal_processor'):
                    websocket_manager.terminal_processor = getattr(app, 'terminal_processor', None)
                
                logger.info("✅ WebSocket manager initialized with app-only signature")
                
            except Exception as e2:
                logger.error(f"❌ App-only signature also failed: {e2}")
                return None
        
        except Exception as e:
            logger.error(f"❌ WebSocket manager initialization failed: {e}")
            logger.debug(f"📋 Full traceback: {traceback.format_exc()}")
            return None
        
        # Register handlers với error handling
        try:
            if hasattr(websocket_manager, 'register_handlers'):
                websocket_manager.register_handlers()
                logger.info("✅ WebSocket handlers registered via register_handlers()")
            elif hasattr(websocket_manager, '_register_handlers'):
                websocket_manager._register_handlers()
                logger.info("✅ WebSocket handlers registered via _register_handlers()")
            else:
                logger.warning("⚠️ No handler registration method found")
                
        except Exception as e:
            logger.error(f"❌ Handler registration failed: {e}")
            logger.debug(f"📋 Full traceback: {traceback.format_exc()}")
            # Continue without WebSocket handlers
            
        return websocket_manager
        
    except Exception as e:
        logger.error(f"❌ WebSocket setup failed completely: {e}")
        logger.debug(f"📋 Full traceback: {traceback.format_exc()}")
        return None

# =============================================================================
# ENHANCED ERROR HANDLERS FOR PRODUCTION
# =============================================================================

def add_production_error_handlers(app):
    """Add production-ready error handlers"""
    
    @app.errorhandler(500)
    def handle_500_error(error):
        logger.error(f"🚨 Internal Server Error: {error}")
        logger.debug(f"📋 Error details: {traceback.format_exc()}")
        
        # Return detailed error in debug mode only
        if app.debug or os.getenv('DEBUG_MODE', 'False').lower() == 'true':
            return {
                'error': 'Internal Server Error',
                'details': str(error),
                'traceback': traceback.format_exc().split('\n'),
                'timestamp': datetime.now().isoformat(),
                'debug_mode': True
            }, 500
        else:
            return {
                'error': 'Internal Server Error',
                'message': 'Something went wrong on the server',
                'timestamp': datetime.now().isoformat(),
                'error_id': str(hash(str(error)))[:8]
            }, 500
    
    @app.errorhandler(404)
    def handle_404_error(error):
        logger.warning(f"⚠️ Page not found: {error}")
        return {
            'error': 'Not Found',
            'message': 'The requested resource was not found',
            'timestamp': datetime.now().isoformat()
        }, 404
    
    @app.errorhandler(400)
    def handle_400_error(error):
        logger.warning(f"⚠️ Bad Request: {error}")
        return {
            'error': 'Bad Request',
            'message': 'Invalid request data',
            'timestamp': datetime.now().isoformat()
        }, 400
    
    # Generic exception handler
    @app.errorhandler(Exception)
    def handle_generic_exception(error):
        logger.error(f"🚨 Unhandled Exception: {error}")
        logger.debug(f"📋 Exception traceback: {traceback.format_exc()}")
        
        return {
            'error': 'Internal Server Error',
            'message': 'An unexpected error occurred',
            'timestamp': datetime.now().isoformat(),
            'type': type(error).__name__,
            'error_id': str(hash(str(error)))[:8]
        }, 500

# =============================================================================
# MAIN APPLICATION RUNNER
# =============================================================================

def main():
    """Main application entry point với comprehensive error handling"""
    
    logger.info("=" * 80)
    logger.info("🚀 E-CON NEWS TERMINAL v2.024.2 - STARTING UP")
    logger.info("=" * 80)
    
    app = None
    socketio = None
    websocket_manager = None
    
    try:
        # Step 1: Create Flask app
        logger.info("📊 Step 1: Creating Flask application...")
        app = create_app_with_error_handling()
        
        # Add production error handlers
        add_production_error_handlers(app)
        
        # Step 2: Initialize SocketIO (optional)
        logger.info("🔌 Step 2: Initializing SocketIO...")
        try:
            socketio = initialize_socketio_with_fallback(app)
        except Exception as socketio_init_error:
            logger.warning(f"⚠️ SocketIO initialization failed: {socketio_init_error}")
            logger.info("🔧 Continuing without SocketIO...")
            socketio = None
        
        # Step 3: Setup WebSocket manager (optional)
        if socketio is not None:
            logger.info("🔌 Step 3: Setting up WebSocket manager...")
            try:
                websocket_manager = setup_websocket_manager(app, socketio)
                
                if websocket_manager:
                    logger.info("✅ WebSocket terminal features enabled")
                else:
                    logger.warning("⚠️ Running without WebSocket terminal features")
            except Exception as ws_error:
                logger.warning(f"⚠️ WebSocket setup failed: {ws_error}")
                websocket_manager = None
        else:
            logger.warning("⚠️ SocketIO not available, skipping WebSocket setup")
        
        # Step 4: Get server configuration
        port = int(os.environ.get('PORT', 8080))
        host = os.environ.get('HOST', '0.0.0.0')
        debug_mode = os.getenv('DEBUG_MODE', 'False').lower() == 'true'
        
        logger.info("🔧 Server Configuration:")
        logger.info(f"   • Host: {host}")
        logger.info(f"   • Port: {port}")
        logger.info(f"   • Debug Mode: {debug_mode}")
        logger.info(f"   • SocketIO: {'Enabled' if socketio else 'Disabled'}")
        logger.info(f"   • WebSocket Terminal: {'Enabled' if websocket_manager else 'Disabled'}")
        logger.info(f"   • Environment: {os.getenv('FLASK_ENV', 'production')}")
        
        # Step 5: Start server
        logger.info("🚀 Step 5: Starting server...")
        
        if socketio is not None:
            try:
                logger.info("🔌 Starting with SocketIO support...")
                socketio.run(
                    app, 
                    host=host, 
                    port=port, 
                    debug=debug_mode,
                    use_reloader=False,  # Disable reloader in production
                    log_output=debug_mode
                )
            except Exception as socketio_error:
                logger.error(f"🔄 SocketIO server failed, falling back to Flask: {socketio_error}")
                logger.info("🔧 Starting with regular Flask...")
                app.run(host=host, port=port, debug=debug_mode, threaded=True)
        else:
            logger.info("🔧 Starting with regular Flask...")
            app.run(host=host, port=port, debug=debug_mode, threaded=True)
            
    except KeyboardInterrupt:
        logger.info("⏹️ Server stopped by user (Ctrl+C)")
        
    except Exception as e:
        logger.error(f"🚨 CRITICAL ERROR: Server failed to start")
        logger.error(f"❌ Error: {e}")
        logger.debug(f"📋 Full traceback: {traceback.format_exc()}")
        
        # Emergency fallback - simple Flask server
        if app is not None:
            try:
                logger.info("🆘 Attempting emergency fallback server...")
                app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)), debug=False, threaded=True)
            except Exception as emergency_error:
                logger.error(f"🆘 Emergency fallback also failed: {emergency_error}")
        
        sys.exit(1)
    
    finally:
        logger.info("🏁 Server shutdown complete")

# =============================================================================
# CREATE WSGI APPLICATION FOR GUNICORN
# =============================================================================

# Create app instance for Gunicorn
try:
    logger.info("🔧 Creating WSGI app instance for Gunicorn...")
    app = create_app_with_error_handling()
    add_production_error_handlers(app)
    logger.info("✅ WSGI app created successfully for Gunicorn")
except Exception as e:
    logger.error(f"❌ Failed to create WSGI app: {e}")
    # Create minimal fallback app
    from flask import Flask
    app = Flask(__name__)
    
    @app.route('/')
    def health_check():
        return {'status': 'Server running but with limited functionality', 'error': str(e)}
    
    @app.route('/health')  
    def simple_health():
        return {'status': 'ok', 'timestamp': datetime.now().isoformat()}

if __name__ == '__main__':
    main()
