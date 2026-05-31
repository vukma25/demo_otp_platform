import redis

rd = None

def init_redis():
    global rd
    rd = redis.Redis(host = 'localhost', port = 6379, decode_responses = True)
    print("Khởi tạo redis thành công")
    
def get_redis():
    global rd
    if rd:
        return rd

