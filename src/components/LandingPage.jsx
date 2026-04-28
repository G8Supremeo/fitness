import { Link } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'

export default function LandingPage({ isAuthed }) {
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="brand">
          <div className="logo">S</div>
          <span className="brand-text" style={{ fontSize: '1.2rem', fontWeight: 600 }}>Suprimify Performance Lab</span>
        </div>
        <div className="landing-nav">
          <button 
            onClick={toggleTheme} 
            className="theme-toggle" 
            aria-label="Toggle theme"
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-secondary)', marginRight: '1rem' }}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          {isAuthed ? (
            <Link to="/dashboard" className="btn btn-primary">Go to Dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">Sign In</Link>
              <Link to="/register" className="btn btn-primary">Get Started</Link>
            </>
          )}
        </div>
      </header>

      <main className="landing-hero">
        <div className="hero-content">
          <h1>Master Your <span className="text-gradient">Fitness Journey</span></h1>
          <p className="hero-subtitle">
            The ultimate performance lab. Log every workout precisely, track your goals seamlessly, and sync live data directly from your Bluetooth smartwatch.
          </p>
          <div className="hero-actions">
            {isAuthed ? (
              <Link to="/dashboard" className="btn btn-primary btn-lg">Launch Dashboard</Link>
            ) : (
              <Link to="/register" className="btn btn-primary btn-lg">Start Training for Free</Link>
            )}
            <a href="#features" className="btn btn-ghost btn-lg">Explore Features</a>
          </div>
        </div>

        <div className="hero-visual">
          <div className="glass-card mockup-card">
            <div className="mockup-header">
              <span className="dot" style={{ background: '#ef4444' }} />
              <span className="dot" style={{ background: '#f59e0b' }} />
              <span className="dot" style={{ background: '#10b981' }} />
            </div>
            <div className="mockup-body">
              <div className="chart-placeholder" style={{ background: 'var(--gradient-card)', borderRadius: 'var(--radius-md)', height: '120px', marginBottom: '1rem' }} />
              <div className="stat-row" style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ flex: 1, background: 'var(--bg-input)', height: '60px', borderRadius: 'var(--radius-md)' }} />
                <div style={{ flex: 1, background: 'var(--bg-input)', height: '60px', borderRadius: 'var(--radius-md)' }} />
              </div>
            </div>
          </div>
        </div>
      </main>

      <section id="features" className="landing-features">
        <h2>Everything you need to succeed</h2>
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon text-gradient">📊</div>
            <h3>Deep Analytics</h3>
            <p>Visualize your progress with stunning, interactive charts covering everything from calories to heart rate.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon text-gradient">📡</div>
            <h3>Web Bluetooth Sync</h3>
            <p>Connect your Bluetooth heart rate monitor directly to the web app—no native app required.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon text-gradient">🏋️</div>
            <h3>Specialized Tracking</h3>
            <p>Custom tracking modules for Running, Home Gym, Yoga, and Hydration.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon text-gradient">🎯</div>
            <h3>Smart Goal Setting</h3>
            <p>Set precise weekly and monthly targets, and let our dynamic progress rings keep you accountable.</p>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <p>© {new Date().getFullYear()} Suprimify Performance Lab. All rights reserved.</p>
      </footer>
    </div>
  )
}
