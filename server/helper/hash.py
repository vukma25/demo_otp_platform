import hashlib
import bcrypt

def _reduce_size(value: str):
    return hashlib.sha256(value.encode('utf-8')).hexdigest()

def get_hash(value: str, r=12) -> str:
    value_bytes = _reduce_size(value).encode('utf-8')
    
    salt = bcrypt.gensalt(rounds=r)
    
    hashed_bytes = bcrypt.hashpw(value_bytes, salt)
    
    return hashed_bytes.decode('utf-8')


def verify_hash_value(value: str, stored_hash: str) -> bool:
    value_bytes = _reduce_size(value).encode('utf-8')
    stored_hash_bytes = stored_hash.encode('utf-8')
    
    return bcrypt.checkpw(value_bytes, stored_hash_bytes)