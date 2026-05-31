# app.py
import os
from flask import Flask
from flask_cors import CORS
from services.use_redis import init_redis
import db
from services.email import mail
from dotenv import load_dotenv

load_dotenv()

def create_app():
    app = Flask(__name__)
    app.config['MAIL_SERVER'] = 'smtp.gmail.com'
    app.config['MAIL_PORT'] = 587
    app.config['MAIL_USE_TLS'] = True
    app.config['MAIL_USERNAME'] = os.getenv("MAIL")
    app.config['MAIL_PASSWORD'] = os.getenv("APP_PWD")
    app.config['MAIL_DEFAULT_SENDER'] = ('App Notification', os.getenv("MAIL"))
    
    mail.init_app(app)
    app.secret_key = 'your-secret-key'  # cần cho session, flash...
    CORS(
        app,
        supports_credentials=True
    )

    # Khởi tạo pool NGAY khi app được tạo (trước request đầu tiên)
    with app.app_context():
        db.init_db_pool()
        # init_redis()

    # Đảm bảo mỗi request có connection và trả lại pool sau khi xong
    @app.before_request
    def before_request():
        db.get_connection()  # gọi để gán vào g

    @app.teardown_appcontext
    def teardown_db(exception=None):
        db.close_connection()

    # Đăng ký route của bạn
    from routes import main_bp
    app.register_blueprint(main_bp)

    return app

# Khi chạy trực tiếp
if __name__ == '__main__':
    application = create_app()
    try:
        application.run(debug=True)
    finally:
        db.close_db_pool()  # Đóng pool khi server dừng (ấn Ctrl+C)