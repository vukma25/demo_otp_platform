from services.use_redis import get_redis

def totp_is_used(user_id: str, otp: str) -> bool:
    redis_client = get_redis()
    redis_key = f"totp_used:{user_id}:{otp}"
    is_already_used = redis_client.get(redis_key)
    if is_already_used:
        return True
    else:
        redis_client.set(redis_key, "used", ex=30)
        return False