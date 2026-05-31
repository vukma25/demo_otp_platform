import os
import base64
import pyotp
import qrcode
from io import BytesIO
from cryptography.fernet import Fernet
from dotenv import load_dotenv

load_dotenv()

# Khởi tạo khóa mã hóa AES (Nên lưu ENCRYPTION_KEY này vào file .env)
# Cách sinh key: Fernet.generate_key().decode()
ENCRYPTION_KEY = os.getenv("CRYPTO_KEY")
cipher_suite = Fernet(ENCRYPTION_KEY.encode())

def encrypt_secret(secret_string: str) -> str:
    """Mã hóa chuỗi secret sang mã hóa AES dạng chuỗi string"""
    return cipher_suite.encrypt(secret_string.encode()).decode()

def decrypt_secret(encrypted_string: str) -> str:
    clean_string = encrypted_string.strip()
    """Giải mã chuỗi AES ngược lại thành secret ban đầu"""
    return cipher_suite.decrypt(clean_string.encode()).decode()

def generate_totp_qr_base64(email: str, secret: str) -> str:
    """Sinh ảnh QR Code chứa cấu hình TOTP và chuyển đổi sang dạng chuỗi Base64"""
    # Tạo URI chuẩn cho các ứng dụng Authenticator quét
    totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(name=email, issuer_name="OTPPlatform")
    
    print(totp_uri)
    # Tạo đối tượng QR Code từ URI
    qr = qrcode.QRCode(version=1, box_size=5, border=5)
    qr.add_data(totp_uri)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    
    # Chuyển ảnh thành chuỗi Base64
    buffered = BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"