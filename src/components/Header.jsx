export default function Header({ count }) {
  return (
    <header className="header">
      <div className="brand">
        <h1 className="brand-lockup">
          <img
            src="/img/logo-reference.png"
            alt="World Explorer — Search, Discover, Connect."
          />
        </h1>
      </div>
      <div className="header-count">
        <strong>{count}</strong>
        <span>countries</span>
      </div>
    </header>
  )
}
