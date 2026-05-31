# routes.py
import oracledb
from flask import Blueprint, request, jsonify, g, make_response
import jwt
import pyotp
from helper.store import store_oracle
from helper.totp_secret_key import encrypt_secret, decrypt_secret, generate_totp_qr_base64
from helper.web_token import \
    generate_access_token, generate_refresh_token, \
    decode_refresh_token, REFRESH_TOKEN_EXPIRE_DAYS
from helper.hash import get_hash, verify_hash_value
from  middleware.auth import auth_required
from services.email import send_email
from helper.verify_email import verify_email_on_oracle
from helper.session import generate_otp
from helper.otp_engine import OTPEngine

main_bp = Blueprint('main', __name__)

DEMO_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"

def email_exists(conn, email: str) -> bool:
    cursor = conn.cursor()

    cursor.execute("""
        SELECT 1
        FROM (
            SELECT email FROM registration
            WHERE email = :email

            UNION ALL

            SELECT email FROM users
            WHERE email = :email
        )
        FETCH FIRST 1 ROWS ONLY
    """, {"email": email})

    row = cursor.fetchone()

    return row is not None

def create_user(conn, email: str, password_hash: str) -> int:
    """Tạo user trong bảng users, trả về id của user mới."""
    cursor = conn.cursor()
    
    # 1. Sinh một secret key thô ngẫu nhiên cho TOTP
    raw_totp_secret = pyotp.random_base32()
    
    # 2. Mã hóa nó trước khi lưu vào cơ sở dữ liệu
    encrypted_secret = encrypt_secret(raw_totp_secret)
    
    sql = """INSERT INTO users (email, password_hash, totp_secret_encrypted)
             VALUES (:email, :password_hash, :totp_secret)
             RETURNING user_id INTO :new_id"""
    out_id = cursor.var(oracledb.DB_TYPE_RAW)
    cursor.execute(sql, {
        'email': email,
        'password_hash': password_hash,
        'totp_secret': encrypted_secret,
        'new_id': out_id
    })
    conn.commit()
    return {
        "user_id": out_id.getvalue()[0].hex(),
        "raw_totp_secret": raw_totp_secret
    }

@main_bp.route('/')
def index():
    return jsonify({"SERVER": "Started"})

# ====================== Demo sinh OTP ===========================
@main_bp.route('/api/otp/verify-totp', methods=['POST'])
def api_verify_totp():
    data = request.get_json()
    otp = data.get('otp', '')
    
    engine = OTPEngine(secret=DEMO_SECRET)
    is_valid = engine.verify_totp(otp)
    
    return jsonify({
        'success': is_valid,
        'message': 'Xác thực thành công' if is_valid else 'OTP không hợp lệ hoặc đã hết hạn!'
    })
    
@main_bp.route('/api/otp/verify-hotp', methods=['POST'])
def api_verify_hotp():
    """API xác minh TOTP"""
    data = request.get_json()
    otp = data.get('otp', '')
    
    engine = OTPEngine(secret=DEMO_SECRET)
    res = engine.verify_hotp(otp)
    print(res)
    
    return jsonify({
        'success': res.get('status', False),
        'message': res.get('des', 'Lỗi xác thực')
    })

@main_bp.route('/api/otp/resync', methods=['POST'])
def api_resync():
    data = request.get_json()
    otps = data.get('otps', [])
    
    engine = OTPEngine(secret=DEMO_SECRET)
    res = engine.resync_hotp_counter(otps)
    
    return jsonify({
        'success': res.get('status', False),
        'message': res.get('des', 'Lỗi xác thực')
    })
    
@main_bp.route('/api/init-hotp')
def init_hotp():
    return jsonify({
        'data': {
            'secret': DEMO_SECRET,
            'counter': 0
        }
    })
    
@main_bp.route('/api/init-totp')
def init_totp():
    return jsonify({
        'data': {
            'secret': DEMO_SECRET,
            'step': 30
        }
    })


# ===================== Ứng dụng OTP =======================
@main_bp.route('/register', methods=['POST'])
def register():
    email = request.form['email']
    password = request.form['password']
    
    if not email or not password:
        return make_response(jsonify({"message": "Thiếu thông tin"}), 400)
    
    conn = g.db_conn
    exist = email_exists(conn, email)
    if exist:
        return make_response(jsonify({"message": "Email đã được sử dụng"}), 400)

    # Hash password ngay
    password_hash = get_hash(password)
    
    otp = generate_otp(6)
    session_token = store_oracle(email, password_hash, otp)  # hoặc redis
    
    success = send_email(email, otp)
    if success: print("Đã gửi email xác thực")
    
    resp = make_response(jsonify({
        "message": "Đã chấp nhận yêu cầu, chờ xác thực email"
    }), 202)
    resp.set_cookie('reg_session', session_token, httponly=True, secure=False, samesite='Lax', max_age=600)
    return resp

@main_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    conn = g.db_conn
    session_token = request.cookies.get('reg_session')
    data = request.get_json()
    user_otp = data.get("otp", "")
    
    result = verify_email_on_oracle(conn, session_token, user_otp)
    
    if result['success']:
        email = result['email']
        password_hash = result['password_hash']
        # Hash mật khẩu (giả sử đã lưu tạm đâu đó hoặc lấy từ form đăng ký trước đó)
        user_info = create_user(conn, email, password_hash)
        
        qr_code_base64 = generate_totp_qr_base64(email, user_info["raw_totp_secret"])
        
        resp = make_response(jsonify({
            "message": "Xác thực email thành công",
            "user_id": user_info["user_id"],
            "qr_code": qr_code_base64
        }))
        resp.delete_cookie('reg_session')
        
        return resp
    
    resp = make_response(jsonify({
        "message": "Xác thực OTP thất bại"
    }), 400)
    return resp

