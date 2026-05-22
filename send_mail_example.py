from typing import List

import os
from fastapi import BackgroundTasks, FastAPI
from fastapi_mail import ConnectionConfig, FastMail, MessageSchema, MessageType, NameEmail
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from starlette.responses import JSONResponse
import uvicorn
from dotenv import load_dotenv

load_dotenv()
pwd = os.getenv("APP_PWD")

class EmailSchema(BaseModel):
    email: List[NameEmail]  # Supports both "user@example.com" and "Name <user@example.com>" formats


conf = ConnectionConfig(
    MAIL_USERNAME ="hoantuanvu2005@gmail.com",
    MAIL_PASSWORD = pwd,
    MAIL_FROM = "hoantuanvu2005@gmail.com",
    MAIL_PORT = 465,
    MAIL_SERVER = "smtp.gmail.com",
    MAIL_STARTTLS = False,
    MAIL_SSL_TLS = True,
    USE_CREDENTIALS = True,
    VALIDATE_CERTS = True
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],

    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

html = """
<p>Thanks for using Fastapi-mail</p> 
"""


@app.post("/email")
async def simple_send(email: EmailSchema) -> JSONResponse:

    message = MessageSchema(
        subject="Fastapi-Mail module",
        recipients=email.dict().get("email"),  # Can include "Name <email@domain.com>" format
        body=html,
        subtype=MessageType.html)

    fm = FastMail(conf)
    await fm.send_message(message)
    return JSONResponse(status_code=200, content={"message": "email has been sent"})  

if __name__ == "__main__":
    
    uvicorn.run(
        app,
        host="localhost",
        port=5000,
        log_level="info"
    )