import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'

const API_BASE = 'http://localhost:4100/api'

export default function ForgotPasswordPage() {
  const [stage, setStage] = useState('request') // request | reset | success
  const [method, setMethod] = useState('code') // code | phrase
  const [email, setEmail] = useState('')
  const [resetCode, setResetCode] = useState('')
  const [recoveryPhrase, setRecoveryPhrase] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [issuedCode, setIssuedCode] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const navigate = useNavigate()

  const callApi = async (path, body) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Request failed')
    return data
  }

  const requestCode = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await callApi('/auth/forgot-password', { email })
      if (data.resetCode) {
        setIssuedCode(data.resetCode)
        setExpiresAt(data.expiresAt)
      }
      setStage('reset')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (e) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      if (method === 'code') {
        await callApi('/auth/reset-password', { email, resetCode, newPassword })
      } else {
        await callApi('/auth/recover-with-phrase', { email, recoveryPhrase, newPassword })
      }
      setStage('success')
      setTimeout(() => navigate('/login'), 2500)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-hero">
        <div className="auth-hero-content">
          <div className="auth-hero-logo">S</div>
          <h2>Reset your password</h2>
          <p>Two ways to recover your account: a one-time reset code or your 4-word recovery phrase.</p>
          <div className="auth-features">
            <div className="auth-feature">
              <span className="check">✓</span>
              <span>Reset codes expire after 30 minutes</span>
            </div>
            <div className="auth-feature">
              <span className="check">✓</span>
              <span>Recovery phrases work without email access</span>
            </div>
            <div className="auth-feature">
              <span className="check">✓</span>
              <span>Your data stays safe and encrypted</span>
            </div>
          </div>
        </div>
      </div>

      <div className="auth-form-side">
        <section className="auth-card card">
          {stage === 'request' && (
            <>
              <h2>Forgot password?</h2>
              <p className="auth-sub">Enter your email and we'll generate a reset code.</p>

              <form onSubmit={requestCode}>
                <div className="form-group">
                  <label htmlFor="recover-email">Email address</label>
                  <input
                    id="recover-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoFocus
                  />
                </div>

                {error && <p className="auth-error">{error}</p>}

                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                  {loading ? 'Generating…' : 'Generate reset code'}
                </button>
              </form>

              <p className="auth-switch">
                Remembered it? <NavLink to="/login">Sign in</NavLink>
              </p>
            </>
          )}

          {stage === 'reset' && (
            <>
              <h2>Set a new password</h2>
              {issuedCode && (
                <div className="reset-code-display">
                  <p className="auth-sub" style={{ marginBottom: 4 }}>Your reset code:</p>
                  <code>{issuedCode}</code>
                  {expiresAt && (
                    <p className="reset-expires">
                      Expires at {new Date(expiresAt).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              )}

              <div className="auth-tabs">
                <button
                  type="button"
                  className={`auth-tab${method === 'code' ? ' active' : ''}`}
                  onClick={() => setMethod('code')}
                >
                  Reset code
                </button>
                <button
                  type="button"
                  className={`auth-tab${method === 'phrase' ? ' active' : ''}`}
                  onClick={() => setMethod('phrase')}
                >
                  Recovery phrase
                </button>
              </div>

              <form onSubmit={resetPassword}>
                {method === 'code' ? (
                  <div className="form-group">
                    <label htmlFor="reset-code">Reset code</label>
                    <input
                      id="reset-code"
                      type="text"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value.toUpperCase())}
                      placeholder="ABCD1234"
                      maxLength={8}
                      required
                    />
                  </div>
                ) : (
                  <div className="form-group">
                    <label htmlFor="phrase">4-word recovery phrase</label>
                    <input
                      id="phrase"
                      type="text"
                      value={recoveryPhrase}
                      onChange={(e) => setRecoveryPhrase(e.target.value)}
                      placeholder="e.g. mountain-river-forest-ocean"
                      required
                    />
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="new-pw">New password</label>
                  <input
                    id="new-pw"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="confirm-pw">Confirm new password</label>
                  <input
                    id="confirm-pw"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                </div>

                {error && <p className="auth-error">{error}</p>}

                <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
                  {loading ? 'Resetting…' : 'Reset password'}
                </button>
              </form>

              <p className="auth-switch">
                <button type="button" className="link-btn" onClick={() => setStage('request')}>
                  ← Use a different email
                </button>
              </p>
            </>
          )}

          {stage === 'success' && (
            <>
              <h2>Password reset!</h2>
              <p className="auth-sub">
                Your password has been reset. Redirecting to sign in…
              </p>
              <NavLink to="/login" className="btn btn-primary btn-full" style={{ marginTop: '1rem', display: 'block', textAlign: 'center' }}>
                Sign in now
              </NavLink>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
