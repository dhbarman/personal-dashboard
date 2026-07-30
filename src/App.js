import React, { useState, useEffect, useRef } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

const API_URL = 'http://localhost:3010/api';

function App() {
  // Auth states
  const [token, setToken] = useState(() => localStorage.getItem('todo_token'));
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [cpCurrent, setCpCurrent] = useState('');
  const [cpNew, setCpNew] = useState('');
  const [cpError, setCpError] = useState('');
  const [cpSuccess, setCpSuccess] = useState('');

  // To-Do states
  const [todos, setTodos] = useState([]);
  const [input, setInput] = useState('');
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const dragIndex = useRef(null);
  const [now, setNow] = useState(Date.now());
  const [notes, setNotes] = useState('');
  const [reminders, setReminders] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reminderInput, setReminderInput] = useState('');
  const [saveStatus, setSaveStatus] = useState('');
  const isInitialNotesLoad = useRef(true);

  // Expense Tracker states
  const [expenses, setExpenses] = useState([]);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState('');

  // Monthly Payments states
  const [payments, setPayments] = useState([]);
  const [paymentDesc, setPaymentDesc] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentSource, setPaymentSource] = useState('');

  // Monthly Payments edit states
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [editPaymentDesc, setEditPaymentDesc] = useState('');
  const [editPaymentAmount, setEditPaymentAmount] = useState('');
  const [editPaymentDate, setEditPaymentDate] = useState('');
  const [editPaymentSource, setEditPaymentSource] = useState('');

  // Bookmarks states
  const [bookmarks, setBookmarks] = useState([]);
  const [bookmarkTitle, setBookmarkTitle] = useState('');
  const [bookmarkUrl, setBookmarkUrl] = useState('');
  const [editingBookmarkId, setEditingBookmarkId] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editUrl, setEditUrl] = useState('');

  const apiFetch = (url, opts = {}) => {
    const t = localStorage.getItem('todo_token');
    return fetch(url, {
      ...opts,
      headers: { ...(opts.headers || {}), Authorization: `Bearer ${t}` },
    }).then((res) => {
      if (res.status === 401) {
        localStorage.removeItem('todo_token');
        setToken(null);
      }
      return res;
    });
  };

  const handleLogin = async () => {
    setLoginError('');
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUser, password: loginPass }),
      });
      const data = await res.json();
      if (!res.ok) { setLoginError(data.error || 'Login failed'); return; }
      localStorage.setItem('todo_token', data.token);
      setToken(data.token);
      setLoginUser('');
      setLoginPass('');
    } catch {
      setLoginError('Server unreachable');
    }
  };

  const handleLogout = async () => {
    await apiFetch(`${API_URL}/logout`, { method: 'POST' });
    localStorage.removeItem('todo_token');
    setToken(null);
  };

  const handleChangePassword = async () => {
    setCpError('');
    setCpSuccess('');
    try {
      const res = await apiFetch(`${API_URL}/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current: cpCurrent, new: cpNew }),
      });
      const data = await res.json();
      if (!res.ok) { setCpError(data.error || 'Failed'); return; }
      setCpSuccess('Password changed. Please log in again.');
      setCpCurrent('');
      setCpNew('');
      setTimeout(() => {
        setShowChangePassword(false);
        localStorage.removeItem('todo_token');
        setToken(null);
      }, 1500);
    } catch {
      setCpError('Server unreachable');
    }
  };

  // Load from backend on mount and whenever token changes (e.g. after login)
  useEffect(() => {
    if (!token) return;
    fetchTodos();
    fetchNotes();
    fetchExpenses();
    fetchBookmarks();
    fetchPayments();
  }, [token]);

  // Update timer
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-save notes with debounce
  useEffect(() => {
    if (isInitialNotesLoad.current) {
      isInitialNotesLoad.current = false;
      return;
    }
    setSaveStatus('Saving...');
    const timer = setTimeout(async () => {
      await updateNotes();
      setSaveStatus('Saved');
      setTimeout(() => setSaveStatus(''), 2000);
    }, 1000);
    return () => clearTimeout(timer);
  }, [notes]);

  // ==================== API FUNCTIONS ====================

  const fetchTodos = async () => {
    try {
      const response = await apiFetch(`${API_URL}/todos`);
      const data = await response.json();
      setTodos(data);
    } catch (error) {
      console.error('Error fetching todos:', error);
    }
  };

  const fetchNotes = async () => {
    try {
      const response = await apiFetch(`${API_URL}/notes`);
      const data = await response.json();
      setNotes(data.content || '');
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  const fetchExpenses = async () => {
    try {
      const response = await apiFetch(`${API_URL}/expenses`);
      const data = await response.json();
      setExpenses(data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  const fetchPayments = async () => {
    try {
      const response = await apiFetch(`${API_URL}/payments`);
      const data = await response.json();
      setPayments(data);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const addPayment = async () => {
    if (!paymentDesc.trim() || !paymentAmount) return;
    try {
      const response = await apiFetch(`${API_URL}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: paymentDesc.trim(),
          amount: parseFloat(paymentAmount),
          date: paymentDate || '',
          source: paymentSource.trim(),
        }),
      });
      const data = await response.json();
      setPayments([data, ...payments]);
      setPaymentDesc('');
      setPaymentAmount('');
      setPaymentDate('');
      setPaymentSource('');
    } catch (error) {
      console.error('Error adding payment:', error);
    }
  };

  const deletePayment = async (id) => {
    try {
      await apiFetch(`${API_URL}/payments/${id}`, { method: 'DELETE' });
      setPayments(payments.filter((p) => p.id !== id));
    } catch (error) {
      console.error('Error deleting payment:', error);
    }
  };

  const startEditPayment = (p) => {
    setEditingPaymentId(p.id);
    setEditPaymentDesc(p.description);
    setEditPaymentAmount(p.amount);
    setEditPaymentDate(p.date || '');
    setEditPaymentSource(p.source || '');
  };

  const saveEditPayment = async (id) => {
    const description = editPaymentDesc.trim();
    if (!description || !editPaymentAmount) return;
    try {
      const response = await apiFetch(`${API_URL}/payments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description,
          amount: parseFloat(editPaymentAmount),
          date: editPaymentDate || '',
          source: editPaymentSource.trim(),
        }),
      });
      const data = await response.json();
      setPayments(payments.map((p) => (p.id === id ? data : p)));
      setEditingPaymentId(null);
    } catch (error) {
      console.error('Error updating payment:', error);
    }
  };

  const fetchBookmarks = async () => {
    try {
      const response = await apiFetch(`${API_URL}/bookmarks`);
      const data = await response.json();
      setBookmarks(data);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    }
  };

  const addBookmark = async () => {
    if (!bookmarkTitle.trim() || !bookmarkUrl.trim()) return;
    const url = bookmarkUrl.trim().startsWith('http')
      ? bookmarkUrl.trim()
      : `https://${bookmarkUrl.trim()}`;
    try {
      const response = await apiFetch(`${API_URL}/bookmarks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: bookmarkTitle.trim(), url }),
      });
      const data = await response.json();
      setBookmarks([data, ...bookmarks]);
      setBookmarkTitle('');
      setBookmarkUrl('');
    } catch (error) {
      console.error('Error adding bookmark:', error);
    }
  };

  const deleteBookmark = async (id) => {
    try {
      await apiFetch(`${API_URL}/bookmarks/${id}`, { method: 'DELETE' });
      setBookmarks(bookmarks.filter((b) => b.id !== id));
    } catch (error) {
      console.error('Error deleting bookmark:', error);
    }
  };

  const startEditBookmark = (b) => {
    setEditingBookmarkId(b.id);
    setEditTitle(b.title);
    setEditUrl(b.url);
  };

  const saveEditBookmark = async (id) => {
    const title = editTitle.trim();
    const url   = editUrl.trim().startsWith('http') ? editUrl.trim() : `https://${editUrl.trim()}`;
    if (!title || !url) return;
    try {
      const response = await apiFetch(`${API_URL}/bookmarks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, url }),
      });
      const data = await response.json();
      setBookmarks(bookmarks.map((b) => (b.id === id ? data : b)));
      setEditingBookmarkId(null);
    } catch (error) {
      console.error('Error updating bookmark:', error);
    }
  };

  const updateNotes = async () => {
    try {
      await apiFetch(`${API_URL}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: notes }),
      });
    } catch (error) {
      console.error('Error updating notes:', error);
    }
  };

  // ==================== TO-DO FUNCTIONS ====================

  const sortTodos = (list) =>
    [...list].sort((a, b) => a.priority - b.priority || b.timestamp - a.timestamp);

  const handleDragStart = (index) => { dragIndex.current = index; };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = async (dropIndex) => {
    setDragOverIndex(null);
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === dropIndex) return;

    const reordered = [...todos];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(dropIndex, 0, moved);

    const updated = reordered.map((t, i) => ({ ...t, priority: i }));
    setTodos(updated);

    try {
      await apiFetch(`${API_URL}/todos/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated.map((t) => ({ id: t.id, priority: t.priority }))),
      });
    } catch (err) {
      console.error('Error reordering todos:', err);
      fetchTodos();
    }
  };

  const addTodo = async () => {
    if (input.trim() === '') return;
    const newTodo = { text: input.trim(), timestamp: Date.now(), priority: 0 };
    try {
      const response = await apiFetch(`${API_URL}/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTodo),
      });
      const data = await response.json();
      setTodos((prev) => sortTodos([data, ...prev]));
      setInput('');
    } catch (error) {
      console.error('Error adding todo:', error);
      alert('Failed to add todo');
    }
  };

  const deleteTodo = async (id) => {
    try {
      await apiFetch(`${API_URL}/todos/${id}`, {
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
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
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
      const response = await apiFetch(`${API_URL}/expenses`, {
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
      await apiFetch(`${API_URL}/expenses/${id}`, {
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

  if (!token) {
    return (
      <div style={styles.loginPage}>
        <div style={styles.loginBox}>
          <h2 style={{ marginBottom: 20 }}>Sign In</h2>
          <input
            type="text"
            placeholder="Username"
            value={loginUser}
            onChange={(e) => setLoginUser(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
            style={{ ...styles.input, marginBottom: 10 }}
            autoFocus
          />
          <input
            type="password"
            placeholder="Password"
            value={loginPass}
            onChange={(e) => setLoginPass(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
            style={{ ...styles.input, marginBottom: 10 }}
          />
          {loginError && <div style={styles.errorText}>{loginError}</div>}
          <button onClick={handleLogin} style={{ ...styles.button, width: '100%', boxSizing: 'border-box' }}>
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.topBar}>
        <button onClick={() => setShowChangePassword(true)} style={styles.linkButton}>
          Change Password
        </button>
        <button onClick={handleLogout} style={styles.linkButton}>
          Logout
        </button>
      </div>

      {showChangePassword && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <h3 style={{ marginBottom: 16 }}>Change Password</h3>
            <input
              type="password"
              placeholder="Current password"
              value={cpCurrent}
              onChange={(e) => setCpCurrent(e.target.value)}
              style={{ ...styles.input, marginBottom: 8 }}
              autoFocus
            />
            <input
              type="password"
              placeholder="New password"
              value={cpNew}
              onChange={(e) => setCpNew(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleChangePassword(); }}
              style={{ ...styles.input, marginBottom: 8 }}
            />
            {cpError   && <div style={styles.errorText}>{cpError}</div>}
            {cpSuccess && <div style={styles.successText}>{cpSuccess}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={handleChangePassword} style={styles.button}>Save</button>
              <button onClick={() => { setShowChangePassword(false); setCpError(''); setCpSuccess(''); }} style={styles.secondaryButton}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {/* Left Panel - To-Do */}
      <div style={styles.leftPanel}>
        <h2>To-Do List</h2>
        <div style={styles.inputContainer}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addTodo(); }}
            placeholder="Enter a task"
            style={styles.input}
          />
          <button onClick={addTodo} style={styles.button}>
            Add
          </button>
        </div>

        <ul style={styles.list}>
          {todos.map((todo, index) => (
            <li
              key={todo.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              onDragEnd={() => setDragOverIndex(null)}
              style={{
                ...styles.item,
                ...(dragOverIndex === index ? styles.itemDragOver : {}),
              }}
            >
              <span style={styles.dragHandle} title="Drag to reorder">⠿</span>
              <div style={styles.itemLeft}>
                <span style={styles.taskText}>{todo.text}</span>
                <span style={styles.timeInfo}>({getElapsedTime(todo.timestamp)})</span>
              </div>
              <button
                onClick={() => deleteTodo(todo.id)}
                style={styles.smallDeleteButton}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>

        <h2 style={{ marginTop: 36 }}>Monthly Payments <span style={{ fontSize: '0.7em', fontWeight: 'normal', color: '#555' }}>[${payments.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}]</span></h2>
        <div style={styles.inputContainerColumn}>
          <input
            type="text"
            placeholder="Description"
            value={paymentDesc}
            onChange={(e) => setPaymentDesc(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addPayment(); }}
            style={styles.input}
          />
          <input
            type="number"
            placeholder="Amount"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            style={styles.input}
            min="0"
            step="0.01"
          />
          <input
            type="number"
            placeholder="Day of month (1–31)"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            style={styles.input}
            min="1"
            max="31"
          />
          <input
            type="text"
            placeholder="Source (e.g. Checking, Amex)"
            value={paymentSource}
            onChange={(e) => setPaymentSource(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addPayment(); }}
            style={styles.input}
            list="payment-sources"
          />
          <datalist id="payment-sources">
            <option value="Checking Account" />
            <option value="Savings Account" />
            <option value="Amex" />
            <option value="Visa" />
            <option value="Mastercard" />
            <option value="Cash" />
          </datalist>
          <button
            onClick={addPayment}
            style={{ ...styles.button, marginTop: 4, width: '100%', boxSizing: 'border-box' }}
          >
            Add Payment
          </button>
        </div>
        <ul style={styles.list}>
          {payments.length === 0 && <li style={{ color: '#888', fontSize: 13 }}>No payments added.</li>}
          {payments.map((p) => (
            <li key={p.id} style={{ ...styles.item, padding: '6px 8px' }}>
              {editingPaymentId === p.id ? (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, marginRight: 8 }}>
                    <input
                      value={editPaymentDesc}
                      onChange={(e) => setEditPaymentDesc(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveEditPayment(p.id); if (e.key === 'Escape') setEditingPaymentId(null); }}
                      style={{ ...styles.input, padding: '3px 6px', fontSize: 12 }}
                      autoFocus
                    />
                    <input
                      type="number"
                      value={editPaymentAmount}
                      onChange={(e) => setEditPaymentAmount(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveEditPayment(p.id); if (e.key === 'Escape') setEditingPaymentId(null); }}
                      style={{ ...styles.input, padding: '3px 6px', fontSize: 12 }}
                      min="0" step="0.01"
                    />
                    <input
                      type="number"
                      placeholder="Day of month (1–31)"
                      value={editPaymentDate}
                      onChange={(e) => setEditPaymentDate(e.target.value)}
                      style={{ ...styles.input, padding: '3px 6px', fontSize: 12 }}
                      min="1"
                      max="31"
                    />
                    <input
                      type="text"
                      placeholder="Source (e.g. Checking, Amex)"
                      value={editPaymentSource}
                      onChange={(e) => setEditPaymentSource(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveEditPayment(p.id); if (e.key === 'Escape') setEditingPaymentId(null); }}
                      style={{ ...styles.input, padding: '3px 6px', fontSize: 12 }}
                      list="payment-sources"
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <button onClick={() => saveEditPayment(p.id)} style={styles.smallSaveButton}>Save</button>
                    <button onClick={() => setEditingPaymentId(null)} style={styles.smallCancelButton}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <div style={styles.itemLeft}>
                    <span style={styles.taskText}>{p.description}</span>
                    <span style={styles.timeInfo}>
                      ₹{p.amount.toFixed(2)}{p.date ? ` • due on ${p.date}${['11','12','13'].includes(String(p.date)) ? 'th' : ['1','21','31'].includes(String(p.date)) ? 'st' : ['2','22'].includes(String(p.date)) ? 'nd' : ['3','23'].includes(String(p.date)) ? 'rd' : 'th'} of every month` : ''}{p.source ? ` • ${p.source}` : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => startEditPayment(p)} style={styles.smallEditButton}>Edit</button>
                    <button onClick={() => deletePayment(p.id)} style={styles.smallDeleteButton}>Del</button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Middle Panel - Bookmarks */}
      <div style={styles.middlePanel}>
        <h2>Bookmarks</h2>
        <div style={styles.inputContainerColumn}>
          <input
            type="text"
            placeholder="Title"
            value={bookmarkTitle}
            onChange={(e) => setBookmarkTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addBookmark(); }}
            style={styles.input}
          />
          <input
            type="text"
            placeholder="URL"
            value={bookmarkUrl}
            onChange={(e) => setBookmarkUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addBookmark(); }}
            style={styles.input}
          />
          <button onClick={addBookmark} style={{ ...styles.button, marginTop: 4, width: '100%', boxSizing: 'border-box' }}>
            Add Bookmark
          </button>
        </div>
        <ul style={styles.list}>
          {bookmarks.length === 0 && <li style={{ color: '#888', fontSize: 13 }}>No bookmarks yet.</li>}
          {bookmarks.map((b) => (
            <li key={b.id} style={styles.item}>
              {editingBookmarkId === b.id ? (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, marginRight: 8 }}>
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveEditBookmark(b.id); if (e.key === 'Escape') setEditingBookmarkId(null); }}
                      style={{ ...styles.input, padding: '4px 6px', fontSize: 13 }}
                      autoFocus
                    />
                    <input
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveEditBookmark(b.id); if (e.key === 'Escape') setEditingBookmarkId(null); }}
                      style={{ ...styles.input, padding: '4px 6px', fontSize: 13 }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <button onClick={() => saveEditBookmark(b.id)} style={styles.smallSaveButton}>Save</button>
                    <button onClick={() => setEditingBookmarkId(null)} style={styles.smallCancelButton}>Cancel</button>
                  </div>
                </>
              ) : (
                <>
                  <a href={b.url} target="_blank" rel="noopener noreferrer" style={styles.bookmarkLink}>
                    {b.title}
                  </a>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => startEditBookmark(b)} style={styles.smallEditButton}>Edit</button>
                    <button onClick={() => deleteBookmark(b.id)} style={styles.smallDeleteButton}>Del</button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>

      {/* Right Panel - Notes + Expense Tracker */}
      <div style={styles.rightPanel}>
        <h2>Notes</h2>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Write your notes here..."
          style={styles.notesArea}
        />
        <div style={{ textAlign: 'right', marginTop: 4 }}>
          <span style={styles.saveStatus}>{saveStatus}</span>
        </div>

        <h2 style={{ marginTop: 36 }}>Expense Tracker</h2>
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
                style={styles.smallDeleteButton}
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
  loginPage: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: '#f5f5f5',
  },
  loginBox: {
    background: 'white',
    padding: '40px',
    borderRadius: '8px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
    width: '320px',
    display: 'flex',
    flexDirection: 'column',
  },
  topBar: {
    position: 'fixed',
    top: 10,
    right: 20,
    display: 'flex',
    gap: 12,
    zIndex: 100,
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: '#1a0dab',
    cursor: 'pointer',
    fontSize: 13,
    textDecoration: 'underline',
    padding: 0,
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
  },
  modalBox: {
    background: 'white',
    padding: '32px',
    borderRadius: '8px',
    width: '320px',
    display: 'flex',
    flexDirection: 'column',
  },
  errorText: {
    color: '#ff4d4f',
    fontSize: 13,
    marginBottom: 8,
  },
  successText: {
    color: '#52c41a',
    fontSize: 13,
    marginBottom: 8,
  },
  secondaryButton: {
    padding: '8px 16px',
    background: '#f5f5f5',
    border: '1px solid #ccc',
    borderRadius: 4,
    cursor: 'pointer',
  },
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
    cursor: 'default',
  },
  itemDragOver: {
    background: '#dce8ff',
    borderTop: '2px solid #4a90e2',
  },
  dragHandle: {
    cursor: 'grab',
    color: '#aaa',
    fontSize: 16,
    marginRight: 8,
    userSelect: 'none',
    flexShrink: 0,
  },
  itemLeft: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '5px',
    flex: 1,
    minWidth: 0,
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
  notesArea: {
    width: '100%',
    height: '400px',
    padding: '10px',
    fontSize: '14px',
    resize: 'vertical',
    borderRadius: '4px',
    border: '1px solid #ccc',
  },
  saveStatus: {
    fontSize: '12px',
    color: '#888',
    minWidth: '60px',
    textAlign: 'center',
  },
  bookmarkLink: {
    color: '#1a0dab',
    textDecoration: 'none',
    fontWeight: 'bold',
    wordBreak: 'break-all',
    flex: 1,
    marginRight: 8,
  },
  smallEditButton: {
    fontSize: 11,
    padding: '3px 7px',
    cursor: 'pointer',
    borderRadius: 3,
    border: '1px solid #aaa',
    backgroundColor: '#e8f0fe',
    color: '#333',
    whiteSpace: 'nowrap',
  },
  smallDeleteButton: {
    fontSize: 11,
    padding: '3px 7px',
    cursor: 'pointer',
    borderRadius: 3,
    border: 'none',
    backgroundColor: '#ff4d4f',
    color: 'white',
    whiteSpace: 'nowrap',
  },
  smallSaveButton: {
    fontSize: 11,
    padding: '3px 7px',
    cursor: 'pointer',
    borderRadius: 3,
    border: 'none',
    backgroundColor: '#52c41a',
    color: 'white',
    whiteSpace: 'nowrap',
  },
  smallCancelButton: {
    fontSize: 11,
    padding: '3px 7px',
    cursor: 'pointer',
    borderRadius: 3,
    border: '1px solid #aaa',
    backgroundColor: '#f5f5f5',
    color: '#333',
    whiteSpace: 'nowrap',
  },
};

export default App;
