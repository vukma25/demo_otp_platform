from services.use_redis import get_redis
from helper.session import hash_otp
from datetime import datetime, timezone

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
        SELECT email, otp_hash, attempts, expires_at
        FROM registration
        WHERE session_token = :token
    """, {'token': session_token})
    row = cursor.fetchone()
    
    if not row:
        return {"success": False, "error": "Mã xác minh không tồn tại."}
    
    email, otp_hash_stored, attempts, expires_at = row
    
    if datetime.now(timezone.utc).replace(tzinfo=None) > expires_at:
        # Xóa bản ghi hết hạn
        cursor.execute("DELETE FROM registration WHERE session_token = :token", {'token': session_token})
        conn.commit()
        return {"success": False, "error": "Mã đã hết hạn."}
    
    # Kiểm tra số lần thử
    if attempts >= MAX_ATTEMPTS:
        cursor.execute("DELETE FROM registration WHERE session_token = :token", {'token': session_token})
        conn.commit()
        return {"success": False, "error": "Bạn đã thử quá nhiều lần. Vui lòng yêu cầu mã mới."}
    
    # So sánh hash
    if hash_otp(user_otp) != otp_hash_stored:
        # Tăng attempts
        new_attempt = cursor.var(int)
        cursor.execute("""
            UPDATE registration
            SET attempts = attempts + 1
            WHERE session_token = :token
            RETURNING attempts INTO :new_att
        """, {'token': session_token, 'new_att': new_attempt})
        conn.commit()
        
        attempts_value = new_attempt.getvalue()[0]
        return {"success": False, "error": "Mã OTP không đúng.", "attempt": attempts_value}
    
    # Thành công: xóa bản ghi OTP
    pw_hash = cursor.var(str)
    cursor.execute("""
        DELETE FROM registration WHERE session_token = :token
        RETURNING password_hash INTO :pw_hash
    """, {'token': session_token, "pw_hash": pw_hash})
    conn.commit()
    return {"success": True, "email": email, "password_hash": pw_hash.getvalue()[0]}