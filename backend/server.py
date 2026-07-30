from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import os
import bcrypt
import secrets
from functools import wraps
from datetime import datetime

app = Flask(__name__)
CORS(app)

DB_PATH = 'todos.db'
VALID_TOKENS = {}  # token -> username

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS todos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            priority INTEGER NOT NULL DEFAULT 0
        )
    ''')
    try:
        cursor.execute('ALTER TABLE todos ADD COLUMN priority INTEGER NOT NULL DEFAULT 0')
    except Exception:
        pass

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY,
            content TEXT
        )
    ''')
    cursor.execute('INSERT OR IGNORE INTO notes (id, content) VALUES (1, "")')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            description TEXT NOT NULL,
            category TEXT NOT NULL,
            amount REAL NOT NULL,
            date TEXT NOT NULL
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS bookmarks (
            id    INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            url   TEXT NOT NULL
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS monthly_payments (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            description TEXT NOT NULL,
            amount      REAL NOT NULL,
            date        TEXT,
            source      TEXT
        )
    ''')
    try:
        cursor.execute('ALTER TABLE monthly_payments ADD COLUMN source TEXT')
    except Exception:
        pass

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            username      TEXT PRIMARY KEY,
            password_hash TEXT NOT NULL
        )
    ''')
    cursor.execute('SELECT COUNT(*) FROM users')
    if cursor.fetchone()[0] == 0:
        h = bcrypt.hashpw(b'changeme', bcrypt.gensalt()).decode()
        cursor.execute('INSERT INTO users (username, password_hash) VALUES (?, ?)', ('admin', h))

    conn.commit()
    conn.close()

init_db()

def load_db_on_startup():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    cursor.execute('SELECT id, text, timestamp FROM todos ORDER BY timestamp DESC')
    todos = cursor.fetchall()

    cursor.execute('SELECT content FROM notes WHERE id = 1')
    row = cursor.fetchone()
    notes_content = row[0] if row else ''

    cursor.execute('SELECT id, description, category, amount, date FROM expenses ORDER BY date DESC')
    expenses = cursor.fetchall()

    cursor.execute('SELECT id, title, url FROM bookmarks ORDER BY id DESC')
    bookmarks = cursor.fetchall()

    conn.close()

    print(f"\n--- DB State on Startup ---")
    print(f"Todos ({len(todos)}):")
    for t in todos:
        print(f"  [{t[0]}] {t[1]} (ts={t[2]})")
    print(f"Notes: {len(notes_content)} chars")
    if notes_content:
        preview = notes_content[:100].replace('\n', ' ')
        print(f"  Preview: {preview}{'...' if len(notes_content) > 100 else ''}")
    print(f"Expenses ({len(expenses)}):")
    for e in expenses:
        print(f"  [{e[0]}] {e[1]} | {e[2]} | {e[3]} | {e[4]}")
    print(f"Bookmarks ({len(bookmarks)}):")
    for b in bookmarks:
        print(f"  [{b[0]}] {b[1]} — {b[2]}")
    print(f"---------------------------\n")

load_db_on_startup()

# ==================== AUTH ====================

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get('Authorization', '')
        if not auth.startswith('Bearer ') or auth[7:] not in VALID_TOKENS:
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    username = (data.get('username') or '').strip()
    password = (data.get('password') or '').encode()
    if not username or not password:
        return jsonify({'error': 'username and password required'}), 400
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT password_hash FROM users WHERE username = ?', (username,))
    row = cursor.fetchone()
    conn.close()
    if not row or not bcrypt.checkpw(password, row[0].encode()):
        return jsonify({'error': 'Invalid credentials'}), 401
    token = secrets.token_hex(32)
    VALID_TOKENS[token] = username
    return jsonify({'token': token})

@app.route('/api/logout', methods=['POST'])
@require_auth
def logout():
    token = request.headers.get('Authorization', '')[7:]
    VALID_TOKENS.pop(token, None)
    return jsonify({'success': True})

@app.route('/api/change-password', methods=['POST'])
@require_auth
def change_password():
    token = request.headers.get('Authorization', '')[7:]
    username = VALID_TOKENS[token]
    data = request.json
    current = (data.get('current') or '').encode()
    new_pw  = (data.get('new') or '').encode()
    if not current or not new_pw:
        return jsonify({'error': 'current and new password required'}), 400
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT password_hash FROM users WHERE username = ?', (username,))
    row = cursor.fetchone()
    if not row or not bcrypt.checkpw(current, row[0].encode()):
        conn.close()
        return jsonify({'error': 'Current password incorrect'}), 401
    new_hash = bcrypt.hashpw(new_pw, bcrypt.gensalt()).decode()
    cursor.execute('UPDATE users SET password_hash = ? WHERE username = ?', (new_hash, username))
    conn.commit()
    conn.close()
    VALID_TOKENS.clear()
    return jsonify({'success': True})

