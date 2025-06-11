# run.py - Fixed eventlet and WebSocket issues
# IMPORTANT: eventlet.monkey_patch() MUST be first import
import eventlet
eventlet.monkey_patch()

import os
from flask_socketio import SocketIO
from app import create_app

# Gọi hàm để tạo app instance
app = create_app()

# Khởi tạo SocketIO với app đã được tạo
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode='eventlet',
    logger=False,
    engineio_logger=False
)

# Import và setup WebSocket với error handling
try:
    import importlib
    # Import module bằng cách sử dụng importlib để handle dấu gạch ngang
    terminal_websocket_module = importlib.import_module('api.terminal-websocket')
    TerminalWebSocketManager = terminal_websocket_module.TerminalWebSocketManager
    
    # Khởi tạo WebSocket manager với signature đúng từ file terminal-websocket.py
    # Kiểm tra signature của class trước khi khởi tạo
    try:
        # Thử signature đầy đủ trước
        websocket_manager = TerminalWebSocketManager(
            app=app,
            socketio=socketio,
            terminal_processor=app.terminal_processor
        )
    except TypeError as te:
        print(f"⚠️ Full signature failed: {te}")
        try:
            # Thử signature chỉ với app
            websocket_manager = TerminalWebSocketManager(app=app)
            # Set socketio và terminal_processor sau
            if hasattr(websocket_manager, 'socketio'):
                websocket_manager.socketio = socketio
            if hasattr(websocket_manager, 'terminal_processor'):
                websocket_manager.terminal_processor = app.terminal_processor
        except Exception as e2:
            print(f"⚠️ Alternative signature failed: {e2}")
            raise e2
    
    # Register handlers nếu method tồn tại
    if hasattr(websocket_manager, 'register_handlers'):
        websocket_manager.register_handlers()
    elif hasattr(websocket_manager, '_register_handlers'):
        websocket_manager._register_handlers()
    
    print("✅ WebSocket terminal initialized successfully")
    
except ImportError as e:
    print(f"⚠️ WebSocket terminal import failed: {e}")
    print("🔄 Running without WebSocket features")
    socketio = None
except Exception as e:
    print(f"⚠️ WebSocket setup error: {e}")
    print("🔄 Running without WebSocket features")
    socketio = None

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    
    # Sử dụng socketio.run nếu WebSocket available, nếu không dùng app.run
    if socketio is not None:
        try:
            print("🚀 Starting with SocketIO support")
            socketio.run(app, host='0.0.0.0', port=port, debug=False)
        except Exception as e:
            print(f"🔄 SocketIO failed, fallback to Flask: {e}")
            app.run(host='0.0.0.0', port=port, debug=False)
    else:
        print("🚀 Starting with regular Flask")
        app.run(host='0.0.0.0', port=port, debug=False)
