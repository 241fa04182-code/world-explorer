// Live weather via our own /api/weather endpoint (server proxies Open-Meteo,
// so the browser only ever talks to our origin — no CORS, shared cache).
// Uses the country's bundled [lat, lng] centroid so we skip a geocoding call.

// Fetch current weather + a 3-day daily forecast for a country's centroid.
export async function fetchWeather(country) {
  if (!country.latlng?.length) throw new Error('No coordinates for this country')
  const [lat, lon] = country.latlng

  const params = new URLSearchParams({
    lat: lat.toFixed(4),
    lon: lon.toFixed(4),
  })

  const res = await fetch(`/api/weather?${params}`, {
    signal: AbortSignal.timeout(10000),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.error || `Weather request failed (${res.status})`)
  if (!data?.current) throw new Error('Weather response incomplete')

  return {
    place: country.capital || country.name,
    lat,
    lon,
    current: data.current,
    units: data.current_units,
    daily: data.daily,
  }
}

// Weather code -> { label, emoji } using the WMO interpretation table.
export function describeWeather(code) {
  const map = {
    0: ['Clear sky', '☀️'],
    1: ['Mainly clear', '🌤️'],
    2: ['Partly cloudy', '⛅'],
    3: ['Overcast', '☁️'],
    45: ['Fog', '🌫️'],
    48: ['Rime fog', '🌫️'],
    51: ['Light drizzle', '🌦️'],
    53: ['Drizzle', '🌦️'],
    55: ['Dense drizzle', '🌦️'],
    56: ['Freezing drizzle', '🌧️'],
    57: ['Freezing drizzle', '🌧️'],
    61: ['Light rain', '🌧️'],
    63: ['Rain', '🌧️'],
    65: ['Heavy rain', '🌧️'],
    66: ['Freezing rain', '🌧️'],
    67: ['Freezing rain', '🌧️'],
    71: ['Light snow', '🌨️'],
    73: ['Snow', '🌨️'],
    75: ['Heavy snow', '❄️'],
    77: ['Snow grains', '❄️'],
    80: ['Light showers', '🌦️'],
    81: ['Showers', '🌦️'],
    82: ['Violent showers', '⛈️'],
    85: ['Snow showers', '🌨️'],
    86: ['Snow showers', '🌨️'],
    95: ['Thunderstorm', '⛈️'],
    96: ['Thunderstorm + hail', '⛈️'],
    99: ['Thunderstorm + hail', '⛈️'],
  }
  const [label, emoji] = map[code] || ['Unknown', '🌡️']
  return { label, emoji }
}

// Formats a Date (YYYY-MM-DD) into a short weekday label like "Mon".
export function shortDay(isoDate) {
  const d = new Date(`${isoDate}T00:00:00`)
  return d.toLocaleDateString(undefined, { weekday: 'short' })
}
