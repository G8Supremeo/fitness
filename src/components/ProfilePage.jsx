import { useState } from 'react'

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#10b981', '#14b8a6',
  '#06b6d4', '#3b82f6', '#0ea5e9', '#64748b',
]

export default function ProfilePage({ user, api, onUserUpdate, addToast }) {
  const [name, setName] = useState(user?.name || '')
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor || '#6366f1')
  const [savingProfile, setSavingProfile] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  const [recoveryPhrase, setRecoveryPhrase] = useState('')
  const [recoveryLoading, setRecoveryLoading] = useState(false)

  const initial = name?.[0]?.toUpperCase() || 'U'

  const handleProfileSave = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      const result = await api('/profile', { method: 'PUT', body: JSON.stringify({ name, avatarColor }) })
      onUserUpdate?.(result.user)
      addToast('Profile updated successfully', 'success')
    } catch (err) {
      addToast(err.message || 'Failed to update profile', 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      addToast('New passwords do not match', 'error')
      return
    }
    setSavingPassword(true)
    try {
      await api('/profile/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      addToast('Password changed successfully', 'success')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      addToast(err.message || 'Failed to change password', 'error')
    } finally {
      setSavingPassword(false)
    }
  }

  const regenerateRecovery = async () => {
    if (!confirm('Regenerate recovery phrase? Your old phrase will no longer work for password recovery.')) return
    setRecoveryLoading(true)
    try {
      const result = await api('/profile/recovery/regenerate', { method: 'POST' })
      setRecoveryPhrase(result.recoveryPhrase)
      addToast('New recovery phrase generated. Save it somewhere safe.', 'success')
    } catch (err) {
      addToast(err.message || 'Failed to regenerate phrase', 'error')
    } finally {
      setRecoveryLoading(false)
    }
  }

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : '—'

  return (
    <div className="profile-page">
      <header className="page-header">
        <h1>My Profile</h1>
        <p className="page-subtitle">Manage your account, avatar, and security settings.</p>
      </header>

      <div className="profile-grid">
        <section className="card profile-card">
          <div className="profile-hero">
            <div
              className="profile-avatar-large"
              style={{ background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}dd)` }}
            >
              {initial}
            </div>
            <div>
              <h2>{name || 'Your name'}</h2>
              <p className="profile-email">{user?.email}</p>
              <p className="profile-meta">Member since {memberSince}</p>
            </div>
          </div>

          <form onSubmit={handleProfileSave} className="profile-form">
            <div className="form-group">
              <label htmlFor="profile-name">Full name</label>
              <input
                id="profile-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Avatar color</label>
              <div className="color-grid">
                {AVATAR_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`color-swatch${avatarColor === color ? ' selected' : ''}`}
                    style={{ background: color }}
                    onClick={() => setAvatarColor(color)}
                    aria-label={`Choose color ${color}`}
                  />
                ))}
              </div>
            </div>

            <button type="submit" className="btn btn-primary" disabled={savingProfile}>
              {savingProfile ? 'Saving…' : 'Save changes'}
            </button>
          </form>
        </section>

        <section className="card profile-card">
          <h2><span className="icon">🔒</span> Change password</h2>
          <p className="card-subtitle">Use a strong password — at least 6 characters.</p>
          <form onSubmit={handlePasswordChange} className="profile-form">
            <div className="form-group">
              <label htmlFor="current-pw">Current password</label>
              <input
                id="current-pw"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="new-pw">New password</label>
              <input
                id="new-pw"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                autoComplete="new-password"
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
                autoComplete="new-password"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={savingPassword}>
              {savingPassword ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </section>

        <section className="card profile-card">
          <h2><span className="icon">🛡️</span> Recovery phrase</h2>
          <p className="card-subtitle">
            Use your 4-word recovery phrase to reset your password without email access.
            Keep it private — anyone with this phrase can reset your password.
          </p>
          {recoveryPhrase ? (
            <div className="recovery-display">
              <code>{recoveryPhrase}</code>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  navigator.clipboard?.writeText(recoveryPhrase)
                  addToast('Recovery phrase copied', 'success')
                }}
              >
                Copy
              </button>
            </div>
          ) : (
            <p className="recovery-hint">Click below to generate a new recovery phrase.</p>
          )}
          <button
            type="button"
            className="btn btn-ghost"
            onClick={regenerateRecovery}
            disabled={recoveryLoading}
          >
            {recoveryLoading ? 'Generating…' : recoveryPhrase ? 'Regenerate phrase' : 'Generate recovery phrase'}
          </button>
        </section>
      </div>
    </div>
  )
}
