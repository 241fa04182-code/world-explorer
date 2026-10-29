import { flagUrl } from '../api.js'

export default function CountryGrid({ countries, onSelect }) {
  return (
    <div className="grid">
      {countries.map((c) => (
        <button
          key={c.cca3 || c.cca2}
          className="card"
          onClick={() => onSelect(c.cca2)}
        >
          <img
            className="card-flag"
            src={flagUrl(c, 320)}
            alt={`Flag of ${c.name}`}
            loading="lazy"
          />
          <div className="card-body">
            <h3 className="card-name">{c.name}</h3>
            <p className="card-capital">{c.capital || '—'}</p>
            <p className="card-meta">
              <span>👥 {formatNumber(c.population)}</span>
            </p>
          </div>
        </button>
      ))}
    </div>
  )
}

function formatNumber(n) {
  if (!n) return '—'
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`
  return String(n)
}