@main_bp.route('/enable-totp', methods=['POST'])
def enable_totp():
    conn = g.db_conn
    data = request.get_json()
    
    user_id_hex = data.get("id")
    totp_code = data.get("otp")
    
    if not user_id_hex or not totp_code:
        return make_response(jsonify({"message": "Thiếu thông tin yêu cầu"}), 400)
        
    cursor = conn.cursor()
    # Truy vấn lấy secret đã mã hóa dựa trên user_id (kiểu RAW)
    cursor.execute("""
        SELECT totp_secret_encrypted FROM users 
        WHERE user_id = HEXTORAW(:user_id)
    """, {"user_id": user_id_hex})
    
    row = cursor.fetchone()
    if not row:
        return make_response(jsonify({"message": "Không tìm thấy người dùng"}), 404)
        
    encrypted_secret = row[0]
    
    print("OK")
    # try:
    # 1. Giải mã chuỗi AES để lấy Secret Key Base32 gốc của TOTP
    raw_secret = decrypt_secret(encrypted_secret)
    print("0")
    # 2. Khởi tạo thực thể TOTP với key gốc
    totp = pyotp.TOTP(raw_secret)
    
    print("1")
    # 3. Xác thực mã 6 số với tham số valid_window=1 (cho phép sai số +-30 giây)
    is_valid = totp.verify(totp_code, valid_window=1)
    print("2")
    if is_valid:
        # Nếu mã đúng, tiến hành cập nhật totp_enable = 1 vào Database
        cursor.execute("""
            UPDATE users 
            SET totp_enable = 1, updated_at = SYS_EXTRACT_UTC(SYSTIMESTAMP)
            WHERE user_id = HEXTORAW(:user_id)
        """, {"user_id": user_id_hex})
        conn.commit()
        print("3")
        return make_response(jsonify({"message": "Kích hoạt xác thực 2 lớp (TOTP) thành công!"}), 200)
    else:
        print("4")
        return make_response(jsonify({"message": "Mã TOTP không chính xác hoặc đã hết hạn"}), 400)
            
    # except Exception as e:
    #     print(str(e))
    #     return make_response(jsonify({"message": f"Lỗi hệ thống xử lý 2FA: {str(e)}"}), 500)

@main_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    conn = g.db_conn
    cursor = conn.cursor()
    cursor.execute("""
        SELECT user_id, password_hash FROM users
        WHERE email = :email
        FETCH FIRST 1 ROWS ONLY          
    """, {"email": email})
    
    row = cursor.fetchone()
    if not row:
        return make_response(jsonify({
            "message": "Email hoặc mật khẩu sai"
        }), 400)
        
    user_id, password_hash = row
    match = verify_hash_value(password, password_hash)
    if not match:
        return make_response(jsonify({
            "message": "Email hoặc mật khẩu sai"
        }), 400)

    uid = user_id.hex()
    # Tạo token
    access_token = generate_access_token(uid).get('token')
    refresh_token, expire = generate_refresh_token(uid).values()
    refresh_token_hash = get_hash(refresh_token)
    
    cursor.execute("""
        INSERT INTO refresh_tokens(user_id, token_hash, expires_at)
        VALUES(:1, :2, :3)        
    """, (uid, refresh_token_hash, expire))
    conn.commit()

    response = make_response(jsonify({
        'access_token': access_token,
        'user': {'user_id': uid, 'email': email}
    }), 200)
    
    response.set_cookie(
        'refresh_token',
        refresh_token,
        httponly=True,
        secure=False, 
        samesite='Lax',
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )
    return response

@main_bp.route('/refresh', methods=['POST'])
def refresh():
    refresh_token = request.cookies.get('refresh_token')
    if not refresh_token:
        return make_response(jsonify({'message': 'Thiếu thông tin'}), 401)
    try:
        user_id = decode_refresh_token(refresh_token)
        
        conn = g.db_conn
        cursor = conn.cursor()
        cursor.execute("""
            SELECT token_hash FROM refresh_tokens
            WHERE user_id = HEXTORAW(:user_id )              
        """, {"user_id": user_id})
        row = cursor.fetchone()
        if not row:
            return make_response(jsonify({'message': 'Refresh token đã hết hạn hoặc bị thu hồi'}), 401)
        
        new_access_token = generate_access_token(user_id).get("token")
        return make_response(jsonify({'access_token': new_access_token}), 200)
    except jwt.ExpiredSignatureError:
        return make_response(jsonify({'message': 'Refresh token đã hết hạn. Tự dộng đăng xuất'}), 401)
    except jwt.InvalidTokenError:
        return make_response(jsonify({'message': 'refresh token không hợp lệ'}), 401)

@main_bp.route('/logout', methods=['POST'])
@auth_required
def logout():
    user_id = request.user
    
    conn = g.db_conn
    cursor = conn.cursor()
    cursor.execute("""
        DELETE FROM refresh_tokens
        WHERE user_id = HEXTORAW(:user_id)               
    """, {"user_id": user_id})
    conn.commit()
    
    response = make_response(jsonify({'message': 'Đăng xuất thành công'}))
    response.delete_cookie('refresh_token')
    return response

@main_bp.route('/logout-force', methods=['POST'])
def logout_force():
    user_id = request.get_json().get("id")
    conn = g.db_conn
    cursor = conn.cursor()
    cursor.execute("""
        DELETE FROM refresh_tokens
        WHERE user_id = HEXTORAW(:user_id)               
    """, {"user_id": user_id})
    conn.commit()
    
    response = make_response(jsonify({'message': 'Đăng xuất thành công'}))
    response.delete_cookie('refresh_token')
    return response
    
    
        
        