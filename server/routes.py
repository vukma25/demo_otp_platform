# routes.py
import oracledb
from flask import Blueprint, request, jsonify, g, make_response
import jwt
import pyotp
from datetime import datetime, timedelta, timezone
from helper.store import store_oracle
from helper.totp_secret_key import encrypt_secret, generate_totp_qr_base64
from helper.web_token import \
    generate_access_token, generate_refresh_token, \
    decode_refresh_token, REFRESH_TOKEN_EXPIRE_DAYS, \
    generate_login_session_token, decode_login_session_token
from helper.hash import get_hash, verify_hash_value
from middleware.auth import auth_required
from services.email import send_email
from helper.verify import verify_email_on_oracle, verify_totp, MAX_ATTEMPTS
from helper.session import generate_otp, hash_otp
from helper.otp_engine import OTPEngine
from helper.prevent_brute_force import limit_attempt

main_bp = Blueprint('main', __name__)

DEMO_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"
SESSION_EXPIRE = 10

def email_exists_on_table(conn, email: str, table_name="users") -> bool:
    cursor = conn.cursor()

    cursor.execute(f"""
        SELECT * FROM {table_name}
        WHERE email = :email
        FETCH FIRST 1 ROWS ONLY
    """, {"email": email})

    row = cursor.fetchone()

    return row

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
    exist_registration = email_exists_on_table(conn, email, table_name="registration")
    if exist_registration is not None:
        session_token = exist_registration[0]
        password_hash = exist_registration[2]
        created_at = exist_registration[3]
        time_life = created_at + timedelta(minutes=SESSION_EXPIRE)
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        age = int((time_life - now).total_seconds())
        pw_hash = get_hash(password)
        
        if password_hash != pw_hash:
            conn.cursor().execute("""
                UPDATE registration SET password_hash = :pw_hash WHERE email = :email                     
            """, {"pw_hash": pw_hash, "email": email})
            conn.commit()
        
        response = make_response(jsonify({"message": "Tồn tại phiên đăng ký đang chờ xác thực email"}), 200)
        response.set_cookie('reg_session', session_token, httponly=True, secure=False, samesite='Lax', max_age=age)
        return response
    
    exist_user = email_exists_on_table(conn, email)
    if exist_user is not None:
        return make_response(jsonify({"message": "Email đã được sử dụng"}), 400)

    # Hash password ngay
    password_hash = get_hash(password)
    
    otp = generate_otp(6)
    session_token = store_oracle(email, password_hash, otp)
    
    success = send_email(email, otp)
    if success: print("Đã gửi email xác thực")
    
    resp = make_response(jsonify({
        "message": "Đã chấp nhận yêu cầu, chờ xác thực email"
    }), 202)
    resp.set_cookie('reg_session', session_token, httponly=True, secure=False, samesite='Lax', max_age=SESSION_EXPIRE * 60)
    return resp

@main_bp.route('/verify-email', methods=['POST'])
def verify_email():
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
        }), 200)
        resp.delete_cookie('reg_session')
        
        return resp
    else:
        resp = make_response(jsonify({
            "message": "Xác thực OTP thất bại",
            "error": result.get("error"),
            "attempt": result.get("remain_attempt", 0)
        }), 401)
        return resp

@main_bp.route('/resend-verify-email', methods=['POST'])
def resend_otp_verify_email():
    conn = g.db_conn
    reg_session = request.cookies.get('reg_session')
    email = request.get_json().get("email")
    if not reg_session:
        return make_response(jsonify({"message":"Phiên đăng ký hết hạn. Hãy tiến hành đăng ký lại"}), 400)
    
    cursor = conn.cursor()
    cursor.execute("""
        SELECT email FROM registration
        WHERE session_token = :session_token               
    """, {"session_token": reg_session})
    row = cursor.fetchone()
    if row is None:
        return make_response(jsonify({"message":"Không tìm thấy phiên đăng ký hoặc đã hết hạn"}), 404)
    
    email = row[0]
    new_otp = generate_otp()
    new_hash_otp = hash_otp(new_otp)
    
    cursor.execute("""
        UPDATE sessions
        SET otp_hash = :new_hash_otp, attempts = 0
        WHERE registration_session_token = :reg_session
    """, {"new_hash_otp": new_hash_otp, "reg_session": reg_session})
    conn.commit()
    
    send_email(email, new_otp)
    
    return make_response(jsonify({"message": "Gửi mã xác thực thành công"}))

