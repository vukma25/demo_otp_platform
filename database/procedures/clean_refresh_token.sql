BEGIN
    DBMS_SCHEDULER.CREATE_JOB (
        job_name        => 'CLEANUP_EXPIRED_REFRESH_TOKENS',
        job_type        => 'PLSQL_BLOCK',
        job_action      => 'BEGIN DELETE FROM refresh_tokens WHERE expires_at < SYS_EXTRACT_UTC(SYSTIMESTAMP); COMMIT; END;',
        start_date      => SYS_EXTRACT_UTC(SYSTIMESTAMP),
        repeat_interval => 'FREQ=HOURLY; INTERVAL=1',
        enabled         => TRUE
    );
END;
/