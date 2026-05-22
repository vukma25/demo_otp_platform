import pyotp
import time
import hashlib
import base64
import hmac
import struct
from datetime import datetime

class OTPEngine:
    """
    Engine sinh OTP hỗ trợ cả TOTP và HOTP, kèm theo thông tin debug cho visualization.
    """
    
    def __init__(self, secret=None):
        """
        Khởi tạo engine với một secret key.
        Nếu không cung cấp, sẽ tự sinh secret mới.
        """
        if secret:
            self.secret = secret
        else:
            self.secret = pyotp.random_base32()
        
        # Lưu trữ thông tin debug cho bước cuối cùng
        self.debug_info = {}
    
    def generate_totp(self, interval=30, digits=6):
        """
        Sinh TOTP (Time-based OTP) kèm theo thông tin debug.
        
        Args:
            interval: Chu kỳ thay đổi OTP (giây), mặc định 30
            digits: Số chữ số của OTP, mặc định 6
            
        Returns:
            dict: Chứa OTP và thông tin debug chi tiết từng bước
        """
        # Bước 1: Lấy thời gian hiện tại
        current_time = int(time.time())
        time_counter = current_time // interval
        time_remaining = interval - (current_time % interval)
        print(1)
        
        # Bước 2: Tính toán counter từ thời gian
        counter_bytes = struct.pack('>Q', time_counter)
        print(2)
        
        # Bước 3: Decode secret từ Base32
        # Tính padding đúng cho Base32
        padding_length = (8 - len(self.secret) % 8) % 8
        secret_bytes = base64.b32decode(self.secret.upper() + '=' * padding_length)        
        print(3)
        
        # Bước 4: Tính HMAC-SHA1
        hmac_result = hmac.new(secret_bytes, counter_bytes, hashlib.sha1).digest()
        print(4)
        
        # Bước 5: Dynamic Truncation
        offset = hmac_result[-1] & 0x0F
        truncated = (
            ((hmac_result[offset] & 0x7F) << 24) |
            ((hmac_result[offset + 1] & 0xFF) << 16) |
            ((hmac_result[offset + 2] & 0xFF) << 8) |
            (hmac_result[offset + 3] & 0xFF)
        )
        print(5)
        
        # Bước 6: Lấy OTP với độ dài digits
        otp = truncated % (10 ** digits)
        otp_str = str(otp).zfill(digits)
        print(6)
        
        # Lưu thông tin debug
        self.debug_info = {
            'type': 'TOTP',
            'step1_time': {
                'label': 'Bước 1: Lấy thời gian Unix hiện tại',
                'current_time': current_time,
                'formatted_time': datetime.fromtimestamp(current_time).strftime('%Y-%m-%d %H:%M:%S'),
                'description': f'Thời gian hiện tại: {current_time} (Unix timestamp)'
            },
            'step2_counter': {
                'label': 'Bước 2: Tính counter từ thời gian',
                'interval': interval,
                'time_counter': time_counter,
                'calculation': f'{current_time} // {interval} = {time_counter}',
                'description': f'Counter = Thời gian // Chu kỳ = {time_counter}'
            },
            'step3_secret': {
                'label': 'Bước 3: Decode Secret Key (Base32)',
                'secret_base32': self.secret,
                'secret_hex': secret_bytes.hex(),
                'description': f'Secret "{self.secret}" → Hex: {secret_bytes.hex()}'
            },
            'step4_hmac': {
                'label': 'Bước 4: Tính HMAC-SHA1',
                'counter_hex': counter_bytes.hex(),
                'hmac_hex': hmac_result.hex(),
                'description': f'HMAC-SHA1(Secret, Counter) = {hmac_result.hex()}'
            },
            'step5_truncation': {
                'label': 'Bước 5: Dynamic Truncation',
                'offset': offset,
                'truncated_hex': hex(truncated),
                'truncated_decimal': truncated,
                'description': f'Offset = {offset}, Giá trị sau truncation = {truncated}'
            },
            'step6_otp': {
                'label': 'Bước 6: Tính OTP cuối cùng',
                'modulus': 10 ** digits,
                'otp_raw': truncated % (10 ** digits),
                'otp_final': otp_str,
                'description': f'{truncated} % {10**digits} = {otp_str}'
            },
            'time_remaining': time_remaining,
            'otp': otp_str
        }
        
        return self.debug_info
    
    def generate_hotp(self, counter, digits=6):
        """
        Sinh HOTP (HMAC-based OTP) kèm theo thông tin debug.
        
        Args:
            counter: Số đếm (phải tăng dần sau mỗi lần sử dụng)
            digits: Số chữ số của OTP, mặc định 6
            
        Returns:
            dict: Chứa OTP và thông tin debug chi tiết từng bước
        """
        # Bước 1: Chuyển counter thành bytes (8-byte big-endian)
        counter_bytes = struct.pack('>Q', counter)
        
        # Bước 2: Decode secret từ Base32
        # Tính padding đúng cho Base32
        padding_length = (8 - len(self.secret) % 8) % 8
        secret_bytes = base64.b32decode(self.secret.upper() + '=' * padding_length)
        
        # Bước 3: Tính HMAC-SHA1
        hmac_result = hmac.new(secret_bytes, counter_bytes, hashlib.sha1).digest()
        
        # Bước 4: Dynamic Truncation
        offset = hmac_result[-1] & 0x0F
        truncated = (
            ((hmac_result[offset] & 0x7F) << 24) |
            ((hmac_result[offset + 1] & 0xFF) << 16) |
            ((hmac_result[offset + 2] & 0xFF) << 8) |
            (hmac_result[offset + 3] & 0xFF)
        )
        
        # Bước 5: Lấy OTP với độ dài digits
        otp = truncated % (10 ** digits)
        otp_str = str(otp).zfill(digits)
        
        # Lưu thông tin debug
        self.debug_info = {
            'type': 'HOTP',
            'step1_counter': {
                'label': 'Bước 1: Chuyển counter thành bytes',
                'counter': counter,
                'counter_hex': counter_bytes.hex(),
                'description': f'Counter = {counter} → Bytes (big-endian): {counter_bytes.hex()}'
            },
            'step2_secret': {
                'label': 'Bước 2: Decode Secret Key (Base32)',
                'secret_base32': self.secret,
                'secret_hex': secret_bytes.hex(),
                'description': f'Secret "{self.secret}" → Hex: {secret_bytes.hex()}'
            },
            'step3_hmac': {
                'label': 'Bước 3: Tính HMAC-SHA1',
                'hmac_hex': hmac_result.hex(),
                'description': f'HMAC-SHA1(Secret, Counter) = {hmac_result.hex()}'
            },
            'step4_truncation': {
                'label': 'Bước 4: Dynamic Truncation',
                'offset': offset,
                'truncated_hex': hex(truncated),
                'truncated_decimal': truncated,
                'description': f'Offset = {offset}, Giá trị sau truncation = {truncated}'
            },
            'step5_otp': {
                'label': 'Bước 5: Tính OTP cuối cùng',
                'modulus': 10 ** digits,
                'otp_raw': truncated % (10 ** digits),
                'otp_final': otp_str,
                'description': f'{truncated} % {10**digits} = {otp_str}'
            },
            'otp': otp_str
        }
        
        return self.debug_info
    
    def verify_totp(self, otp_input, interval=30, digits=6):
        """Xác minh TOTP"""
        totp = pyotp.TOTP(self.secret, interval=interval, digits=digits)
        return totp.verify(otp_input)
    
    def verify_hotp(self, otp_input, counter, digits=6):
        """Xác minh HOTP"""
        hotp = pyotp.HOTP(self.secret, digits=digits)
        return hotp.verify(otp_input, counter)