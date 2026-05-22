import os
import json
import time
import qrcode
import base64
import pyotp
from io import BytesIO
from flask import Flask, request, jsonify, render_template, session
from flask_cors import CORS
from otp_engine import OTPEngine

app = Flask(__name__)
app.secret_key = os.urandom(24)
CORS(app)

# ============================================
# KHỞI TẠO ENGINE VÀ DỮ LIỆU GIẢ LẬP
# ============================================

# Tạo secret key cố định để demo (dễ theo dõi)
DEMO_SECRET = "JBSWY3DPEHPK3PXP"
otp_engine = OTPEngine(secret=DEMO_SECRET)

# Database giả lập
users_db = {
    "demo@example.com": {
        "password": "Demo@123",
        "totp_secret": DEMO_SECRET,
        "hotp_counter": 0,
        "verified": False
    }
}

# Lưu trữ OTP tạm thời (trong thực tế dùng Redis)
pending_otps = {}

# ============================================
# API: MODULE SINH OTP VỚI VISUALIZATION
# ============================================

@app.route('/')
def index():
    """Trang chủ - Dashboard"""
    return render_template('index.html')

@app.route('/otp-generator')
def otp_generator():
    """Trang sinh OTP với visualization"""
    return render_template('otp_generator.html', secret=DEMO_SECRET)

@app.route('/api/otp/generate-totp', methods=['POST'])
def api_generate_totp():
    """
    API sinh TOTP kèm debug info.
    
    Request body (optional):
    {
        "secret": "JBSWY3DPEHPK3PXP",  // nếu không gửi sẽ dùng secret mặc định
        "interval": 30,
        "digits": 6
    }
    """
    data = request.get_json() or {}
    secret = data.get('secret', DEMO_SECRET)
    interval = data.get('interval', 30)
    digits = data.get('digits', 6)
    
    engine = OTPEngine(secret=secret)
    result = engine.generate_totp(interval=interval, digits=digits)
    
    return jsonify({
        'success': True,
        'data': result
    })

@app.route('/api/otp/generate-hotp', methods=['POST'])
def api_generate_hotp():
    """
    API sinh HOTP kèm debug info.
    
    Request body:
    {
        "secret": "JBSWY3DPEHPK3PXP",
        "counter": 0,
        "digits": 6
    }
    """
    data = request.get_json() or {}
    secret = data.get('secret', DEMO_SECRET)
    counter = data.get('counter', 0)
    digits = data.get('digits', 6)
    
    engine = OTPEngine(secret=secret)
    result = engine.generate_hotp(counter=counter, digits=digits)
    
    return jsonify({
        'success': True,
        'data': result
    })

@app.route('/api/otp/verify-totp', methods=['POST'])
def api_verify_totp():
    """API xác minh TOTP"""
    data = request.get_json()
    secret = data.get('secret', DEMO_SECRET)
    otp = data.get('otp', '')
    
    engine = OTPEngine(secret=secret)
    is_valid = engine.verify_totp(otp)
    
    return jsonify({
        'success': True,
        'data': {
            'otp': otp,
            'valid': is_valid,
            'message': 'OTP hợp lệ!' if is_valid else 'OTP không hợp lệ hoặc đã hết hạn!'
        }
    })
    
@app.route('/api/otp/verify-hotp', methods=['POST'])
def api_verify_hotp():
    """API xác minh TOTP"""
    data = request.get_json()
    secret = data.get('secret', DEMO_SECRET)
    otp = data.get('otp', '')
    
    engine = OTPEngine(secret=secret)
    is_valid = engine.verify_hotp(otp, counter=0)
    
    return jsonify({
        'success': True,
        'data': {
            'otp': otp,
            'valid': is_valid,
            'message': 'OTP hợp lệ!' if is_valid else 'OTP không hợp lệ hoặc đã hết hạn!'
        }
    })

# ============================================
# API: MODULE ĐĂNG KÝ VỚI OTP QUA EMAIL
# ============================================

@app.route('/register')
def register_page():
    """Trang đăng ký"""
    return render_template('register.html')

@app.route('/api/register/send-otp', methods=['POST'])
def api_register_send_otp():
    """
    Bước 1: Gửi OTP qua email để xác thực đăng ký.
    Trong demo này, chúng ta sẽ giả lập việc gửi email
    và trả về OTP ở response (để dễ test).
    """
    data = request.get_json()
    email = data.get('email', '')
    password = data.get('password', '')
    
    # Validate
    if not email or not password:
        return jsonify({
            'success': False,
            'message': 'Vui lòng nhập đầy đủ email và mật khẩu!'
        }), 400
    
    if email in users_db:
        return jsonify({
            'success': False,
            'message': 'Email đã tồn tại trong hệ thống!'
        }), 400
    
    # Sinh TOTP
    otp_result = otp_engine.generate_totp(interval=300)  # OTP có hiệu lực 5 phút
    otp = otp_result['otp']
    
    # Lưu tạm thời
    pending_otps[email] = {
        'type': 'register',
        'otp': otp,
        'password': password,
        'created_at': time.time(),
        'expires_in': 300
    }
    
    # Giả lập gửi email (trong thực tế dùng SMTP hoặc dịch vụ như SendGrid)
    print(f"""
    ============================================
    📧 GIẢ LẬP GỬI EMAIL
    Đến: {email}
    Tiêu đề: Xác thực đăng ký tài khoản
    Nội dung: Mã OTP của bạn là: {otp}
    Mã OTP có hiệu lực trong 5 phút.
    ============================================
    """)
    
    return jsonify({
        'success': True,
        'message': 'OTP đã được gửi đến email của bạn! (Kiểm tra console để xem OTP)',
        'data': {
            'email': email,
            'otp_debug': otp,  # Chỉ hiển thị trong demo, thực tế không trả về
            'expires_in': 300
        }
    })

