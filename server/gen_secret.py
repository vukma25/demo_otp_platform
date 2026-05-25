import base64
import secrets

# Tạo 20 bytes ngẫu nhiên (160-bit) theo khuyến nghị của Google Authenticator
secret_bytes = secrets.token_bytes(20)

# Mã hóa sang chuỗi Base32 và xóa các ký tự padding '=' thừa ở cuối
secret_key = base64.b32encode(secret_bytes).decode("utf-8").replace("=", "")

print(f"Secret Key (Base32): {secret_key}")
print(f"Độ dài ký tự: {len(secret_key)}")