# ==================== TODOS ====================

@app.route('/api/todos', methods=['GET'])
@require_auth
def get_todos():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT id, text, timestamp, priority FROM todos ORDER BY priority ASC, timestamp DESC')
    todos = [{'id': row[0], 'text': row[1], 'timestamp': row[2], 'priority': row[3]} for row in cursor.fetchall()]
    conn.close()
    return jsonify(todos)

@app.route('/api/todos', methods=['POST'])
@require_auth
def add_todo():
    data = request.json
    text = data.get('text')
    timestamp = data.get('timestamp', int(datetime.now().timestamp() * 1000))
    try:
        priority = int(data.get('priority', 0))
    except (TypeError, ValueError):
        priority = 0
    if not text:
        return jsonify({'error': 'Text is required'}), 400
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('INSERT INTO todos (text, timestamp, priority) VALUES (?, ?, ?)', (text, timestamp, priority))
    todo_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return jsonify({'id': todo_id, 'text': text, 'timestamp': timestamp, 'priority': priority}), 201

@app.route('/api/todos/reorder', methods=['POST'])
@require_auth
def reorder_todos():
    items = request.json  # [{id, priority}, ...]
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    for item in items:
        cursor.execute('UPDATE todos SET priority = ? WHERE id = ?', (item['priority'], item['id']))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/api/todos/<int:todo_id>', methods=['PUT'])
@require_auth
def update_todo(todo_id):
    data = request.json
    try:
        priority = int(data.get('priority'))
    except (TypeError, ValueError):
        return jsonify({'error': 'priority must be an integer'}), 400
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('UPDATE todos SET priority = ? WHERE id = ?', (priority, todo_id))
    conn.commit()
    updated = cursor.rowcount
    conn.close()
    if updated == 0:
        return jsonify({'error': 'Todo not found'}), 404
    return jsonify({'id': todo_id, 'priority': priority})

@app.route('/api/todos/<int:todo_id>', methods=['DELETE'])
@require_auth
def delete_todo(todo_id):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('DELETE FROM todos WHERE id = ?', (todo_id,))
    conn.commit()
    deleted = cursor.rowcount
    conn.close()
    if deleted == 0:
        return jsonify({'error': 'Todo not found'}), 404
    return jsonify({'deleted': deleted})

# ==================== NOTES ====================

@app.route('/api/notes', methods=['GET'])
@require_auth
def get_notes():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT content FROM notes WHERE id = 1')
    row = cursor.fetchone()
    conn.close()
    content = row[0] if row else ''
    return jsonify({'content': content})

