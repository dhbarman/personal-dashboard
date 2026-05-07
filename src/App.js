import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const API_URL = 'http://localhost:3010/api';

function App() {
  // To-Do states
  const [todos, setTodos] = useState([]);
  const [input, setInput] = useState('');
  const [now, setNow] = useState(Date.now());
  const [notes, setNotes] = useState('');
  const [reminders, setReminders] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reminderInput, setReminderInput] = useState('');

  // Expense Tracker states
  const [expenses, setExpenses] = useState([]);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState('');

  // Load from backend on mount
  useEffect(() => {
    fetchTodos();
    fetchNotes();
    fetchExpenses();
  }, []);

  // Update timer
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // ==================== API FUNCTIONS ====================

  const fetchTodos = async () => {
    try {
      const response = await fetch(`${API_URL}/todos`);
      const data = await response.json();
      setTodos(data);
    } catch (error) {
      console.error('Error fetching todos:', error);
    }
  };

  const fetchNotes = async () => {
    try {
      const response = await fetch(`${API_URL}/notes`);
      const data = await response.json();
      setNotes(data.content || '');
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  const fetchExpenses = async () => {
    try {
      const response = await fetch(`${API_URL}/expenses`);
      const data = await response.json();
      setExpenses(data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  const updateNotes = async () => {
    try {
      await fetch(`${API_URL}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: notes }),
      });
    } catch (error) {
      console.error('Error updating notes:', error);
    }
  };

  // ==================== TO-DO FUNCTIONS ====================

  const addTodo = async () => {
    if (input.trim() === '') return;
    
    const newTodo = {
      text: input.trim(),
      timestamp: Date.now(),
    };

    try {
      const response = await fetch(`${API_URL}/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTodo),
      });
      const data = await response.json();
      setTodos([data, ...todos]);
      setInput('');
    } catch (error) {
      console.error('Error adding todo:', error);
      alert('Failed to add todo');
    }
  };

  const deleteTodo = async (id) => {
    try {
      await fetch(`${API_URL}/todos/${id}`, {
        method: 'DELETE',
      });
      setTodos(todos.filter((todo) => todo.id !== id));
    } catch (error) {
      console.error('Error deleting todo:', error);
      alert('Failed to delete todo');
    }
  };

  const formatTime = (timestamp) => new Date(timestamp).toLocaleTimeString();

  const getElapsedTime = (timestamp) => {
    const seconds = Math.floor((now - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const uploadTodos = async (event) => {
    const fileReader = new FileReader();
    fileReader.onload = async (e) => {
      try {
        const loadedTodos = JSON.parse(e.target.result);
        if (Array.isArray(loadedTodos)) {
          // Upload all todos to backend
          for (const todo of loadedTodos) {
            await fetch(`${API_URL}/todos`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: todo.text,
                timestamp: todo.timestamp || Date.now()
              }),
            });
          }
          await fetchTodos();
          alert('Todos uploaded successfully!');
        } else {
          alert('Invalid file format.');
        }
      } catch (err) {
        alert('Error reading file.');
      }
    };
    fileReader.readAsText(event.target.files[0]);
  };

  const saveToDirectory = async () => {
    if (!window.showSaveFilePicker) {
      alert('Your browser does not support the File System Access API.');
      return;
    }

    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: 'todos.json',
        types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }],
      });

      const writable = await handle.createWritable();
      await writable.write(JSON.stringify(todos, null, 2));
      await writable.close();
      alert('File saved successfully!');
    } catch (err) {
      console.error('File save error:', err);
      alert('File save was cancelled or failed.');
    }
  };

  const saveNotesToFile = async () => {
    // First save to backend
    await updateNotes();
    
    if (!window.showSaveFilePicker) {
      alert('Your browser does not support the File System Access API.');
      return;
    }

    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: 'notes.txt',
        types: [
          {
            description: 'Text Files',
            accept: { 'text/plain': ['.txt'] },
          },
        ],
      });

      const writable = await handle.createWritable();
      await writable.write(notes);
      await writable.close();
      alert('Notes saved successfully!');
    } catch (err) {
      console.error('File save error:', err);
      alert('File save was cancelled or failed.');
    }
  };

  const saveNotesToBackend = async () => {
    await updateNotes();
    alert('Notes saved to database!');
  };

  const uploadNotes = (event) => {
    const fileReader = new FileReader();
    fileReader.onload = (e) => {
      setNotes(e.target.result);
    };
    fileReader.readAsText(event.target.files[0]);
  };

  // ==================== EXPENSE FUNCTIONS ====================

  const addExpense = async () => {
    if (
      !expenseDesc.trim() ||
      !expenseCategory.trim() ||
      !expenseAmount ||
      !expenseDate
    )
      return;

    const newExpense = {
      desc: expenseDesc.trim(),
      category: expenseCategory.trim(),
      amount: parseFloat(expenseAmount),
      date: expenseDate,
    };

    try {
      const response = await fetch(`${API_URL}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExpense),
      });
      const data = await response.json();
      setExpenses([data, ...expenses]);
      setExpenseDesc('');
      setExpenseCategory('');
      setExpenseAmount('');
      setExpenseDate('');
    } catch (error) {
      console.error('Error adding expense:', error);
      alert('Failed to add expense');
    }
  };

  const deleteExpense = async (id) => {
    try {
      await fetch(`${API_URL}/expenses/${id}`, {
        method: 'DELETE',
      });
      setExpenses(expenses.filter((expense) => expense.id !== id));
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Failed to delete expense');
    }
  };

  const sortedExpenses = [...expenses].sort(
    (a, b) => new Date(b.date) - new Date(a.date)
  );

  const saveExpensesToFile = async () => {
    if (!window.showSaveFilePicker) {
      alert('Your browser does not support the File System Access API.');
      return;
    }

    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: 'expenses.json',
        types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }],
      });

      const writable = await handle.createWritable();
      await writable.write(JSON.stringify(expenses, null, 2));
      await writable.close();
      alert('Expenses saved successfully!');
    } catch (err) {
      console.error('File save error:', err);
      alert('File save was cancelled or failed.');
    }
  };

  const uploadExpenses = async (event) => {
    const fileReader = new FileReader();
    fileReader.onload = async (e) => {
      try {
        const loadedExpenses = JSON.parse(e.target.result);
        if (Array.isArray(loadedExpenses)) {
          // Upload all expenses to backend
          for (const expense of loadedExpenses) {
            await fetch(`${API_URL}/expenses`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(expense),
            });
          }
          await fetchExpenses();
          alert('Expenses uploaded successfully!');
        } else {
          alert('Invalid file format.');
        }
      } catch (err) {
        alert('Error reading file.');
      }
    };
    fileReader.readAsText(event.target.files[0]);
  };

  return (
    <div style={styles.page}>
      {/* Left Panel - To-Do */}
      <div style={styles.leftPanel}>
        <h1>To-Do List</h1>
        <div style={styles.inputContainer}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addTodo();
            }}
            placeholder="Enter a task"
            style={styles.input}
          />
          <button onClick={addTodo} style={styles.button}>
            Add
          </button>
        </div>

        <ul style={styles.list}>
          {todos.map((todo) => (
            <li key={todo.id} style={styles.item}>
              <div style={styles.itemLeft}>
                <span style={styles.taskText}>{todo.text}</span>
                <span style={styles.timeInfo}>
                  (added at {formatTime(todo.timestamp)} •{' '}
                  {getElapsedTime(todo.timestamp)})
                </span>
              </div>
              <button
                onClick={() => deleteTodo(todo.id)}
                style={styles.deleteButton}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>

        <div style={styles.footerButtons}>
          <button onClick={saveToDirectory} style={styles.actionButton}>
            Save
          </button>
          <label
            htmlFor="uploadFile"
            style={{ ...styles.actionButton, cursor: 'pointer' }}
          >
            Upload
          </label>
          <input
            id="uploadFile"
            type="file"
            accept="application/json"
            onChange={uploadTodos}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* Middle Panel - Notes */}
      <div style={styles.middlePanel}>
        <h2>Notes</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Write your notes here..."
          style={styles.notesArea}
        />
        <div style={{ 
          display: 'flex', gap: 10, marginTop: 10, alignItems: 'center',
          justifyContent: 'center', 
        }}>
          <button onClick={saveNotesToBackend} style={{ 
            ...styles.saveNotesButton, 
            width: 120, 
            height: 38, 
            padding: 0,
            backgroundColor: '#4CAF50',
            color: 'white'
          }}>
            Save to DB
          </button>
          <button onClick={saveNotesToFile} style={{ 
            ...styles.saveNotesButton, 
            width: 120, 
            height: 38, 
            padding: 0 
          }}>
            Save to File
          </button>
          <label
            htmlFor="uploadNotesFile"
            style={{ 
              ...styles.actionButton, 
              cursor: 'pointer', 
              padding: '0',
              width: 120,
              height: 38,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              margin: 0,
              marginTop: 10,
            }}
          >
            Upload Notes
          </label>
          <input
            id="uploadNotesFile"
            type="file"
            accept="text/plain"
            onChange={uploadNotes}
            style={{ display: 'none' }}
          />
        </div>
      </div>

      {/* Right Panel - Expense Tracker */}
      <div style={styles.rightPanel}>
        <h2>Expense Tracker</h2>

        <div style={styles.inputContainerColumn}>
          <input
            type="text"
            placeholder="Description"
            value={expenseDesc}
            onChange={(e) => setExpenseDesc(e.target.value)}
            style={styles.input}
          />
          <input
            type="text"
            placeholder="Category"
            value={expenseCategory}
            onChange={(e) => setExpenseCategory(e.target.value)}
            style={styles.input}
          />
          <input
            type="number"
            placeholder="Amount"
            value={expenseAmount}
            onChange={(e) => setExpenseAmount(e.target.value)}
            style={styles.input}
            min="0"
            step="0.01"
          />
          <input
            type="date"
            value={expenseDate}
            onChange={(e) => setExpenseDate(e.target.value)}
            style={styles.input}
          />
          <button onClick={addExpense} style={{ ...styles.button, marginTop: 10 }}>
            Add Expense
          </button>
        </div>

        <div style={{ 
          display: 'flex',
          justifyContent: 'center',
          gap: 10,
          marginBottom: 20,
          alignItems: 'center',
        }}>
          <button
            onClick={saveExpensesToFile}
            style={{ ...styles.actionButton, marginRight: 10 }}
          >
            Save Expenses
          </button>

          <label
            htmlFor="uploadExpensesFile"
            style={{ ...styles.actionButton, cursor: 'pointer' }}
          >
            Upload Expenses
          </label>
          <input
            id="uploadExpensesFile"
            type="file"
            accept="application/json"
            onChange={uploadExpenses}
            style={{ display: 'none' }}
          />
        </div>

        <ul style={styles.list}>
          {sortedExpenses.length === 0 && <li>No expenses recorded.</li>}
          {sortedExpenses.map((expense) => (
            <li key={expense.id} style={styles.item}>
              <div style={styles.itemLeft}>
                <span style={styles.taskText}>{expense.desc}</span>
                <span style={{ marginLeft: 10, fontStyle: 'italic', color: '#555' }}>
                  {expense.category} • ₹{expense.amount.toFixed(2)} • {expense.date}
                </span>
              </div>
              <button
                onClick={() => deleteExpense(expense.id)}
                style={styles.deleteButton}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const styles = {
  page: {
    display: 'flex',
    flexDirection: 'row',
    padding: '20px',
    gap: '30px',
    justifyContent: 'center',
    alignItems: 'flex-start',
    flexWrap: 'nowrap',
    minHeight: '90vh',
  },
  leftPanel: {
    flex: 1,
    minWidth: 280,
    maxWidth: 400,
    textAlign: 'center',
  },
  middlePanel: {
    flex: 1,
    minWidth: 280,
    maxWidth: 400,
  },
  rightPanel: {
    flex: 1,
    minWidth: 280,
    maxWidth: 400,
  },
  inputContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    marginBottom: '20px',
  },
  inputContainerColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginBottom: '20px',
  },
  input: { padding: '8px', width: '100%', boxSizing: 'border-box' },
  button: { padding: '8px 16px', marginRight: '10px' },
  list: { listStyle: 'none', padding: 0, margin: 0 },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    margin: '5px 0',
    background: '#f0f0f0',
    padding: '10px',
    borderRadius: '4px',
  },
  itemLeft: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '5px',
  },
  taskText: { fontWeight: 'bold' },
  timeInfo: {
    fontSize: '12px',
    color: '#555',
  },
  deleteButton: {
    background: '#ff4d4f',
    border: 'none',
    color: 'white',
    padding: '5px 10px',
    cursor: 'pointer',
    borderRadius: '4px',
  },
  footerButtons: {
    marginTop: '20px',
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
  },
  actionButton: {
    padding: '8px 16px',
    fontSize: '14px',
    border: '1px solid #ccc',
    backgroundColor: '#f9f9f9',
    borderRadius: '4px',
  },
  notesArea: {
    width: '100%',
    height: '400px',
    padding: '10px',
    fontSize: '14px',
    resize: 'vertical',
    borderRadius: '4px',
    border: '1px solid #ccc',
  },
  saveNotesButton: {
    marginTop: '10px',
    padding: '8px 16px',
    fontSize: '14px',
    backgroundColor: '#e0e0e0',
    border: '1px solid #ccc',
    borderRadius: '4px',
    cursor: 'pointer',
  },
};

export default App;
