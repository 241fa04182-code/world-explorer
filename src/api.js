// Data layer.
// - Country data is bundled locally (see scripts/build-data.mjs) so the core
//   browse/search/filter experience never depends on a third-party API.
// - Live weather uses Open-Meteo (free, no API key) with the country's
//   bundled coordinates, so there's no separate geocoding round-trip.

import rawCountries from './countries.json'
import { fetchWeather, describeWeather, shortDay } from './weather.js'

export { fetchWeather, describeWeather, shortDay }

// Pre-sorted alphabetically by the build script. Return a fresh array so
// callers can't mutate the module-level data.
export const countries = rawCountries.map((c) => ({ ...c }))

// flagcdn.com serves flag images by lowercase ISO2 code. It's free, fast and
// sends `Access-Control-Allow-Origin: *`, so <img> loads cross-origin fine.
export function flagUrl(country, width = 320) {
  const code = (country.cca2 || '').toLowerCase()
  return code ? `https://flagcdn.com/w${width}/${code}.png` : null
}

// Build a Google Maps link from the country's bundled [lat, lng] centroid.
export function mapsUrl(country) {
  if (!country.latlng) return null
  const [lat, lng] = country.latlng
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
}

// --- currency (vs Indian rupee) ---------------------------------------------
// Rates are proxied through our own server (cached there, since the upstream
// feed updates once a day). Cache them in-module too so opening several
// countries in a row makes a single request.

let inrRatesPromise = null

export function fetchInrRates() {
  if (!inrRatesPromise) {
    inrRatesPromise = fetch('/api/currency/rates')
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `rates request failed (${res.status})`)
        }
        const data = await res.json()
        if (!data?.rates) throw new Error('rates missing from response')
        return data
      })
      .catch((err) => {
        inrRatesPromise = null // allow a retry on the next panel open
        throw err
      })
  }
  return inrRatesPromise
}
