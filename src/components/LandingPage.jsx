import { Link } from 'react-router-dom'
import { useTheme } from '../hooks/useTheme'
import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts'

const mockChartData = [
  { name: 'Mon', calories: 400 },
  { name: 'Tue', calories: 300 },
  { name: 'Wed', calories: 550 },
  { name: 'Thu', calories: 450 },
  { name: 'Fri', calories: 600 },
  { name: 'Sat', calories: 800 },
  { name: 'Sun', calories: 700 },
]

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

      <main className="landing-hero" style={{ position: 'relative', overflow: 'hidden' }}>
        <video 
          src="/Futuristic_Fitness_App_Promo_Video.mp4" 
          autoPlay 
          loop 
          muted 
          playsInline
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: -2, opacity: 0.4 }}
        />
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'linear-gradient(to bottom, rgba(30, 41, 59, 0.9) 0%, rgba(30, 41, 59, 0.4) 50%, var(--bg-base) 100%)', zIndex: -1, pointerEvents: 'none' }} />

        <div className="hero-content" style={{ position: 'relative', zIndex: 1 }}>
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

        <div className="hero-visual" style={{ position: 'relative', zIndex: 1 }}>
          <div className="glass-card mockup-card">
            <div className="mockup-header">
              <span className="dot" style={{ background: '#ef4444' }} />
              <span className="dot" style={{ background: '#f59e0b' }} />
              <span className="dot" style={{ background: '#10b981' }} />
            </div>
            <div className="mockup-body" style={{ padding: '1rem' }}>
              <div style={{ height: '120px', marginBottom: '1rem', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockChartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCalories" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Tooltip 
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}
                      itemStyle={{ color: 'var(--text-primary)' }}
                    />
                    <Area type="monotone" dataKey="calories" stroke="#10b981" fillOpacity={1} fill="url(#colorCalories)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="stat-row" style={{ display: 'flex', gap: '0.5rem' }}>
                <div style={{ flex: 1, background: 'var(--bg-input)', height: '60px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Calories</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>3,800</span>
                </div>
                <div style={{ flex: 1, background: 'var(--bg-input)', height: '60px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Workouts</span>
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>5</span>
                </div>
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
