# run.py
import os
from flask_socketio import SocketIO
from app import create_app # Import hàm create_app từ app.py

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

# Bây giờ, chúng ta có thể import và khởi tạo WebSocket Manager
# mà không sợ import vòng tròn
from api.terminal_websocket import TerminalWebSocketManager

websocket_manager = TerminalWebSocketManager(
    app=app,
    socketio=socketio,
    terminal_processor=app.terminal_processor # Lấy từ app context
)
websocket_manager.register_handlers()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    # Sử dụng socketio.run để chạy server
    socketio.run(app, host='0.0.0.0', port=port)
