import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import AccessCompare from '../components/AccessCompare.jsx'

// The regular user's dashboard. Deliberately narrow: it fetches
// /api/dashboard, which only ever returns this account's own data — the
// platform-wide backend data lives behind the admin dashboard (/admin).
export default function Dashboard() {
  const { user, loading: authLoading } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    api
      .dashboard()
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  if (authLoading) return <p className="status">Checking your session…</p>
  if (!user) return <Navigate to="/login" replace />

  const stats = data?.stats
  const me = data?.user || user

  return (
    <div className="app dash">
      {/* Same glassy hero treatment as the Explore page header, over the same
          fixed background image, so the dashboard reads as part of the app. */}
      <header className="header">
        <div className="brand">
          <span className="brand-globe" aria-hidden>
            <img src="/img/logo-icon.png" alt="" />
          </span>
          <div>
            <h1>Your dashboard</h1>
            <p className="tagline">Your account, your sessions — nothing about anyone else</p>
          </div>
        </div>
        <div className="header-count">
          <strong className="dash-role">{me.isAdmin ? 'Admin' : 'User'}</strong>
          <span>{me.isAdmin ? 'role' : 'role'}</span>
        </div>
      </header>

      <main className="main dash-main">
        {error && <p className="status error">Couldn’t load your dashboard: {error}</p>}

        {!error && !data && <p className="status">Loading your dashboard…</p>}

        {data && (
          <>
            <section className="stat-grid" aria-label="Your account at a glance">
              <div className="stat-card">
                <span className="stat-label">Member for</span>
                <span className="stat-value">{stats.memberDays}</span>
                <span className="stat-note">days</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Active sessions</span>
                <span className="stat-value">{stats.activeSessions}</span>
                <span className="stat-note">signed-in devices (7 days)</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Last login</span>
                <span className="stat-value stat-value-sm">{fmtDate(stats.lastLoginAt)}</span>
                <span className="stat-note">{stats.lastLoginAt ? 'from a previous visit' : 'this is your first session'}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Access level</span>
                <span className="stat-value stat-value-sm">{me.isAdmin ? 'Admin' : 'User'}</span>
                <span className="stat-note">
                  {me.isAdmin ? 'can open the admin dashboard' : 'personal data only'}
                </span>
              </div>
            </section>

            <section className="dash-card" aria-label="Your profile">
              <h2>Your profile</h2>
              <dl className="profile-grid">
                <div>
                  <dt>Name</dt>
                  <dd>{me.name}</dd>
                </div>
                <div>
                  <dt>Email</dt>
                  <dd>{me.email}</dd>
                </div>
                <div>
                  <dt>Joined</dt>
                  <dd>{fmtDate(me.createdAt)}</dd>
                </div>
                <div>
                  <dt>Last login</dt>
                  <dd>{me.lastLoginAt ? fmtDate(me.lastLoginAt) : 'First session'}</dd>
                </div>
              </dl>
              <p className="dash-note">
                This page talks to <code>GET /api/dashboard</code>, which returns only
                your row from the backend. Aggregate numbers and other accounts are
                admin-only.
              </p>
              <Link className="btn btn-ghost" to="/">
                ← Back to Explore
              </Link>
            </section>

            <AccessCompare isAdmin={!!me.isAdmin} />
          </>
        )}
      </main>
    </div>
  )
}

function fmtDate(iso) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}
