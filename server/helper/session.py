import secrets
import hashlib
import hmac
import os
from dotenv import load_dotenv

load_dotenv()
OTP_SECRET = os.getenv("OTP_HASH_SECRET").encode()  # bytes

def generate_otp(length=6):
    """Tạo OTP dạng chuỗi chữ số độ dài length."""
    min_val = 10**(length-1)
    max_val = 10**length - 1
    return str(secrets.randbelow(max_val - min_val + 1) + min_val)

def generate_session_token():
    """Tạo session token 32 byte hex."""
    return secrets.token_hex(32)  # 64 ký tự hex

def hash_otp(otp: str) -> str:
    """Hash OTP bằng HMAC-SHA256 với secret server."""
    return hmac.new(OTP_SECRET, otp.encode(), hashlib.sha256).hexdigest()