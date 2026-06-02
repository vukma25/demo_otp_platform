-- Tạo bảng registration_otps (dùng Oracle 12c trở lên)
CREATE TABLE sessions (
    session_id    RAW(16) DEFAULT SYS_GUID() PRIMARY KEY
    registration_session_token VARCHAR2(64),
    user_id       RAW(16)
    otp_hash      VARCHAR2(128),     
    attempts      NUMBER(1) DEFAULT 0,
    expires_at    TIMESTAMP NOT NULL,
    CONSTRAINT fk_registration FOREIGN KEY (registration_session_token) REFERENCES registration(session_token) ON DELETE CASCADE
    CONSTRAINT fk_login_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);