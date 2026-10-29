import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Signup() {
  const { signup } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setBusy(true)
    try {
      await signup(name, email, password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth-wrap auth-wrap-login">
      {/* Background video (the previous shared clip, kept for sign-up).
          To change it, replace public/videos/shared-bg.mp4 — or edit this
          <source> path. */}
      <video
        className="auth-video"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
        poster="/videos/shared-poster.jpg"
      >
        <source src="/videos/shared-bg.mp4" type="video/mp4" />
      </video>
      <form className="auth-card" onSubmit={onSubmit}>
        <div className="auth-brand">
          <span className="auth-logo" aria-hidden>
            <img src="/img/logo-icon.png" alt="" />
          </span>
          <span className="auth-brand-name">World Explorer</span>
        </div>
        <h1>Create your account</h1>
        <p className="auth-sub">Join World Explorer to start exploring</p>

        {error && <p className="auth-error">{error}</p>}

        <label className="field">
          <span>Name</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            autoComplete="name"
            required
          />
        </label>

        <label className="field">
          <span>Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            autoComplete="new-password"
            required
          />
        </label>

        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Creating account…' : 'Sign up'}
        </button>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </form>
    </div>
  )
}
