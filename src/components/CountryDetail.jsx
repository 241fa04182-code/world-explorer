import { useEffect, useState } from 'react'
import { flagUrl, mapsUrl, fetchWeather, describeWeather, shortDay, fetchInrRates } from '../api.js'

export default function CountryDetail({ country, onClose }) {
  const [weather, setWeather] = useState(null)
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [rates, setRates] = useState(null)
  const [ratesStatus, setRatesStatus] = useState('loading') // loading | ready | error

  // Exchange rates (vs INR) are shared across countries, so one fetch feeds
  // every panel open in the session.
  useEffect(() => {
    let cancelled = false
    setRatesStatus('loading')
    fetchInrRates()
      .then((data) => {
        if (!cancelled) {
          setRates(data)
          setRatesStatus('ready')
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error(err)
          setRatesStatus('error')
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Fetch weather whenever the selected country changes.
  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setWeather(null)

    fetchWeather(country)
      .then((data) => {
        if (!cancelled) {
          setWeather(data)
          setStatus('ready')
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error(err)
          setStatus('error')
        }
      })

    return () => {
      cancelled = true
    }
  }, [country])

  const cur = weather?.current
  const cond = cur ? describeWeather(cur.weather_code) : null

  return (
    <div className="overlay" onClick={onClose}>
      <aside
        className="panel"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={country.name}
      >
        <button className="panel-close" onClick={onClose} aria-label="Close">✕</button>

        <img className="panel-flag" src={flagUrl(country, 640)} alt={`Flag of ${country.name}`} />

        <h2 className="panel-title">{country.name}</h2>
        <p className="panel-official">{country.official}</p>

        <dl className="facts">
          <Fact label="Capital" value={country.capital || '—'} />
          <Fact
            label="Region"
            value={[country.region, country.subregion].filter(Boolean).join(' · ') || '—'}
          />
          <Fact label="Population" value={fmt(country.population)} />
          <Fact label="Area" value={country.area ? `${fmt(country.area)} km²` : '—'} />
          <Fact label="Languages" value={langLabel(country.languages)} />
          <Fact label="Currency" value={currencyLabel(country.currencies)} />
        </dl>

        {/* Live weather section */}
        <section className="weather">
          <h3>Weather now</h3>

          {status === 'loading' && <p className="weather-loading">Fetching live weather…</p>}

          {status === 'error' && (
            <p className="weather-error">
              Weather unavailable right now for this location.
            </p>
          )}

          {status === 'ready' && cur && (
            <>
              <div className="weather-now">
                <span className="weather-emoji" aria-hidden>{cond.emoji}</span>
                <div>
                  <p className="weather-temp">
                    {Math.round(cur.temperature_2m)}
                    {cur.units?.temperature_2m || '°'}
                  </p>
                  <p className="weather-desc">
                    {cond.label} in {weather.place}
                  </p>
                </div>
              </div>

              <ul className="weather-stats">
                <li>Feels like {Math.round(cur.apparent_temperature)}°</li>
                <li>💧 {cur.relative_humidity_2m}% humidity</li>
                <li>💨 {Math.round(cur.wind_speed_10m)} {weather.units?.wind_speed_10m || 'km/h'}</li>
                <li>{cur.is_day ? '🌞 Day' : '🌙 Night'}</li>
              </ul>

              {weather.daily && (
                <div className="forecast">
                  {weather.daily.time.map((day, i) => {
                    const d = describeWeather(weather.daily.weather_code[i])
                    return (
                      <div className="forecast-day" key={day}>
                        <span className="forecast-name">{shortDay(day)}</span>
                        <span className="forecast-emoji" aria-hidden>{d.emoji}</span>
                        <span className="forecast-temp">
                          {Math.round(weather.daily.temperature_2m_max[i])}° /{' '}
                          {Math.round(weather.daily.temperature_2m_min[i])}°
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </section>

        {/* Currency vs Indian rupee — a separate box below the weather one */}
        <section className="currency">
          <h3>Compared with Indian Rupee (INR)</h3>

          {ratesStatus === 'loading' && (
            <p className="weather-loading">Fetching exchange rates…</p>
          )}

          {ratesStatus === 'error' && (
            <p className="weather-error">Exchange rates unavailable right now.</p>
          )}

          {ratesStatus === 'ready' && rates && (
            <>
              <div className="currency-rows">
                {Object.entries(country.currencies || {}).map(([code, cur]) => {
                  const rate = rates.rates?.[code]
                  return (
                    <div className="currency-row" key={code}>
                      <div className="currency-name">
                        <strong>{cur?.name || code}</strong>
                        <span className="currency-code">
                          {cur?.symbol ? `${cur.symbol} · ` : ''}{code}
                        </span>
                      </div>

                      {code === 'INR' ? (
                        <p className="currency-rate">Already the Indian Rupee</p>
                      ) : rate ? (
                        <div className="currency-rate">
                          <span className="currency-pair">
                            1 {code} = <strong>₹{fmtRate(rate)}</strong>
                          </span>
                          <span className="currency-pair">
                            ₹1 = <strong>{fmtRate(1 / rate)} {code}</strong>
                          </span>
                        </div>
                      ) : (
                        <p className="currency-rate">Rate not available for {code}</p>
                      )}
                    </div>
                  )
                })}
              </div>

              {rates.updated && (
                <p className="currency-updated">Rates updated {rates.updated}</p>
              )}
            </>
          )}
        </section>

        {mapsUrl(country) && (
          <a className="panel-link" href={mapsUrl(country)} target="_blank" rel="noreferrer">
            View on Google Maps →
          </a>
        )}
      </aside>
    </div>
  )
}

function Fact({ label, value }) {
  return (
    <div className="fact">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function langLabel(languages) {
  if (!languages) return '—'
  return Object.values(languages).join(', ')
}

function currencyLabel(currencies) {
  if (!currencies) return '—'
  return Object.entries(currencies)
    .map(([code, c]) => `${c.name} (${code}${c.symbol ? ' ' + c.symbol : ''})`)
    .join(', ')
}

// Format a currency rate in Indian grouping, keeping small values readable
// (e.g. 1 JPY ≈ ₹0.55) and huge ones compact (e.g. 1 IDR ≈ ₹0.00534 → shown
// with 4 decimals rather than a wall of zeros).
function fmtRate(value) {
  if (!Number.isFinite(value)) return '—'
  const digits = value >= 1000 ? 2 : value >= 1 ? 2 : value >= 0.01 ? 4 : 6
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: digits,
  })
}

function fmt(n) {
  return n ? n.toLocaleString() : '—'
}
