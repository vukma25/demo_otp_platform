from services.use_redis import get_redis
from datetime import datetime, timedelta, timezone
import db
import helper.session as ss

def store_redis(email: str, password_hash: str, otp: str, ttl=600) -> str:
    """
    Lưu OTP vào Redis, trả về session_token.
    ttl: thời gian sống (giây), mặc định 10 phút.
    """
    session_token = ss.generate_session_token()
    otp_hash = ss.hash_otp(otp)
    key = f"otp:reg:{session_token}"
    
    rd = get_redis()
    
    # Dùng hash để lưu các trường
    rd.hset(key, mapping={
        "email": email,
        "otp_hash": otp_hash,
        "password_hash": password_hash,
        "attempts": 0
    })
    rd.expire(key, ttl)
    
    return session_token

def store_oracle(email: str, password_hash: str, otp: str) -> str:
    session_token = ss.generate_session_token()
    otp_hash = ss.hash_otp(otp)
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=10)).replace(tzinfo=None)
    
    conn = db.get_connection()
    c = conn.cursor()
    c.execute("""
        INSERT INTO registration (
            session_token,
            email,
            otp_hash,
            expires_at,
            password_hash
        )
        VALUES (:1, :2, :3, :4, :5)
    """, (
        session_token,
        email,
        otp_hash,
        expires_at,
        password_hash
    ))
    conn.commit()
    
    return session_token