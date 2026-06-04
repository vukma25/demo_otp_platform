from services.use_redis import get_redis
from datetime import datetime, timedelta, timezone
import db
import helper.session as ss

def store_redis(email: str, password_hash: str, otp: str, ttl=600) -> str:
    """
    Lưu OTP vào Redis, trả về session_token.
    ttl: thời gian sống (giây), mặc định 10 phút.
    """
    try:
        session_token = ss.generate_session_token()
        otp_hash = ss.hash_otp(otp)
        key = f"otp:reg:{session_token}"
        
        rd = get_redis()
        
        rd.hset(key, mapping={
            "email": email,
            "otp_hash": otp_hash,
            "password_hash": password_hash,
            "attempts": 0
        })
        rd.expire(key, ttl)
        return session_token
    except Exception as e:
        print(f"store_redis error: {e}")
        return None

def store_oracle(email: str, password_hash: str, otp: str) -> str:
    try:
        session_token = ss.generate_session_token()
        otp_hash = ss.hash_otp(otp)
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=10)).replace(tzinfo=None)
        
        conn = db.get_connection()
        c = conn.cursor()
        c.execute("""
            INSERT INTO registration (
                session_token,
                email,
                password_hash
            )
            VALUES (:1, :2, :3)
        """, (
            session_token,
            email,
            password_hash
        ))
        c.execute("""
            INSERT INTO sessions (
                registration_session_token,
                otp_hash,
                expires_at
            ) 
            VALUES (:1, :2, :3)         
        """, (
            session_token,
            otp_hash,
            expires_at
        ))
        conn.commit()
        return session_token
    except Exception as e:
        print(f"store_oracle error: {e}")
        try:
            conn.rollback()
        except Exception:
            pass
        return None