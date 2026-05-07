from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Database setup
DB_PATH = 'todos.db'

def init_db():
    """Initialize the database with required tables"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Create todos table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS todos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            timestamp INTEGER NOT NULL
        )
    ''')
    
    # Create notes table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY,
            content TEXT
        )
    ''')
    
    # Insert default note if not exists
    cursor.execute('INSERT OR IGNORE INTO notes (id, content) VALUES (1, "")')
    
    # Create expenses table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            description TEXT NOT NULL,
            category TEXT NOT NULL,
            amount REAL NOT NULL,
            date TEXT NOT NULL
        )
    ''')
    
    conn.commit()
    conn.close()

# Initialize database on startup
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
    print(f"---------------------------\n")

load_db_on_startup()

# ==================== TODOS ENDPOINTS ====================

@app.route('/api/todos', methods=['GET'])
def get_todos():
    """Get all todos"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT id, text, timestamp FROM todos ORDER BY timestamp DESC')
    todos = [{'id': row[0], 'text': row[1], 'timestamp': row[2]} for row in cursor.fetchall()]
    conn.close()
    return jsonify(todos)

@app.route('/api/todos', methods=['POST'])
def add_todo():
    """Add a new todo"""
    data = request.json
    text = data.get('text')
    timestamp = data.get('timestamp', int(datetime.now().timestamp() * 1000))
    
    if not text:
        return jsonify({'error': 'Text is required'}), 400
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('INSERT INTO todos (text, timestamp) VALUES (?, ?)', (text, timestamp))
    todo_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return jsonify({'id': todo_id, 'text': text, 'timestamp': timestamp}), 201

@app.route('/api/todos/<int:todo_id>', methods=['DELETE'])
def delete_todo(todo_id):
    """Delete a todo by ID"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('DELETE FROM todos WHERE id = ?', (todo_id,))
    conn.commit()
    deleted = cursor.rowcount
    conn.close()
    
    if deleted == 0:
        return jsonify({'error': 'Todo not found'}), 404
    
    return jsonify({'deleted': deleted})

# ==================== NOTES ENDPOINTS ====================

@app.route('/api/notes', methods=['GET'])
def get_notes():
    """Get notes"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT content FROM notes WHERE id = 1')
    row = cursor.fetchone()
    conn.close()
    
    content = row[0] if row else ''
    return jsonify({'content': content})

@app.route('/api/notes', methods=['PUT'])
def update_notes():
    """Update notes"""
    data = request.json
    content = data.get('content', '')
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('UPDATE notes SET content = ? WHERE id = 1', (content,))
    conn.commit()
    conn.close()
    
    return jsonify({'success': True})

# ==================== EXPENSES ENDPOINTS ====================

@app.route('/api/expenses', methods=['GET'])
def get_expenses():
    """Get all expenses"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('SELECT id, description, category, amount, date FROM expenses ORDER BY date DESC')
    expenses = [{
        'id': row[0],
        'desc': row[1],
        'category': row[2],
        'amount': row[3],
        'date': row[4]
    } for row in cursor.fetchall()]
    conn.close()
    return jsonify(expenses)

@app.route('/api/expenses', methods=['POST'])
def add_expense():
    """Add a new expense"""
    data = request.json
    desc = data.get('desc')
    category = data.get('category')
    amount = data.get('amount')
    date = data.get('date')
    
    if not all([desc, category, amount, date]):
        return jsonify({'error': 'All fields are required'}), 400
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO expenses (description, category, amount, date) VALUES (?, ?, ?, ?)',
        (desc, category, amount, date)
    )
    expense_id = cursor.lastrowid
    conn.commit()
    conn.close()
    
    return jsonify({
        'id': expense_id,
        'desc': desc,
        'category': category,
        'amount': amount,
        'date': date
    }), 201

@app.route('/api/expenses/<int:expense_id>', methods=['DELETE'])
def delete_expense(expense_id):
    """Delete an expense by ID"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('DELETE FROM expenses WHERE id = ?', (expense_id,))
    conn.commit()
    deleted = cursor.rowcount
    conn.close()
    
    if deleted == 0:
        return jsonify({'error': 'Expense not found'}), 404
    
    return jsonify({'deleted': deleted})

# ==================== HEALTH CHECK ====================

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    print("Starting Flask server on http://localhost:3010")
    print("Database location:", os.path.abspath(DB_PATH))
    app.run(host='0.0.0.0', port=3010, debug=True)
