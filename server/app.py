# app.py
import os
from flask import Flask, jsonify, current_app, request
from flask_cors import CORS
from flask_socketio import SocketIO
from services.use_redis import init_redis
import db
from services.email import mail
from helper.otp_engine import OTPEngine
from dotenv import load_dotenv

load_dotenv()

socketio = SocketIO(cors_allowed_origins="*", logger=False, engineio_logger=False)

@socketio.on("connect")
def handle_connect():
    sid = request.sid
    app = current_app._get_current_object()
    app.otp_engines[sid] = OTPEngine(secret=os.getenv("DEMO_SECRET", "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"))
    app.logger.info(f"Socket connected: {sid}")
    return {'sid': sid}

@socketio.on("disconnect")
def handle_disconnect():
    sid = request.sid
    app = current_app._get_current_object()
    app.otp_engines.pop(sid, None)
    app.logger.info(f"Socket disconnected: {sid}")

@socketio.on("get_counter")
def handle_get_counter():
    sid = request.sid
    app = current_app._get_current_object()
    engine = app.otp_engines.get(sid)
    if engine:
        return {'counter': engine.counter}
    return {'counter': None}

@socketio.on("set_counter")
def handle_set_counter(data):
    sid = request.sid
    app = current_app._get_current_object()
    engine = app.otp_engines.get(sid)
    if engine and isinstance(data, dict):
        new_counter = data.get('counter')
        try:
            engine.counter = int(new_counter)
            return {'counter': engine.counter, 'status': 'ok'}
        except Exception:
            return {'status': 'error', 'message': 'Invalid counter value'}
    return {'status': 'error', 'message': 'Engine not found'}

def create_app():
    app = Flask(__name__)
    app.config['MAIL_SERVER'] = 'smtp.gmail.com'
    app.config['MAIL_PORT'] = 587
    app.config['MAIL_USE_TLS'] = True
    app.config['MAIL_USERNAME'] = os.getenv("MAIL")
    app.config['MAIL_PASSWORD'] = os.getenv("APP_PWD")
    app.config['MAIL_DEFAULT_SENDER'] = ('OTP PLATFORM', os.getenv("MAIL"))
    
    mail.init_app(app)
    app.secret_key = os.getenv("SECRET_KEY")# 'your-secret-key'
    CORS(
        app,
        supports_credentials=True
    )
    app.otp_engines = {}

    # Khởi tạo pool NGAY khi app được tạo (trước request đầu tiên)
    with app.app_context():
        db.init_db_pool()
        init_redis()

    # Đảm bảo mỗi request có connection và trả lại pool sau khi xong
    @app.before_request
    def before_request():
        db.get_connection()  # gọi để gán vào g

    @app.teardown_appcontext
    def teardown_db(exception=None):
        db.close_connection()

    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        app.logger.exception(error)
        return jsonify({'message': 'Lỗi máy chủ nội bộ', 'error': str(error)}), 500

    # Đăng ký route của bạn
    from routes import main_bp
    app.register_blueprint(main_bp)

    socketio.init_app(app, cors_allowed_origins="*")
    return app

# Khi chạy trực tiếp
if __name__ == '__main__':
    application = create_app()
    try:
        socketio.run(application, debug=True)
    finally:
        db.close_db_pool()  # Đóng pool khi server dừng (ấn Ctrl+C)