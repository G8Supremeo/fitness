import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

const REMEMBERED_EMAIL_KEY = 'remembered_email'

function getPasswordStrength(password) {
  if (!password) return { level: 0, label: '' }
  let score = 0
  if (password.length >= 6) score += 1
  if (password.length >= 10) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1

  if (score <= 2) return { level: 1, label: 'Weak' }
  if (score <= 3) return { level: 2, label: 'Medium' }
  return { level: 3, label: 'Strong' }
}

export default function AuthPage({ mode, onSubmit }) {
  const isRegister = mode === 'register'
  const [form, setForm] = useState({
    name: '',
    email: localStorage.getItem(REMEMBERED_EMAIL_KEY) || '',
    password: '',
  })
  const [rememberMe, setRememberMe] = useState(Boolean(localStorage.getItem(REMEMBERED_EMAIL_KEY)))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const strength = getPasswordStrength(form.password)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onSubmit(form)
      if (rememberMe) localStorage.setItem(REMEMBERED_EMAIL_KEY, form.email)
      else localStorage.removeItem(REMEMBERED_EMAIL_KEY)
      navigate('/')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const updateField = (field) => (e) => setForm((s) => ({ ...s, [field]: e.target.value }))

  return (
    <div className="auth-container">
      <div className="auth-hero">
        <div className="auth-hero-content">
          <div className="auth-hero-logo">S</div>
          <h2>Suprimify Performance Lab</h2>
          <p>Track every workout, set ambitious goals, connect your smartwatch, and visualize your fitness journey with stunning analytics.</p>
          <div className="auth-features">
            <div className="auth-feature">
              <span className="check">✓</span>
              <span>Log running, gym, yoga & hydration workouts</span>
            </div>
            <div className="auth-feature">
              <span className="check">✓</span>
              <span>Connect Bluetooth heart rate monitors</span>
            </div>
            <div className="auth-feature">
              <span className="check">✓</span>
              <span>Beautiful charts & streak tracking</span>
            </div>
            <div className="auth-feature">
              <span className="check">✓</span>
              <span>Smart notification reminders</span>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-form-side">
        <section className="auth-card card">
          <h2>{isRegister ? 'Create Account' : 'Welcome Back'}</h2>
          <p className="auth-sub">
            {isRegister
              ? 'Start your fitness journey today'
              : 'Sign in to continue your progress'}
          </p>

          <form onSubmit={handleSubmit}>
            {isRegister && (
              <div className="form-group">
                <label htmlFor="auth-name">Full Name</label>
                <input
                  id="auth-name"
                  type="text"
                  placeholder="John Doe"
                  value={form.name}
                  onChange={updateField('name')}
                  required
                  autoComplete="name"
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="auth-email">Email Address</label>
              <input
                id="auth-email"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={updateField('email')}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="auth-password">Password</label>
              <input
                id="auth-password"
                type="password"
                placeholder={isRegister ? 'Min. 6 characters' : '••••••••'}
                value={form.password}
                onChange={updateField('password')}
                required
                minLength={6}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
              />
              {isRegister && form.password && (
                <>
                  <div className="password-strength">
                    <div className={`bar${strength.level >= 1 ? ` ${strength.label.toLowerCase()}` : ''}`} />
                    <div className={`bar${strength.level >= 2 ? ` ${strength.label.toLowerCase()}` : ''}`} />
                    <div className={`bar${strength.level >= 3 ? ` ${strength.label.toLowerCase()}` : ''}`} />
                  </div>
                  <span className={`password-strength-label ${strength.label.toLowerCase()}`}>
                    {strength.label}
                  </span>
                </>
              )}
            </div>

            <div className="remember-row">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="remember-me">Remember my email</label>
            </div>

            {error && <p className="auth-error">{error}</p>}

            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? '...' : isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <p className="auth-switch">
            {isRegister ? 'Already have an account? ' : "Don't have an account? "}
            <NavLink to={isRegister ? '/login' : '/register'}>
              {isRegister ? 'Sign In' : 'Create Account'}
            </NavLink>
          </p>
        </section>
      </div>
    </div>
  )
}
