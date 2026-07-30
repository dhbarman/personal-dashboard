#!/usr/bin/env python3
import bcrypt
import sqlite3
import sys
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'todos.db')

if len(sys.argv) != 3:
    print("Usage: python reset_password.py <username> <new_password>")
    sys.exit(1)

username, new_password = sys.argv[1], sys.argv[2]

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()
cursor.execute('SELECT username FROM users WHERE username = ?', (username,))
if not cursor.fetchone():
    print(f"User '{username}' not found.")
    conn.close()
    sys.exit(1)

new_hash = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt()).decode()
cursor.execute('UPDATE users SET password_hash = ? WHERE username = ?', (new_hash, username))
conn.commit()
conn.close()
print(f"Password for '{username}' updated. All active sessions invalidated on next server check.")
