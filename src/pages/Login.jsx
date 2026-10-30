import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { speak } from '../voice.js'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const user = await login(email, password)
      // Greet the returning account by name: signing up and logging out is
      // what puts a user back here, so this is the "welcome back" moment.
      // `login` just resolved, so the name comes from the fresh session.
      speak(`Welcome back, ${user?.name || 'explorer'}`)
      // After logging in, always land on the Explore page. The dashboards
      // are reached from the nav links, not by redirect.
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  // auth-login marks this as the log-in page so its submit button can be green
  // (a "go" action) while sign-up keeps the standard blue/violet accent.
  return (
    <div className="auth-wrap auth-wrap-login auth-login">
      {/* Background video (from your Pinterest pin): 16:9 landscape, so it
          fills a wide screen with no rotation needed. To change it, replace
          public/videos/login-bg.mp4 — or edit this <source> path. */}
      <video
        className="auth-video"
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
        poster="/videos/login-poster.jpg"
      >
        <source src="/videos/login-bg.mp4" type="video/mp4" />
      </video>
      <form className="auth-card" onSubmit={onSubmit}>
        <div className="auth-brand">
          <span className="auth-logo" aria-hidden>
            <img src="/img/logo-icon.png" alt="" />
          </span>
          <span className="auth-brand-name">World Explorer</span>
        </div>
        <h1>Welcome back</h1>
        <p className="auth-sub">Log in to your World Explorer account</p>

        {error && <p className="auth-error">{error}</p>}

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
            placeholder="Your password"
            autoComplete="current-password"
            required
          />
        </label>

        <button className="btn btn-primary btn-block" disabled={busy}>
          {busy ? 'Logging in…' : 'Log in'}
        </button>

        <p className="auth-switch">
          No account? <Link to="/signup">Sign up</Link>
        </p>
        <p className="auth-hint">
          Demo admin: <code>admin@worldexplorer.com</code> / <code>admin123</code>
        </p>
      </form>
    </div>
  )
}
