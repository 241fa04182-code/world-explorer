// The difference between the user dashboard and the admin dashboard, shown on
// both pages. Whichever level you're on gets the accent highlight, so the box
// doubles as an "you are here" marker.

const USER_ROWS = [
  ['Dashboard route', '/dashboard — your own account only'],
  ['Data visible', 'Your profile, your sessions, your login history'],
  ['Backend access', 'GET /api/dashboard (401 if signed out, 403 never)'],
  ['Can see other users', 'No — other accounts are never returned'],
  ['Country & weather tools', 'Full access, same as admin'],
]

const ADMIN_ROWS = [
  ['Dashboard route', '/admin — platform-wide overview'],
  ['Data visible', 'Every account, totals, sessions, recent activity'],
  ['Backend access', '/api/admin/stats + /api/admin/users (403 for non-admins)'],
  ['Can see other users', 'Yes — full user table with roles and logins'],
  ['Country & weather tools', 'Full access, same as every signed-in user'],
]

export default function AccessCompare({ isAdmin }) {
  return (
    <section className="compare" aria-label="User dashboard versus admin dashboard">
      <h2>User dashboard vs admin dashboard</h2>
      <p className="compare-sub">
        You are signed in as{' '}
        <strong>{isAdmin ? 'an admin' : 'a regular user'}</strong> — your level is
        highlighted. Both dashboards share this background; only the data they can
        reach differs.
      </p>

      <div className="compare-cols">
        <div className={`compare-col${isAdmin ? '' : ' compare-col-me'}`}>
          <header>
            <span className="compare-who">👤 User dashboard</span>
            <span className="badge">{isAdmin ? 'You have this too' : 'Your level'}</span>
          </header>
          <ul>
            {USER_ROWS.map(([label, value]) => (
              <li key={label}>
                <span className="compare-label">{label}</span>
                <span className="compare-value">{value}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className={`compare-col${isAdmin ? ' compare-col-me' : ''}`}>
          <header>
            <span className="compare-who">🛡️ Admin dashboard</span>
            <span className="badge badge-admin">{isAdmin ? 'Your level' : 'Locked'}</span>
          </header>
          <ul>
            {ADMIN_ROWS.map(([label, value]) => (
              <li key={label}>
                <span className="compare-label">{label}</span>
                <span className="compare-value">{value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
