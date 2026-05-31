# db.py
import os
import oracledb
from dotenv import load_dotenv
from flask import g

load_dotenv()

pool = None

def init_db_pool():
    global pool
    pool = oracledb.create_pool(
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        dsn=os.getenv("DB_DSN"),
        min=2,
        max=10,
        increment=1
    )
    print("Oracle pool đã được tạo.")

def close_db_pool():
    global pool
    if pool:
        pool.close()
        print("Đã đóng Oracle pool.")

def get_connection():
    """Lấy một connection từ pool, gán vào Flask g."""
    if 'db_conn' not in g:
        g.db_conn = pool.acquire()
    return g.db_conn

def close_connection(exception=None):
    """Trả connection về pool sau khi request kết thúc."""
    conn = g.pop('db_conn', None)
    if conn is not None:
        pool.release(conn)