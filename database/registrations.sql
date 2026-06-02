CREATE TABLE registration (
    session_token VARCHAR2(64) PRIMARY KEY,
    email         VARCHAR2(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL, 
    created_at    TIMESTAMP DEFAULT SYS_EXTRACT_UTC(SYSTIMESTAMP)
);