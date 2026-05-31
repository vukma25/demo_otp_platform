CREATE TABLE refresh_tokens (
    id              RAW(16) DEFAULT SYS_GUID() PRIMARY KEY,
    user_id         RAW(16) NOT NULL,
    token_hash      VARCHAR2(64) NOT NULL,
    expires_at      TIMESTAMP NOT NULL,
    created_at      TIMESTAMP DEFAULT SYS_EXTRACT_UTC(SYSTIMESTAMP),
    device_info     VARCHAR2(255),
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(user_id)
);