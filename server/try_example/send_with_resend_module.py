import os
import resend
from dotenv import load_dotenv

load_dotenv()

resend.api_key = os.getenv("RESEND_API_KEY")

html = open("templates/otp.html").read()

r = resend.Emails.send({
  "from": "onboarding@resend.dev",
  "to": "hoantuanvu2005@gmail.com",
  "subject": "Hello World",
  "html": html
})


