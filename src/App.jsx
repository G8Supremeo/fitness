import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import './App.css'

import Navbar from './components/Navbar'
import AuthPage from './components/AuthPage'
import Dashboard from './components/Dashboard'
import HistoryPage from './components/HistoryPage'
import GoalsPage from './components/GoalsPage'
import LandingPage from './components/LandingPage'
import Toast from './components/Toast'
import ProfilePage from './components/ProfilePage'
import ForgotPasswordPage from './components/ForgotPasswordPage'
import SyncTimeline from './components/SyncTimeline'
import { useToast } from './hooks/useToast'

const API_BASE = 'http://localhost:4100/api'
const TOKEN_KEY = 'fitness_token'

const ProtectedRoute = ({ isAuthed, children }) =>
  isAuthed ? children : <Navigate to="/login" replace />

function App() {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || '')
  const [activeUser, setActiveUser] = useState(null)
  const [logs, setLogs] = useState([])
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const { toasts, addToast, removeToast } = useToast()

  // ── API Helper ──
  const api = async (path, options = {}, authToken = token) => {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
    })
    const body = await response.json()
    if (!response.ok) throw new Error(body.error || 'Request failed')
    return body
  }

  // ── Data Refresh ──
  const refreshData = async () => {
    const [me, logsRes, goalsRes] = await Promise.all([
      api('/me'),
      api('/logs'),
      api('/goals'),
    ])
    setActiveUser(me.user)
    setLogs(logsRes.logs)
    setGoals(goalsRes.goals)
  }

  useEffect(() => {
    if (!token) {
      localStorage.removeItem(TOKEN_KEY)
      setActiveUser(null)
      setLogs([])
      setGoals([])
      setLoading(false)
      return
    }
    localStorage.setItem(TOKEN_KEY, token)
    setLoading(true)
    refreshData()
      .catch(() => setToken(''))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // ── Auth Actions ──
  const register = async (form) => {
    const result = await api('/auth/register', { method: 'POST', body: JSON.stringify(form) }, '')
    setToken(result.token)
    if (result.recoveryPhrase) {
      // Stash phrase so DashboardWelcome / Profile can surface it
      sessionStorage.setItem('signup_recovery_phrase', result.recoveryPhrase)
      addToast(`Save your recovery phrase: ${result.recoveryPhrase}`, 'info')
    }
  }

  const login = async (form) => {
    const result = await api('/auth/login', { method: 'POST', body: JSON.stringify(form) }, '')
    setToken(result.token)
  }

  const logout = () => {
    setToken('')
    addToast('Signed out successfully', 'info')
  }

  // ── CRUD Actions ──
  const addLog = async (formData) => {
    await api('/logs', { method: 'POST', body: JSON.stringify(formData) })
    await refreshData()
  }

  const deleteLog = async (id) => {
    await api(`/logs/${id}`, { method: 'DELETE' })
    await refreshData()
  }

  const addGoal = async (goal) => {
    await api('/goals', { method: 'POST', body: JSON.stringify(goal) })
    await refreshData()
  }

  const deleteGoal = async (id) => {
    await api(`/goals/${id}`, { method: 'DELETE' })
    await refreshData()
  }

  const isAuthed = Boolean(token && activeUser)

  // Don't show loading spinner on auth pages
  if (loading && token) {
    return (
      <div style={{
        display: 'grid',
        placeItems: 'center',
        minHeight: '100vh',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-display)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 48,
            height: 48,
            border: '3px solid var(--border-subtle)',
            borderTopColor: 'var(--accent-primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            margin: '0 auto 1rem',
          }} />
          <p>Loading your data…</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Toast toasts={toasts} removeToast={removeToast} />

      <Routes>
        {/* Public pages — no navbar, full-screen layout */}
        <Route
          path="/"
          element={<LandingPage isAuthed={isAuthed} />}
        />
        <Route
          path="/login"
          element={
            isAuthed ? <Navigate to="/dashboard" replace /> :
            <AuthPage mode="login" onSubmit={login} />
          }
        />
        <Route
          path="/register"
          element={
            isAuthed ? <Navigate to="/dashboard" replace /> :
            <AuthPage mode="register" onSubmit={register} />
          }
        />
        <Route
          path="/forgot-password"
          element={
            isAuthed ? <Navigate to="/dashboard" replace /> :
            <ForgotPasswordPage />
          }
        />

        {/* App pages — with navbar */}
        <Route
          path="*"
          element={
            <div className="app-shell">
              <Navbar user={activeUser} onLogout={logout} />
              <Routes>
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute isAuthed={isAuthed}>
                      <Dashboard
                        user={activeUser}
                        logs={logs}
                        goals={goals}
                        addLog={addLog}
                        addToast={addToast}
                        onSyncRefresh={refreshData}
                      />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/history"
                  element={
                    <ProtectedRoute isAuthed={isAuthed}>
                      <HistoryPage
                        logs={logs}
                        onDelete={deleteLog}
                        addToast={addToast}
                      />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/goals"
                  element={
                    <ProtectedRoute isAuthed={isAuthed}>
                      <GoalsPage
                        goals={goals}
                        logs={logs}
                        addGoal={addGoal}
                        deleteGoal={deleteGoal}
                        addToast={addToast}
                      />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/profile"
                  element={
                    <ProtectedRoute isAuthed={isAuthed}>
                      <ProfilePage
                        user={activeUser}
                        api={api}
                        onUserUpdate={setActiveUser}
                        addToast={addToast}
                      />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/sync-timeline"
                  element={
                    <ProtectedRoute isAuthed={isAuthed}>
                      <SyncTimeline api={api} addToast={addToast} />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<Navigate to={isAuthed ? "/dashboard" : "/"} replace />} />
              </Routes>
            </div>
          }
        />
      </Routes>
    </>
  )
}

export default App
