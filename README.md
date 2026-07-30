# Personal Dashboard

A personal productivity dashboard with a to-do list, notes, calendar, and reminder system. Built with a React frontend and a Python/Flask backend.

## Features

- **To-do list** — add, reorder (drag-and-drop), and delete tasks
- **Reminders** — attach a date/time reminder to any task; browser notification fires when the time arrives
- **Notes** — persistent text area auto-saved to the backend
- **Calendar** — monthly view (react-calendar) with reminder indicators on dates
- **Auth** — username/password login; sessions backed by server-side tokens stored in SQLite; password change supported

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, react-calendar |
| Backend | Python 3, Flask, Flask-CORS, bcrypt |
| Database | SQLite (via Python `sqlite3`) |
| Auth | Server-issued token stored in `localStorage` |

## Project Structure

```
.
├── src/
│   ├── App.js          # main React component (auth, todos, notes, calendar)
│   ├── App.css         # styles
│   └── index.js        # React entry point
├── backend/
│   ├── server.py       # Flask API server (port 3010)
│   ├── requirements.txt
│   └── reset_password.py
├── public/
└── package.json
```

## Running Locally

### 1. Start the backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
python server.py              # runs on http://localhost:3010
```

### 2. Start the frontend

```bash
# from the repo root
npm install
npm start                     # runs on http://localhost:3000
```

Open `http://localhost:3000` in your browser.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/login` | Authenticate; returns session token |
| POST | `/api/logout` | Invalidate token |
| POST | `/api/change-password` | Change password for logged-in user |
| GET | `/api/todos` | Fetch all todos for the user |
| POST | `/api/todos` | Create a todo |
| PUT | `/api/todos/:id` | Update a todo (text, order, reminder) |
| DELETE | `/api/todos/:id` | Delete a todo |
| GET | `/api/notes` | Fetch notes for the user |
| POST | `/api/notes` | Save notes |

## Environment

The frontend expects the backend at `http://localhost:3010/api`. If you deploy the backend elsewhere, update `API_URL` in `src/App.js`.

## Resetting a Password

```bash
cd backend
source venv/bin/activate
python reset_password.py <username> <new_password>
```
