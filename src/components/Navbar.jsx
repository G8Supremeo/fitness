import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'

export default function Navbar({ user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()

  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const avatarColor = user?.avatarColor || '#6366f1'
  const initial = user?.name?.[0]?.toUpperCase() || 'U'

  return (
    <header className="top-nav">
      <div className="brand" onClick={() => navigate(user ? '/dashboard' : '/')} style={{ cursor: 'pointer' }}>
        <div className="logo">S</div>
        <div className="brand-text">
          <p className="eyebrow">Suprimify</p>
          <h1>Performance Lab</h1>
        </div>
      </div>

      <button
        className="mobile-toggle"
        onClick={() => setMenuOpen((prev) => !prev)}
        aria-label="Toggle navigation"
      >
        {menuOpen ? '✕' : '☰'}
      </button>

      <nav className={`nav-links${menuOpen ? ' open' : ''}`}>
        <button
          onClick={toggleTheme}
          className="theme-toggle"
          aria-label="Toggle theme"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-secondary)' }}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>

        {user ? (
          <>
            <NavLink to="/dashboard" onClick={() => setMenuOpen(false)}>Dashboard</NavLink>
            <NavLink to="/history" onClick={() => setMenuOpen(false)}>History</NavLink>
            <NavLink to="/goals" onClick={() => setMenuOpen(false)}>Goals</NavLink>
            <NavLink to="/sync-timeline" onClick={() => setMenuOpen(false)}>Sync</NavLink>

            <div className="nav-user" ref={userMenuRef}>
              <button
                type="button"
                className="nav-avatar-btn"
                onClick={() => setUserMenuOpen((p) => !p)}
                aria-label="Open user menu"
              >
                <div
                  className="nav-avatar"
                  style={{ background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}dd)` }}
                  title={user.name}
                >
                  {initial}
                </div>
              </button>
              {userMenuOpen && (
                <div className="user-menu-dropdown">
                  <div className="user-menu-header">
                    <div
                      className="nav-avatar"
                      style={{ background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}dd)` }}
                    >
                      {initial}
                    </div>
                    <div>
                      <strong>{user.name}</strong>
                      <span>{user.email}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setUserMenuOpen(false); navigate('/profile'); setMenuOpen(false) }}
                  >
                    My Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => { setUserMenuOpen(false); navigate('/sync-timeline'); setMenuOpen(false) }}
                  >
                    Sync Timeline
                  </button>
                  <button
                    type="button"
                    className="user-menu-logout"
                    onClick={() => { setUserMenuOpen(false); onLogout() }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <NavLink to="/login" onClick={() => setMenuOpen(false)}>Sign In</NavLink>
        )}
      </nav>
    </header>
  )
}
