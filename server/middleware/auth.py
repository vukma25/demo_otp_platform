import os
from flask import jsonify, request 
import jwt
import functools
from helper.web_token import decode_access_token

def auth_required(f):
    """
    Decorator kiểm tra access token từ header Authorization: Bearer <token>
    Trả về lỗi 401 nếu token không hợp lệ hoặc hết hạn.
    Nếu hợp lệ, gắn thêm user info vào request.context (tuỳ chọn)
    """
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header:
            return jsonify({'message': 'Missing Authorization header'}), 401

        parts = auth_header.split()
        if parts[0].lower() != 'bearer' or len(parts) != 2:
            return jsonify({'message': 'Invalid Authorization header format. Use Bearer <token>'}), 401

        token = parts[1]
        try:
            # Giải mã access token
            user = decode_access_token(token)
            # Gắn thông tin user vào request để dùng trong route
            request.user = user
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Access token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid access token'}), 401

        return f(*args, **kwargs)
    return decorated