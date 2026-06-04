import redis

rd = None

def init_redis():
    global rd
    try:
        rd = redis.Redis(host='localhost', port=6379, decode_responses=True)
        rd.ping()
        print("Khởi tạo redis thành công")
    except Exception as e:
        rd = None
        print(f"Không thể kết nối Redis: {e}")
    

def get_redis():
    global rd
    if rd is None:
        try:
            init_redis()
        except Exception as e:
            raise ConnectionError(f"Redis chưa được khởi tạo hoặc không thể kết nối: {e}")
    return rd