@app.route('/api/notes', methods=['PUT'])
@require_auth
def update_notes():
    data = request.json
    content = data.get('content', '')
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('UPDATE notes SET content = ? WHERE id = 1', (content,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

# ==================== EXPENSES ====================

@app.route('/api/expenses', methods=['GET'])
@require_auth
def get_expenses():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT id, description, category, amount, date FROM expenses ORDER BY date DESC')
    expenses = [{'id': row[0], 'desc': row[1], 'category': row[2], 'amount': row[3], 'date': row[4]} for row in cursor.fetchall()]
    conn.close()
    return jsonify(expenses)

@app.route('/api/expenses', methods=['POST'])
@require_auth
def add_expense():
    data = request.json
    desc     = data.get('desc')
    category = data.get('category')
    amount   = data.get('amount')
    date     = data.get('date')
    if not all([desc, category, amount, date]):
        return jsonify({'error': 'All fields are required'}), 400
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('INSERT INTO expenses (description, category, amount, date) VALUES (?, ?, ?, ?)',
                   (desc, category, amount, date))
    expense_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return jsonify({'id': expense_id, 'desc': desc, 'category': category, 'amount': amount, 'date': date}), 201

@app.route('/api/expenses/<int:expense_id>', methods=['DELETE'])
@require_auth
def delete_expense(expense_id):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('DELETE FROM expenses WHERE id = ?', (expense_id,))
    conn.commit()
    deleted = cursor.rowcount
    conn.close()
    if deleted == 0:
        return jsonify({'error': 'Expense not found'}), 404
    return jsonify({'deleted': deleted})

# ==================== MONTHLY PAYMENTS ====================

@app.route('/api/payments', methods=['GET'])
@require_auth
def get_payments():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT id, description, amount, date, source FROM monthly_payments ORDER BY id DESC')
    payments = [{'id': r[0], 'description': r[1], 'amount': r[2], 'date': r[3], 'source': r[4] or ''} for r in cursor.fetchall()]
    conn.close()
    return jsonify(payments)

@app.route('/api/payments', methods=['POST'])
@require_auth
def add_payment():
    data        = request.json
    description = data.get('description', '').strip()
    amount      = data.get('amount')
    date        = data.get('date', '') or ''
    source      = data.get('source', '') or ''
    if not description or amount is None:
        return jsonify({'error': 'description and amount are required'}), 400
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('INSERT INTO monthly_payments (description, amount, date, source) VALUES (?, ?, ?, ?)',
                   (description, float(amount), date, source))
    payment_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return jsonify({'id': payment_id, 'description': description, 'amount': float(amount), 'date': date, 'source': source}), 201

@app.route('/api/payments/<int:payment_id>', methods=['PUT'])
@require_auth
def update_payment(payment_id):
    data        = request.get_json()
    description = data.get('description', '').strip()
    amount      = data.get('amount')
    date        = data.get('date', '')
    source      = data.get('source', '') or ''
    if not description or amount is None:
        return jsonify({'error': 'Missing fields'}), 400
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('UPDATE monthly_payments SET description=?, amount=?, date=?, source=? WHERE id=?',
                   (description, float(amount), date, source, payment_id))
    conn.commit()
    updated = cursor.rowcount
    conn.close()
    if updated == 0:
        return jsonify({'error': 'Payment not found'}), 404
    return jsonify({'id': payment_id, 'description': description, 'amount': float(amount), 'date': date, 'source': source})

@app.route('/api/payments/<int:payment_id>', methods=['DELETE'])
@require_auth
def delete_payment(payment_id):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('DELETE FROM monthly_payments WHERE id = ?', (payment_id,))
    conn.commit()
    deleted = cursor.rowcount
    conn.close()
    if deleted == 0:
        return jsonify({'error': 'Payment not found'}), 404
    return jsonify({'deleted': deleted})

# ==================== BOOKMARKS ====================

@app.route('/api/bookmarks', methods=['GET'])
@require_auth
def get_bookmarks():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT id, title, url FROM bookmarks ORDER BY id DESC')
    bookmarks = [{'id': row[0], 'title': row[1], 'url': row[2]} for row in cursor.fetchall()]
    conn.close()
    return jsonify(bookmarks)

@app.route('/api/bookmarks', methods=['POST'])
@require_auth
def add_bookmark():
    data  = request.json
    title = data.get('title', '').strip()
    url   = data.get('url', '').strip()
    if not title or not url:
        return jsonify({'error': 'title and url are required'}), 400
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('INSERT INTO bookmarks (title, url) VALUES (?, ?)', (title, url))
    bookmark_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return jsonify({'id': bookmark_id, 'title': title, 'url': url}), 201

@app.route('/api/bookmarks/<int:bookmark_id>', methods=['PUT'])
@require_auth
def update_bookmark(bookmark_id):
    data  = request.json
    title = data.get('title', '').strip()
    url   = data.get('url', '').strip()
    if not title or not url:
        return jsonify({'error': 'title and url are required'}), 400
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('UPDATE bookmarks SET title = ?, url = ? WHERE id = ?', (title, url, bookmark_id))
    conn.commit()
    updated = cursor.rowcount
    conn.close()
    if updated == 0:
        return jsonify({'error': 'Bookmark not found'}), 404
    return jsonify({'id': bookmark_id, 'title': title, 'url': url})

@app.route('/api/bookmarks/<int:bookmark_id>', methods=['DELETE'])
@require_auth
def delete_bookmark(bookmark_id):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('DELETE FROM bookmarks WHERE id = ?', (bookmark_id,))
    conn.commit()
    deleted = cursor.rowcount
    conn.close()
    if deleted == 0:
        return jsonify({'error': 'Bookmark not found'}), 404
    return jsonify({'deleted': deleted})

# ==================== HEALTH ====================

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    print("Starting Flask server on http://localhost:3010")
    print("Database location:", os.path.abspath(DB_PATH))
    print("Default credentials: admin / changeme  (change after first login)")
    debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    app.run(host='127.0.0.1', port=3010, debug=debug)
