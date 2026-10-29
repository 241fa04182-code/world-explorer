import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { api } from '../lib/api.js'
import { useAuth } from '../context/AuthContext.jsx'
import AccessCompare from '../components/AccessCompare.jsx'

// Admin dashboard. Two data sources, both admin-only on the backend:
//   GET /api/admin/stats  → platform totals + recent activity
//   GET /api/admin/users  → the full user table
// Regular users never see these: the routes answer 403, and /dashboard shows
// only their own account. The AccessCompare box spells that difference out.
export default function Admin() {
  const { user, loading: authLoading } = useAuth()

  // Guard: wait for session restore before deciding.
  if (authLoading) return <p className="status">Checking your session…</p>
  // Non-admins (and logged-out visitors) get redirected home.
  if (!user?.isAdmin) return <Navigate to="/" replace />

  return <AdminPanel user={user} />
}

function AdminPanel({ user }) {
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([api.adminStats(), api.adminUsers()])
      .then(([statsData, usersData]) => {
        if (cancelled) return
        setStats(statsData)
        setUsers(usersData.users || [])
        setTotal(usersData.total || 0)
        setLoading(false)
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) return <p className="status">Loading admin data…</p>
  if (error) return <p className="status error">Couldn’t load admin data: {error}</p>

  const totals = stats?.totals || {}

  return (
    <div className="app dash">
      {/* Same glassy hero as Explore, over the same fixed background. */}
      <header className="header">
        <div className="brand">
          <span className="brand-globe" aria-hidden>
            <img src="/img/logo-icon.png" alt="" />
          </span>
          <div>
            <h1>Admin dashboard</h1>
            <p className="tagline">Platform-wide backend data — accounts, sessions, activity</p>
          </div>
        </div>
        <div className="header-count">
          <strong className="dash-role">Admin</strong>
          <span>role</span>
        </div>
      </header>

      <main className="main dash-main">
        <section className="stat-grid" aria-label="Platform totals">
          <div className="stat-card stat-card-admin">
            <span className="stat-label">Registered users</span>
            <span className="stat-value">{totals.users}</span>
            <span className="stat-note">all accounts in the backend</span>
          </div>
          <div className="stat-card stat-card-admin">
            <span className="stat-label">Admins</span>
            <span className="stat-value">{totals.admins}</span>
            <span className="stat-note">accounts with admin access</span>
          </div>
          <div className="stat-card stat-card-admin">
            <span className="stat-label">Active sessions</span>
            <span className="stat-value">{totals.sessions}</span>
            <span className="stat-note">signed-in devices (7 days)</span>
          </div>
          <div className="stat-card stat-card-admin">
            <span className="stat-label">New this week</span>
            <span className="stat-value">{totals.newThisWeek}</span>
            <span className="stat-note">signups in the last 7 days</span>
          </div>
        </section>

        <section className="stat-grid stat-grid-activity" aria-label="Recent backend activity">
          <div className="dash-card">
            <h2>Recent signups</h2>
            <ul className="activity-list">
              {(stats?.recentSignups || []).map((u) => (
                <li key={u.id}>
                  <span className="activity-name">
                    {u.name} <span className={`badge${u.isAdmin ? ' badge-admin' : ''}`}>{u.isAdmin ? 'Admin' : 'User'}</span>
                  </span>
                  <span className="activity-meta">{u.email} · {fmtDate(u.createdAt)}</span>
                </li>
              ))}
              {(!stats?.recentSignups || stats.recentSignups.length === 0) && (
                <li className="activity-empty">No accounts yet.</li>
              )}
            </ul>
          </div>

          <div className="dash-card">
            <h2>Recent logins</h2>
            <ul className="activity-list">
              {(stats?.recentLogins || []).map((u) => (
                <li key={u.id}>
                  <span className="activity-name">
                    {u.name} <span className={`badge${u.isAdmin ? ' badge-admin' : ''}`}>{u.isAdmin ? 'Admin' : 'User'}</span>
                  </span>
                  <span className="activity-meta">{u.email} · {fmtDate(u.lastLoginAt)}</span>
                </li>
              ))}
              {(!stats?.recentLogins || stats.recentLogins.length === 0) && (
                <li className="activity-empty">No logins recorded yet.</li>
              )}
            </ul>
          </div>
        </section>

        <section className="dash-card" aria-label="All accounts">
          <h2>
            All accounts <span className="dash-count">{total}</span>
          </h2>
          <p className="dash-note">
            Served by <code>GET /api/admin/users</code> (403 for non-admins). Your
            regular-user dashboard calls <code>GET /api/dashboard</code>, which
            returns only your own row.
          </p>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Last login</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="cell-name">{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <span className={u.isAdmin ? 'badge badge-admin' : 'badge'}>
                        {u.isAdmin ? 'Admin' : 'User'}
                      </span>
                    </td>
                    <td>{fmtDate(u.createdAt)}</td>
                    <td>{u.lastLoginAt ? fmtDate(u.lastLoginAt) : 'Never'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <AccessCompare isAdmin />

        <p className="dash-foot">
          Signed in as {user?.email} · <Link to="/dashboard">Open your personal dashboard</Link> ·{' '}
          <Link to="/">Back to Explore</Link>
        </p>
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
