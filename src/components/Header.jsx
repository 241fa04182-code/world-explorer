export default function Header({ count }) {
  return (
    <header className="header">
      <div className="brand">
        <span className="brand-globe" aria-hidden>
          <img src="/img/logo-icon.png" alt="" />
        </span>
        <div>
          <h1>World Explorer</h1>
          <p className="tagline">Search the planet · live weather for every capital</p>
        </div>
      </div>
      <div className="header-count">
        <strong>{count}</strong>
        <span>countries</span>
      </div>
    </header>
  )
}