@main_bp.route('/enable-totp', methods=['POST'])
def enable_totp():
    try:
        conn = g.db_conn
        data = request.get_json()
        
        user_id_hex = data.get("id")
        totp_code = data.get("otp")
        
        if not user_id_hex or not totp_code:
            return make_response(jsonify({"message": "Thiếu thông tin yêu cầu"}), 400)
            
        is_valid = verify_totp(conn, user_id_hex, totp_code)
        if is_valid is None:
            return make_response(jsonify({"message": "Không thể tìm thấy người dùng"}), 404)
        
        if is_valid:
            conn.cursor().execute("""
                UPDATE users 
                SET totp_enable = 1, updated_at = SYS_EXTRACT_UTC(SYSTIMESTAMP)
                WHERE user_id = HEXTORAW(:user_id)
            """, {"user_id": user_id_hex})
            conn.commit()
            return make_response(jsonify({"message": "Kích hoạt xác thực 2 lớp (TOTP) thành công!"}), 200)
        else:
            return make_response(jsonify({"message": "Mã TOTP không chính xác hoặc đã hết hạn"}), 400)
            
    except Exception as e:
        return make_response(jsonify({"message": f"Lỗi hệ thống xử lý 2FA: {str(e)}"}), 500)

@main_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    conn = g.db_conn
    cursor = conn.cursor()
    cursor.execute("""
        SELECT user_id, password_hash, totp_enable FROM users
        WHERE email = :email
        FETCH FIRST 1 ROWS ONLY          
    """, {"email": email})
    
    row = cursor.fetchone()
    if not row:
        return make_response(jsonify({"message": "Email hoặc mật khẩu sai"}), 400)
        
    user_id_bytes, password_hash, totp_enable = row
    user_id_hex = user_id_bytes.hex()
    is_totp = bool(totp_enable)
    
    match = verify_hash_value(password, password_hash)
    if not match:
        return make_response(jsonify({"message": "Email hoặc mật khẩu sai"}), 400)
    
    # nếu như tồn tại phiên đăng nhập
    cursor.execute("""
        SELECT session_id, expires_at FROM sessions
        WHERE user_id = HEXTORAW(:user_id)
        FETCH FIRST 1 ROWS ONLY          
    """, {"user_id": user_id_hex})
    session = cursor.fetchone()
    if session:
        otp_type_label = "totp" if is_totp else "hotp"
        session_id = session[0]
        expires_at = session[1]
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        age = int((expires_at - now).total_seconds())
        
        token = generate_login_session_token(
            session_id, user_id_hex, email, 
            otp_type_label, expire)
    
        response = make_response(jsonify({
            "message": "Phiên đăng nhập đang diễn ra. Chờ xác thực OTP", 
            "otp_type": otp_type_label
        }), 200)
        
        response.set_cookie(
            'login_session_token',
            token,
            httponly=True,
            secure=False,
            samesite='Lax',
            max_age=age
        )
        
        return response
    #============================================================================

    expire = datetime.now(timezone.utc) + timedelta(minutes=SESSION_EXPIRE)
    if not is_totp:
        otp = generate_otp()
        otp_hash = hash_otp(otp)
        
        session_id_var = cursor.var(oracledb.DB_TYPE_RAW)
        cursor.execute("""
            INSERT INTO sessions (user_id, otp_hash, expires_at)
            VALUES (HEXTORAW(:1), :2, :3)
            RETURNING session_id INTO :4          
        """, (user_id_hex, otp_hash, expire, session_id_var))
        conn.commit()
        
        send_email(email, otp)
        otp_type_label = "hotp"
    else:
        session_id_var = cursor.var(oracledb.DB_TYPE_RAW)
        cursor.execute("""
            INSERT INTO sessions (user_id, expires_at)
            VALUES (HEXTORAW(:1), :2)
            RETURNING session_id INTO :3          
        """, (user_id_hex, expire, session_id_var))
        conn.commit()
        otp_type_label = "totp"

    session_id_hex = session_id_var.getvalue()[0].hex()
    token = generate_login_session_token(session_id_hex, user_id_hex, email, otp_type_label, expire)
    
    response = make_response(jsonify({
        "message": "Thông tin đăng nhập hợp lệ. Chờ xác thực OTP", 
        "otp_type": otp_type_label
    }), 200)
    
    response.set_cookie(
        'login_session_token',
        token,
        httponly=True,
        secure=False,
        samesite='Lax',
        max_age=SESSION_EXPIRE * 60
    )
    
    return response

