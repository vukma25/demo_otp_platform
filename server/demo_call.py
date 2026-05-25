import os
import re
from flask import Flask, request
from flask_cors import CORS
from twilio.twiml.voice_response import VoiceResponse, Gather
from twilio.rest import Client
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Khởi tạo Twilio Client để thực hiện cuộc gọi đi
account_sid = os.getenv("TWILIO_ACCOUNT_SID")
auth_token = os.getenv("TWILIO_AUTH_TOKEN")
client = Client()

@app.route('/make-call', methods=['POST'])
def make_call():
    """
    Endpoint để kích hoạt một cuộc gọi đi.
    """
    # Lấy số điện thoại người nhận từ request
    to_number = request.form.get('to_number')
    
    if not to_number:
        return "Thiếu số điện thoại người nhận.", 400

    try:
        call = client.calls.create(
            record=True,
            url=f'{os.getenv("DOMAIN_NAME")}/answer',  # URL webhook xử lý khi có người nhấc máy
            to=to_number,
            from_=os.getenv('TWILIO_PHONE_NUMBER')
        )
        print(f"Call initiated with SID: {call.sid}")
        return f"Call initiated with SID: {call.sid}", 200
    except Exception as e:
        print(f"Error making call: {e}")
        return str(e), 500

@app.route('/answer', methods=['POST'])
def answer_call():
    """
    Endpoint webhook được Twilio gọi khi người dùng nhấc máy.
    Nó sẽ tạo một phản hồi TwiML để yêu cầu người dùng đọc OTP.
    """
    response = VoiceResponse()
    
    gather = Gather(
        input='speech dtmf',  # Cho phép cả giọng nói và phím bấm
        action='/process-otp',  # URL webhook xử lý kết quả
        method='POST',
        speech_timeout='auto', # Tự động kết thúc khi người dùng ngừng nói
        timeout=5,  # Thời gian chờ tối đa nếu người dùng không nói gì
        hints='$OOV_CLASS_DIGIT_SEQUENCE, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9' # Gợi ý để nhận dạng chữ số tốt hơn
    )
    gather.say("Xin chào, đây là cuộc gọi xác thực. Vui lòng đọc to mã OTP gồm 6 chữ số của bạn.")
    response.append(gather)

    # Nếu không có input nào được thu thập, kết thúc cuộc gọi
    response.say("Chúng tôi không nhận được phản hồi. Tạm biệt.")
    response.hangup()
    
    return str(response)

@app.route('/process-otp', methods=['POST'])
def process_otp():
    """
    Endpoint webhook để nhận và xử lý kết quả từ <Gather>.
    """
    response = VoiceResponse()

    # Lấy kết quả từ giọng nói (SpeechResult) hoặc từ phím bấm (Digits)
    speech_result = request.form.get('SpeechResult', '')
    digits = request.form.get('Digits', '')

    print(f"SpeechResult: {speech_result}")
    print(f"Digits: {digits}")

    if digits:
        otp_code = digits
        print(f"OTP received via DTMF: {otp_code}")
    elif speech_result:
        # Sử dụng regex để trích xuất chuỗi số từ kết quả giọng nói
        # \b\d{4,8}\b tìm các chuỗi số có độ dài từ 4 đến 8 chữ số
        match = re.search(r'\b\d{4,8}\b', speech_result)
        if match:
            otp_code = match.group(0)
            print(f"OTP extracted from speech: {otp_code}")
        else:
            # Nếu không tìm thấy số, thử chuyển đổi chữ viết thành số (VD: "một hai ba" -> 123)
            otp_code = words_to_digits(speech_result)
            print(f"OTP converted from words: {otp_code}")
    else:
        # Không nhận được input nào
        otp_code = None

    if otp_code:
        # TODO: Thêm logic xác minh OTP ở đây
        # verify_otp(otp_code)
        response.say(f"Mã OTP bạn cung cấp là {otp_code}. Chúng tôi sẽ tiến hành xác minh.")
    else:
        response.say("Chúng tôi không thể trích xuất mã OTP từ phản hồi của bạn. Vui lòng thử lại.")
    
    response.hangup()
    return str(response)

def words_to_digits(text):
    """
    Hàm hỗ trợ chuyển đổi chữ viết thành chữ số.
    Ví dụ: "một hai ba bốn năm sáu" -> "123456"
    """
    word_to_digit_map = {
        'không': '0', 'một': '1', 'hai': '2', 'ba': '3',
        'bốn': '4', 'năm': '5', 'sáu': '6', 'bảy': '7',
        'tám': '8', 'chín': '9',
        # Thêm các ngôn ngữ khác nếu cần
    }
    words = text.lower().split()
    digits = ''.join([word_to_digit_map.get(word, '') for word in words])
    return digits if digits else None

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=80)