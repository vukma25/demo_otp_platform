BEGIN
    DBMS_SCHEDULER.CREATE_JOB (
        job_name        => 'CLEANUP_EXPIRED_SESSIONS_JOB',
        job_type        => 'PLSQL_BLOCK',
        job_action      => 'BEGIN 
                                DELETE FROM sessions WHERE expires_at < SYS_EXTRACT_UTC(SYSTIMESTAMP);
                                DELETE FROM registration WHERE created_at < SYS_EXTRACT_UTC(SYSTIMESTAMP) - INTERVAL ''10'' MINUTE;
                                
                                COMMIT; 
                            END;',
        start_date      => SYS_EXTRACT_UTC(SYSTIMESTAMP),
        repeat_interval => 'FREQ=MINUTELY; INTERVAL=10',
        enabled         => TRUE
    );
END;
/