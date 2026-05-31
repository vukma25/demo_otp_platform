-- Tạo bảng registration_otps (dùng Oracle 12c trở lên)
CREATE TABLE registration (
    session_token VARCHAR2(64) PRIMARY KEY,
    email         VARCHAR2(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL, 
    otp_hash      VARCHAR2(128) NOT NULL,     
    attempts      NUMBER(1) DEFAULT 0,
    expires_at    TIMESTAMP NOT NULL,
    created_at    TIMESTAMP DEFAULT SYS_EXTRACT_UTC(SYSTIMESTAMP)
);