# run.py - Fixed import for terminal-websocket.py
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

# Import với tên file đúng (dấu gạch ngang)
# Python sẽ tự động convert dấu gạch ngang thành gạch dưới
try:
    import importlib
    # Import module bằng cách sử dụng importlib để handle dấu gạch ngang
    terminal_websocket_module = importlib.import_module('api.terminal-websocket')
    TerminalWebSocketManager = terminal_websocket_module.TerminalWebSocketManager
    
    websocket_manager = TerminalWebSocketManager(
        app=app,
        socketio=socketio,
        terminal_processor=app.terminal_processor
    )
    websocket_manager.register_handlers()
    
    print("✅ WebSocket terminal initialized successfully")
    
except ImportError as e:
    print(f"⚠️ WebSocket terminal import failed: {e}")
    print("🔄 Running without WebSocket features")
except Exception as e:
    print(f"❌ WebSocket setup error: {e}")
    print("🔄 Running without WebSocket features")

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    # Sử dụng socketio.run nếu WebSocket available, nếu không dùng app.run
    try:
        socketio.run(app, host='0.0.0.0', port=port, debug=False)
    except:
        print("🔄 Fallback to regular Flask run")
        app.run(host='0.0.0.0', port=port, debug=False)
