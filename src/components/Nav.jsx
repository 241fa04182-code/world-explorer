import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

export default function Nav() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  return (
    <nav className="nav">
      <div className="nav-inner">
      <Link to="/" className="nav-brand">
        <img className="brand-logo" src="/img/logo-icon.png" alt="" aria-hidden="true" /> World Explorer
      </Link>

      <div className="nav-links">
        <NavLink to="/" end className={navClass}>
          Explore
        </NavLink>

        {user && (
          <NavLink to="/dashboard" className={navClass}>
            Dashboard
          </NavLink>
        )}

        {user?.isAdmin && (
          <NavLink to="/admin" className={navClass}>
            Admin
          </NavLink>
        )}

        {user ? (
          <div className="nav-user">
            <NavLink to="/dashboard" className="nav-username" title={`${user.email} — open your dashboard`}>
              {user.name}
            </NavLink>
            <button className="btn btn-ghost" onClick={handleLogout}>
              Log out
            </button>
          </div>
        ) : (
          <div className="nav-user">
            <NavLink to="/login" className={navClass}>
              Log in
            </NavLink>
            <Link to="/signup" className="btn btn-primary">
              Sign up
            </Link>
          </div>
        )}
      </div>
      </div>
    </nav>
  )
}

function navClass({ isActive }) {
  return isActive ? 'nav-link nav-link-active' : 'nav-link'
}
