import os
from datetime import datetime, timedelta, timezone
import hashlib
import jwt
from dotenv import load_dotenv

load_dotenv()

ACCESS_TOKEN_EXPIRE_MINUTES=1
REFRESH_TOKEN_EXPIRE_DAYS=3


def generate_access_token(user_id):
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        'user_id': user_id,
        'exp': expire,
        'type': 'access'
    }
    return {"token": jwt.encode(payload, os.getenv("SECRET_KEY"), os.getenv("ALGORITHM")), "expire": expire}

def generate_refresh_token(user_id):
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        'user_id': user_id,
        'exp': expire,
        'type': 'refresh'
    }
    return {"token": jwt.encode(payload, os.getenv("REFRESH_SECRET_KEY"), os.getenv("ALGORITHM")), "expire": expire}

def decode_access_token(access_token):
    try:
        payload = jwt.decode(
            access_token, 
            os.getenv('SECRET_KEY'), 
            os.getenv("ALGORITHM")
        )
        return payload.get('user_id')
    except Exception:
        raise

def decode_refresh_token(refresh_token):
    try:
        payload = jwt.decode(
            refresh_token, 
            os.getenv('REFRESH_SECRET_KEY'), 
            os.getenv("ALGORITHM")
        )
        return payload.get('user_id')
    except Exception:
        raise
    
def hash_token(token):
    return hashlib.sha256(token.encode('utf-8')).hexdigest()