# Personal Dashboard

A full-stack personal productivity app with three panels: To-Do List, Notes, and Expense Tracker.

## Stack

- **Frontend**: React 19 (Create React App)
- **Backend**: Python Flask with SQLite

## Features

### To-Do List
- Add and delete tasks
- Timestamps with live elapsed time ("added at 10:30 • 5m ago")
- Save tasks to a local `.json` file or upload a `.json` to bulk-import

### Notes
- Free-form textarea
- Save to the database or export as a `.txt` file
- Upload a `.txt` file to load notes

### Expense Tracker
- Add expenses with description, category, amount (₹), and date
- Sorted newest-first
- Save or upload expenses as `.json`

## Database

The backend uses **SQLite** — a lightweight, file-based database that requires no separate server process. The database file (`todos.db`) is created automatically in the `backend/` directory when the server starts for the first time.

### Tables

| Table | Columns | Description |
|-------|---------|-------------|
| `todos` | `id`, `text`, `timestamp` | Stores to-do items |
| `notes` | `id`, `content` | Single row holding the notes content |
| `expenses` | `id`, `description`, `category`, `amount`, `date` | Stores expense records |

### Installation

SQLite comes pre-installed on macOS and most Linux distributions. To verify:

```bash
sqlite3 --version
```

On **Windows**, download the precompiled binaries from https://www.sqlite.org/download.html and add `sqlite3.exe` to your PATH.

To install on **Ubuntu/Debian**:

```bash
sudo apt-get install sqlite3
```

To install on **macOS** via Homebrew (if not already present):

```bash
brew install sqlite
```

> No manual setup is needed beyond having SQLite available — the Flask server calls `CREATE TABLE IF NOT EXISTS` on startup, so all tables are created automatically.

### Inspecting the database

```bash
cd backend
sqlite3 todos.db
```

Useful commands inside the SQLite shell:

```sql
.tables                  -- list all tables
SELECT * FROM todos;
SELECT * FROM expenses;
SELECT * FROM notes;
.quit
```

## Getting Started

### 1. Backend (Flask)

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
python server.py
```

The API runs on `http://localhost:3010`. On startup it prints a summary of all existing records from the database.

### 2. Frontend (React)

```bash
npm install
npm start
```

The app runs on `http://localhost:3000`.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/todos` | List all todos |
| POST | `/api/todos` | Add a todo |
| DELETE | `/api/todos/<id>` | Delete a todo |
| GET | `/api/notes` | Get notes |
| PUT | `/api/notes` | Update notes |
| GET | `/api/expenses` | List all expenses |
| POST | `/api/expenses` | Add an expense |
| DELETE | `/api/expenses/<id>` | Delete an expense |
| GET | `/health` | Health check |

## Project Structure

```
personal-dashboard/
├── backend/
│   ├── server.py          # Flask API server
│   └── requirements.txt
├── src/
│   ├── App.js             # Main React component
│   ├── App.css
│   └── index.js
├── public/
└── package.json
```
