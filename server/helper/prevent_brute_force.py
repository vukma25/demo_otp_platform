def limit_attempt(conn, session_id, current_attempt, limit):
    try:
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE sessions
            SET attempts = attempts + 1
            WHERE session_id = HEXTORAW(:session_id )            
        """, {"session_id": session_id})
        conn.commit()
        
        if limit - current_attempt - 1 <= 0:
            cursor.execute("""
                DELETE FROM sessions WHERE session_id = HEXTORAW(:session_id)             
            """, {"session_id": session_id})
            conn.commit()
        return limit - current_attempt - 1
    except Exception:
        raise