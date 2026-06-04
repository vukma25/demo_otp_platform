from services.use_redis import get_redis
from helper.session import hash_otp
from datetime import datetime, timezone
import pyotp
from .totp_secret_key import decrypt_secret

MAX_ATTEMPTS = 5

def verify_email_on_redis(session_token: str, user_otp: str):
    key = f"otp:reg:{session_token}"
    r = get_redis()
    data = r.hgetall(key)
    
    if not data:
        return {"success": False, "error": "Mã xác minh không tồn tại hoặc đã hết hạn."}
    
    attempts = int(data.get("attempts", 0))
    if attempts >= MAX_ATTEMPTS:
        r.delete(key)
        return {"success": False, "error": "Bạn đã thử quá nhiều lần."}
    
    if hash_otp(user_otp) != data["otp_hash"]:
        r.hincrby(key, "attempts", 1)
        new_attempts = int(r.hget(key, "attempts"))  # lấy giá trị mới
        return {"success": False, "error": "Mã OTP không đúng.", "attempt": new_attempts}
    
    # Thành công: lấy dữ liệu, xóa key
    email = data["email"]
    password_hash = data["password_hash"]
    full_name = data.get("full_name", "")
    r.delete(key)
    return {
        "success": True,
        "email": email,
        "password_hash": password_hash,
    }

def verify_email_on_oracle(conn, session_token: str, user_otp: str) -> dict:
    """Kiểm tra OTP, cập nhật số lần thử nếu sai. Trả về dict kết quả."""
    cursor = conn.cursor()
    # Lấy thông tin bản ghi OTP
    cursor.execute("""
        SELECT r.email, s.otp_hash, s.attempts, s.expires_at
        FROM registration r, sessions s
        WHERE r.session_token = s.registration_session_token AND r.session_token = :token
    """, {'token': session_token})
    row = cursor.fetchone()
    
    if not row:
        return {"success": False, "error": "Mã xác minh không tồn tại."}
    
    print(row)
    email, otp_hash, attempts = row[0], row[1], row[2]
    
    if otp_hash is None:
        return {"success": False, "error": "Vui lòng yêu cầu mã mới."}
    # Kiểm tra số lần thử
    if attempts >= MAX_ATTEMPTS:
        cursor.execute("""
            UPDATE sessions
            SET otp_hash = NULL
            WHERE registration_session_token = :token""", 
        {'token': session_token})
        conn.commit()
        return {"success": False, "error": "Bạn đã thử quá nhiều lần. Vui lòng yêu cầu mã mới."}
    
    # So sánh hash
    if hash_otp(user_otp) != otp_hash:
        # Tăng attempts
        new_attempt = cursor.var(int)
        cursor.execute("""
            UPDATE sessions
            SET attempts = attempts + 1
            WHERE registration_session_token = :token
            RETURNING attempts INTO :new_att
        """, {'token': session_token, 'new_att': new_attempt})
        conn.commit()
        
        attempts_value = new_attempt.getvalue()[0]
        return {"success": False, "error": "Mã OTP không đúng.", "remain_attempt": MAX_ATTEMPTS - attempts_value}
    
    # Thành công: xóa bản ghi OTP
    pw_hash = cursor.var(str)
    cursor.execute("""
        DELETE FROM registration WHERE session_token = :token
        RETURNING password_hash INTO :pw_hash
    """, {'token': session_token, "pw_hash": pw_hash})
    conn.commit()
    return {"success": True, "email": email, "password_hash": pw_hash.getvalue()[0]}

def verify_totp(conn, user_id_hex: str, totp_code: str):
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT totp_secret_encrypted FROM users 
            WHERE user_id = HEXTORAW(:user_id)
        """, {"user_id": user_id_hex})
        
        row = cursor.fetchone()
        if not row:
            return False
            
        encrypted_secret = row[0]

        raw_secret = decrypt_secret(encrypted_secret)
        totp = pyotp.TOTP(raw_secret)
        return totp.verify(totp_code, valid_window=1)
    except Exception as e:
        print(f"verify_totp error: {e}")
        return False