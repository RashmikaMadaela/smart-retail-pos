import hashlib
import sqlite3
from database.queries import DB_PATH

def verify_login(username, password):
    """Hashes the input password and checks it against the database."""
    hashed_pw = hashlib.sha256(password.encode()).hexdigest()
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM users WHERE username = ? AND password_hash = ?", (username, hashed_pw))
    user = cursor.fetchone()
    conn.close()
    
    if user:
        return True, dict(user) # Returns True and the user's data (including their role)
    return False, None