import { useState } from 'react'
import { NavLink } from 'react-router-dom'

export default function Navbar({ user, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="top-nav">
      <div className="brand">
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
        {user ? (
          <>
            <NavLink to="/" end onClick={() => setMenuOpen(false)}>Dashboard</NavLink>
            <NavLink to="/history" onClick={() => setMenuOpen(false)}>History</NavLink>
            <NavLink to="/goals" onClick={() => setMenuOpen(false)}>Goals</NavLink>
            <div className="nav-user">
              <div className="nav-avatar" title={user.name}>
                {user.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <button className="logout-btn" onClick={onLogout}>Sign out</button>
            </div>
          </>
        ) : (
          <NavLink to="/login" onClick={() => setMenuOpen(false)}>Sign In</NavLink>
        )}
      </nav>
    </header>
  )
}