@app.route('/api/register/verify-otp', methods=['POST'])
def api_register_verify_otp():
    """
    Bước 2: Xác minh OTP và hoàn tất đăng ký.
    """
    data = request.get_json()
    email = data.get('email', '')
    otp_input = data.get('otp', '')
    
    # Validate
    if email not in pending_otps:
        return jsonify({
            'success': False,
            'message': 'Không tìm thấy yêu cầu xác thực cho email này!'
        }), 400
    
    pending = pending_otps[email]
    
    # Kiểm tra hết hạn
    if time.time() - pending['created_at'] > pending['expires_in']:
        del pending_otps[email]
        return jsonify({
            'success': False,
            'message': 'OTP đã hết hạn! Vui lòng yêu cầu gửi lại.'
        }), 400
    
    # Kiểm tra OTP
    if otp_input != pending['otp']:
        return jsonify({
            'success': False,
            'message': 'OTP không chính xác!'
        }), 400
    
    # Đăng ký thành công
    users_db[email] = {
        'password': pending['password'],
        'totp_secret': DEMO_SECRET,
        'hotp_counter': 0,
        'verified': True
    }
    
    # Xóa OTP tạm
    del pending_otps[email]
    
    return jsonify({
        'success': True,
        'message': 'Đăng ký thành công! Bạn có thể đăng nhập ngay bây giờ.',
        'data': {
            'email': email
        }
    })

# ============================================
# API: MODULE ĐĂNG NHẬP VỚI OTP QUA APP
# ============================================

@app.route('/login')
def login_page():
    """Trang đăng nhập"""
    return render_template('login.html')

@app.route('/api/login/request-otp', methods=['POST'])
def api_login_request_otp():
    """
    Bước 1: Yêu cầu OTP để đăng nhập (giả lập gửi qua App).
    """
    data = request.get_json()
    email = data.get('email', '')
    password = data.get('password', '')
    
    # Xác thực email + password
    if email not in users_db:
        return jsonify({
            'success': False,
            'message': 'Email không tồn tại!'
        }), 401
    
    if users_db[email]['password'] != password:
        return jsonify({
            'success': False,
            'message': 'Mật khẩu không chính xác!'
        }), 401
    
    # Sinh HOTP (dùng counter từ DB)
    counter = users_db[email]['hotp_counter']
    hotp_result = otp_engine.generate_hotp(counter=counter)
    otp = hotp_result['otp']
    
    # Lưu tạm
    pending_otps[email] = {
        'type': 'login',
        'otp': otp,
        'counter': counter,
        'created_at': time.time(),
        'expires_in': 60  # HOTP thường có hiệu lực ngắn hơn
    }
    
    # Giả lập gửi OTP qua App (Push Notification)
    print(f"""
    ============================================
    📱 GIẢ LẬP GỬI OTP QUA APP
    Đến: {email}
    Nội dung push: Mã OTP đăng nhập của bạn là: {otp}
    Counter: {counter}
    ============================================
    """)
    
    return jsonify({
        'success': True,
        'message': 'OTP đã được gửi đến App của bạn! (Kiểm tra console)',
        'data': {
            'email': email,
            'otp_debug': otp,
            'counter': counter
        }
    })

@app.route('/api/login/verify-otp', methods=['POST'])
def api_login_verify_otp():
    """
    Bước 2: Xác minh OTP và hoàn tất đăng nhập.
    """
    data = request.get_json()
    email = data.get('email', '')
    otp_input = data.get('otp', '')
    
    if email not in pending_otps or pending_otps[email]['type'] != 'login':
        return jsonify({
            'success': False,
            'message': 'Không tìm thấy yêu cầu đăng nhập!'
        }), 400
    
    pending = pending_otps[email]
    
    # Kiểm tra hết hạn
    if time.time() - pending['created_at'] > pending['expires_in']:
        del pending_otps[email]
        return jsonify({
            'success': False,
            'message': 'OTP đã hết hạn!'
        }), 400
    
    # Kiểm tra OTP
    if otp_input != pending['otp']:
        return jsonify({
            'success': False,
            'message': 'OTP không chính xác!'
        }), 400
    
    # Đăng nhập thành công, tăng counter
    users_db[email]['hotp_counter'] += 1
    session['user'] = email
    
    # Xóa OTP tạm
    del pending_otps[email]
    
    return jsonify({
        'success': True,
        'message': 'Đăng nhập thành công!',
        'data': {
            'email': email,
            'new_counter': users_db[email]['hotp_counter']
        }
    })

@app.route('/api/dashboard')
def api_dashboard():
    """API kiểm tra trạng thái hệ thống"""
    return jsonify({
        'success': True,
        'data': {
            'demo_secret': DEMO_SECRET,
            'registered_users': len(users_db),
            'pending_otps': len(pending_otps),
            'current_totp': otp_engine.generate_totp()['otp']
        }
    })

# ============================================
# CHẠY ỨNG DỤNG
# ============================================

if __name__ == '__main__':
    print("=" * 60)
    print("🔐 OTP DEMO SYSTEM - SOCIAL ENGINEERING")
    print("=" * 60)
    print(f"📌 Secret Key Demo: {DEMO_SECRET}")
    print(f"📧 Email demo: demo@example.com / Demo@123")
    print(f"🌐 Truy cập: http://localhost:5000")
    print("=" * 60)
    app.run(debug=True, host='0.0.0.0', port=5000)