@main_bp.route('/login-completed', methods=['POST'])
def login_completed():
    conn = g.db_conn
    login_session_token = request.cookies.get("login_session_token")
    otp = request.get_json().get("otp")
    if not login_session_token:
        return make_response(jsonify({'message': 'Thiếu thông tin'}), 401)
    if not otp:
        return make_response(jsonify({'message': 'Thiếu otp'}), 400)
    
    payload = decode_login_session_token(login_session_token)
    user_id = payload.get("user_id")
    session_id =payload.get("session_id")
    email = payload.get("email")
    
    cursor = conn.cursor()
    cursor.execute("""
        SELECT otp_hash, attempts FROM sessions
        WHERE session_id = HEXTORAW(:session_id)
    """, {"session_id": session_id})
    row = cursor.fetchone()
    
    if not row:
        return make_response(jsonify({"message": "Không tìm thấy phiên đăng nhập"}), 404)
    
    hash_otp_stored, attempts = row
        
    if hash_otp_stored is None:
        is_valid = verify_totp(conn, user_id, otp)
        if not is_valid:
            new_attempt = limit_attempt(conn, session_id, attempts, MAX_ATTEMPTS)
            response = make_response(jsonify({"message": "Mã OTP không chính xác", "remain_attempts": new_attempt}), 400)
            if not bool(new_attempt):
                response = make_response(jsonify({"message": "Bạn đã vượt ngưỡng xác minh cho phép. Vui lòng tiên hành đăng nhập lại"}), 400)
                response.delete_cookie('login_session_token')
            return response
    else:
        if hash_otp(otp) != hash_otp_stored:
            new_attempt = limit_attempt(conn, session_id, attempts, MAX_ATTEMPTS)
            response = make_response(jsonify({"message": "Mã OTP không chính xác", "remain_attempts": new_attempt}), 400)
            if not bool(new_attempt):
                response = make_response(jsonify({"message": "Bạn đã vượt ngưỡng xác minh cho phép. Vui lòng tiên hành đăng nhập lại"}), 400)
                response.delete_cookie('login_session_token')
            return response
    
    
    # Tạo token
    access_token = generate_access_token(user_id).get('token')
    refresh_token, expire = generate_refresh_token(user_id).values()
    refresh_token_hash = get_hash(refresh_token)
    
    cursor.execute("""DELETE FROM sessions WHERE session_id = HEXTORAW(:session_id)""", {"session_id": session_id})
    cursor.execute("""
        INSERT INTO refresh_tokens(user_id, token_hash, expires_at)
        VALUES(HEXTORAW(:1), :2, :3)        
    """, (user_id, refresh_token_hash, expire))
    conn.commit()

    response = make_response(jsonify({
        'access_token': access_token,
        'user': {'user_id': user_id, 'email': email}
    }), 200)
    
    response.delete_cookie('login_session_token')
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
    
# ============ Duy trì trạng thái bên client =============
@main_bp.route('/register-state', methods=['GET'])
def register_state():
    conn = g.db_conn
    reg_session = request.cookies.get("reg_session")
    if reg_session:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 1 FROM sessions
            WHERE registration_session_token = :reg_session                      
        """, {"reg_session": reg_session})
        row = cursor.fetchone()
        if row:
            return make_response(jsonify({"message": "Hãy hoàn thành nốt bước xác thực"}), 202)
        else:
            response = make_response(jsonify({"message":"Phiên đăng ký đã bị hủy"}), 200)
            response.delete_cookie("reg_session")
            return response
    
    return make_response(jsonify({"message": "Chưa tồn tại phiên đăng kí nào"}), 200)

@main_bp.route('/login-state', methods=['GET'])
def login_state():
    conn = g.db_conn
    login_session_token = request.cookies.get("login_session_token")
    if login_session_token:
        payload = decode_login_session_token(login_session_token)
        session_id =payload.get("session_id")
        email = payload.get("email")
        type_otp = payload.get("type_otp")
        
        cursor = conn.cursor()
        cursor.execute("""
            SELECT 1 FROM sessions
            WHERE session_id = HEXTORAW(:session_id)                      
        """, {"session_id": session_id})
        row = cursor.fetchone()
        if row:
            return make_response(jsonify({"message": "Hãy nhập mã OTP và hoàn thành phiên đăng nhập", "email": email, "otp_type": type_otp}), 202)
        else:
            response = make_response(jsonify({"message":"Phiên đăng nhập đã bị hủy"}), 200)
            response.delete_cookie("login_session_token")
            return response
    
    return make_response(jsonify({"message": "Chưa tồn tại phiên đăng nhập nào"}), 200)
        
        