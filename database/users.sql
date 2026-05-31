CREATE TABLE users (
    user_id                 RAW(16) DEFAULT SYS_GUID() PRIMARY KEY,
    email                   VARCHAR2(255) NOT NULL UNIQUE,
    password_hash           VARCHAR2(255) NOT NULL,
    totp_enable             NUMBER(1) DEFAULT 0,
    totp_secret_encrypted   VARCHAR2(255),
    created_at              TIMESTAMP DEFAULT SYS_EXTRACT_UTC(SYSTIMESTAMP),
    updated_at              TIMESTAMP
);