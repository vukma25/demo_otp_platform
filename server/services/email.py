from flask_mail import Mail, Message

mail = Mail()

def send_email(email: str, otp: str):
    try:
        html = open("templates/otp.html").read().replace("{otp}", otp)
        
        msg = Message(
            subject="OTP PLATFORM yêu cầu xác thực email",
            recipients=[email]
        )
        msg.body = "Đây là email thông báo xác thực, vui lòng không phản hồi"
        msg.html = html
        
        mail.send(msg)
        return True
        
    except Exception as e:
        print(f"Failed to send email: {str(e)}")
        return False