# run.py
import os
import sys
from flask_socketio import SocketIO

# Thêm đường dẫn dự án để đảm bảo import hoạt động
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app, terminal_processor
from api.terminal_websocket import TerminalWebSocketManager

# Khởi tạo SocketIO và liên kết với app Flask
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode='eventlet',
    logger=False,
    engineio_logger=False
)

# Tạo một instance của WebSocket Manager và truyền các đối tượng cần thiết vào
websocket_manager = TerminalWebSocketManager(
    app=app, 
    socketio=socketio, 
    terminal_processor=terminal_processor
)

# Đăng ký các sự kiện WebSocket
websocket_manager.register_handlers()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    print("🚀 Starting E-con News Terminal with WebSocket...")
    socketio.run(app, host='0.0.0.0', port=port, debug=False)
