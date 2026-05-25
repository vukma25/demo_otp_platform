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
            
        self.window_size = 10
        self.resync_range = 100
        self.counter = 0
    
    def _generate_totp(self, interval=30, digits=6):
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
        
        # Bước 2: Tính toán counter từ thời gian
        counter_bytes = struct.pack('>Q', time_counter)
        
        # Bước 3: Decode secret từ Base32
        # Tính padding đúng cho Base32
        padding_length = (8 - len(self.secret) % 8) % 8
        secret_bytes = base64.b32decode(self.secret.upper() + '=' * padding_length)        
        
        # Bước 4: Tính HMAC-SHA1
        hmac_result = hmac.new(secret_bytes, counter_bytes, hashlib.sha1).digest()
        
        # Bước 5: Dynamic Truncation
        offset = hmac_result[-1] & 0x0F
        truncated = (
            ((hmac_result[offset] & 0x7F) << 24) |
            ((hmac_result[offset + 1] & 0xFF) << 16) |
            ((hmac_result[offset + 2] & 0xFF) << 8) |
            (hmac_result[offset + 3] & 0xFF)
        )
        
        # Bước 6: Lấy OTP với độ dài digits
        otp = truncated % (10 ** digits)
        otp_str = str(otp).zfill(digits)
        
        # Lưu thông tin debug
        # self.debug_info = {
        #     'type': 'TOTP',
        #     'step1_time': {
        #         'label': 'Bước 1: Lấy thời gian Unix hiện tại',
        #         'current_time': current_time,
        #         'formatted_time': datetime.fromtimestamp(current_time).strftime('%Y-%m-%d %H:%M:%S'),
        #         'description': f'Thời gian hiện tại: {current_time} (Unix timestamp)'
        #     },
        #     'step2_counter': {
        #         'label': 'Bước 2: Tính counter từ thời gian',
        #         'interval': interval,
        #         'time_counter': time_counter,
        #         'calculation': f'{current_time} // {interval} = {time_counter}',
        #         'description': f'Counter = Thời gian // Chu kỳ = {time_counter}'
        #     },
        #     'step3_secret': {
        #         'label': 'Bước 3: Decode Secret Key (Base32)',
        #         'secret_base32': self.secret,
        #         'secret_hex': secret_bytes.hex(),
        #         'description': f'Secret "{self.secret}" → Hex: {secret_bytes.hex()}'
        #     },
        #     'step4_hmac': {
        #         'label': 'Bước 4: Tính HMAC-SHA1',
        #         'counter_hex': counter_bytes.hex(),
        #         'hmac_hex': hmac_result.hex(),
        #         'description': f'HMAC-SHA1(Secret, Counter) = {hmac_result.hex()}'
        #     },
        #     'step5_truncation': {
        #         'label': 'Bước 5: Dynamic Truncation',
        #         'offset': offset,
        #         'truncated_hex': hex(truncated),
        #         'truncated_decimal': truncated,
        #         'description': f'Offset = {offset}, Giá trị sau truncation = {truncated}'
        #     },
        #     'step6_otp': {
        #         'label': 'Bước 6: Tính OTP cuối cùng',
        #         'modulus': 10 ** digits,
        #         'otp_raw': truncated % (10 ** digits),
        #         'otp_final': otp_str,
        #         'description': f'{truncated} % {10**digits} = {otp_str}'
        #     },
        #     'time_remaining': time_remaining,
        #     'otp': otp_str
        # }
        return otp_str
        
    
    def _generate_hotp(self, counter, digits=6):
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
        
        return otp_str
    
    def look_ahead(self, otp):
        look_ahead_otps = [self._generate_hotp(counter) for counter in range(self.counter, self.counter+self.window_size)]
        match_index = -1
        for i in range(0, len(look_ahead_otps)):
            if (look_ahead_otps[i] == otp):
                match_index = i
                break
                
        if match_index != -1:
            self.counter = match_index + 1
            return True
    
        return False
    def verify_totp(self, otp_input, interval=30, digits=6):
        """Xác minh TOTP"""
        totp = pyotp.TOTP(self.secret, interval=interval, digits=digits)
        return totp.verify(otp_input)
    
    def verify_hotp(self, otp_input, digits=6):
        """Xác minh HOTP"""
        hotp = pyotp.HOTP(self.secret, digits=digits)
        if not hotp.verify(otp_input, self.counter):
            if not self.look_ahead(otp=otp_input):
                return { "status": False, "des": "Độ lệch bộ đếm vượt ngưỡng cho xem"}
        return { "status": True, "des": "Xác thực thành công"}
    
    def resync_hotp_counter(self, otps):
        """
        Đồng bộ lại counter bằng cách kiểm tra 3 mã OTP liên tiếp.
        :param otps: List gồm 3 chuỗi OTP người dùng gửi lên, ví dụ: ['123456', '789012', '345678']
        :return: dict chứa trạng thái success và message thông báo
        """
        # Khơi tạo mảng chứa các OTP xem trước trong khoảng resync_range
        # Giả sử self.current_counter là vị trí counter hiện tại trên server
        start_counter = self.counter
        look_ahead_otps = [self._generate_hotp(counter) for counter in range(start_counter, start_counter + self.resync_range)]
        
        match_index = -1
        for i in range(0, len(look_ahead_otps) - 2):
            if (look_ahead_otps[i] == otps[0] and 
                look_ahead_otps[i+1] == otps[1] and 
                look_ahead_otps[i+2] == otps[2]):
                match_index = i
                break # Tìm thấy vị trí khớp đầu tiên, thoát vòng lặp
                
        # Nếu tìm thấy vị trí trùng khớp
        if match_index != -1:
            # Cập nhật counter mới cho Server
            # Counter mới sẽ nhảy đến vị trí của mã thứ 3 + 1 (tức là i + 3)
            self.counter = start_counter + match_index + 3
            
            # Lưu self.current_counter vào Database của bạn ở đây nếu cần
            # self.save_counter_to_db() 
            
            return {
                "status": True,
                "des": "Đồng bộ thành công."
            }
        
        # Trường hợp không tìm thấy cụm 3 mã nào khớp trong khoảng resync_range
        return {
            "status": False,
            "des": "Đồng bộ thất bại. Vui lòng liên hệ với nhà cung cấp để tạo lại Secret Key hoặc nhận hỗ trợ đồng bộ nâng cao."
        }