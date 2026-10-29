// World Explorer backend: auth + admin API.
// Runs on port 3001. In dev, Vite proxies /api here. In production it also
// serves the built frontend from dist/ so the whole app runs on one port.
//
// On Vercel, api/index.js imports the exported `app` instead and the platform
// invokes it per request — so we must NOT call listen() there.

import express from 'express'
import cookieParser from 'cookie-parser'
import bcrypt from 'bcryptjs'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  getUserByEmail,
  getUserById,
  createUser,
  listUsers,
  countUsers,
  countAdmins,
  recordLogin,
  publicUser,
  createSession,
  getSession,
  deleteSession,
  countSessions,
  sessionsForUser,
} from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
// Some environments (e.g. sandboxes) set PORT=0 or leave it empty; treat any
// falsy/zero value as "unset" and fall back to 3001.
const PORT = Number(process.env.PORT) || 3001
const COOKIE_NAME = 'we_token'

app.use(express.json())
app.use(cookieParser())

// --- auth helpers -----------------------------------------------------------

// Token can arrive as an httpOnly cookie or an Authorization: Bearer header.
function getToken(req) {
  if (req.cookies?.[COOKIE_NAME]) return req.cookies[COOKIE_NAME]
  const auth = req.headers.authorization
  if (auth?.startsWith('Bearer ')) return auth.slice(7)
  return null
}

function currentUser(req) {
  const token = getToken(req)
  if (!token) return null
  const session = getSession(token)
  if (!session) return null
  return getUserById(session.userId)
}

function requireAuth(req, res, next) {
  const user = currentUser(req)
  if (!user) return res.status(401).json({ error: 'Not signed in' })
  req.user = user
  next()
}

function requireAdmin(req, res, next) {
  if (!req.user?.isAdmin) return res.status(403).json({ error: 'Admins only' })
  next()
}

function setAuthCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    // In production behind HTTPS; localhost works over http with secure:false.
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  })
}

// --- auth routes ------------------------------------------------------------

app.post('/api/auth/signup', (req, res) => {
  const { name, email, password } = req.body || {}
  if (!name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }
  if (getUserByEmail(email)) {
    return res.status(409).json({ error: 'An account with that email already exists' })
  }
  const user = createUser({ name, email, password })
  const token = createSession(user.id)
  setAuthCookie(res, token)
  res.status(201).json({ user: publicUser(user) })
})

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {}
  const user = email ? getUserByEmail(email) : null
  if (!user || !bcrypt.compareSync(password || '', user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }
  recordLogin(user.id)
  const token = createSession(user.id)
  setAuthCookie(res, token)
  res.json({ user: publicUser(user) })
})

app.post('/api/auth/logout', (req, res) => {
  const token = getToken(req)
  if (token) deleteSession(token)
  res.clearCookie(COOKIE_NAME, { path: '/' })
  res.json({ ok: true })
})

app.get('/api/auth/me', (req, res) => {
  res.json({ user: publicUser(currentUser(req)) })
})

// --- dashboard routes -------------------------------------------------------

// User dashboard: deliberately scoped to *this* account only — no totals, no
// other people. That's the core difference from the admin dashboard below.
app.get('/api/dashboard', requireAuth, (req, res) => {
  const user = req.user
  const sessions = sessionsForUser(user.id)
  const joined = Date.parse(user.createdAt)
  const memberDays = Number.isFinite(joined)
    ? Math.max(0, Math.floor((Date.now() - joined) / 86_400_000))
    : 0

  res.json({
    user: publicUser(user),
    stats: {
      memberDays,
      activeSessions: sessions.length,
      lastLoginAt: user.lastLoginAt,
    },
  })
})

// Admin dashboard: platform-wide aggregates + the full user table source.
app.get('/api/admin/stats', requireAuth, requireAdmin, (req, res) => {
  const users = listUsers()
  const now = Date.now()
  const week = 7 * 24 * 60 * 60 * 1000
  const byNewest = (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)

  const recentSignups = [...users].sort(byNewest).slice(0, 5)
  const recentLogins = users
    .filter((u) => u.lastLoginAt)
    .sort((a, b) => Date.parse(b.lastLoginAt) - Date.parse(a.lastLoginAt))
    .slice(0, 5)

  res.json({
    totals: {
      users: countUsers(),
      admins: countAdmins(),
      sessions: countSessions(),
      newThisWeek: users.filter((u) => now - Date.parse(u.createdAt) < week).length,
    },
    recentSignups: recentSignups.map(publicUser),
    recentLogins: recentLogins.map(publicUser),
  })
})

// --- admin routes -----------------------------------------------------------

app.get('/api/admin/users', requireAuth, requireAdmin, (req, res) => {
  const users = listUsers().map(publicUser)
  res.json({ users, total: users.length })
})

// --- weather proxy -----------------------------------------------------------
// The frontend fetches /api/weather on its own origin instead of calling
// Open-Meteo directly: no CORS involved, one shared cache for all clients, and
// the provider's rate limit is applied to the server rather than the browser.

const WEATHER_TTL_MS = 10 * 60 * 1000 // 10 minutes
const WEATHER_CACHE_MAX = 500
const weatherCache = new Map()

const WEATHER_PARAMS = {
  current:
    'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m',
  daily: 'weather_code,temperature_2m_max,temperature_2m_min',
  forecast_days: '3',
  timezone: 'auto',
}

async function loadWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat.toFixed(4),
    longitude: lon.toFixed(4),
    ...WEATHER_PARAMS,
  })
  const url = `https://api.open-meteo.com/v1/forecast?${params}`
  let lastErr
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const upstream = await fetch(url, {
        headers: { 'User-Agent': 'world-explorer/1.0 (weather proxy)' },
        signal: AbortSignal.timeout(8000),
      })
      if (!upstream.ok) {
        lastErr = new Error(`provider status ${upstream.status}`)
        // Don't retry client errors (bad coordinates, 400/404).
        if (upstream.status >= 400 && upstream.status < 500 && upstream.status !== 429) break
        continue
      }
      return await upstream.json()
    } catch (err) {
      lastErr = err
    }
  }
  throw lastErr || new Error('weather provider unreachable')
}

app.get('/api/weather', async (req, res) => {
  const lat = Number(req.query.lat)
  const lon = Number(req.query.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return res.status(400).json({ error: 'lat and lon must be valid coordinates' })
  }

  const key = `${lat.toFixed(3)},${lon.toFixed(3)}`
  const hit = weatherCache.get(key)
  if (hit && Date.now() - hit.at < WEATHER_TTL_MS) return res.json(hit.data)

  try {
    const data = await loadWeather(lat, lon)
    if (!data?.current) throw new Error('provider response missing current weather')
    if (weatherCache.size >= WEATHER_CACHE_MAX) {
      weatherCache.delete(weatherCache.keys().next().value) // evict oldest
    }
    weatherCache.set(key, { data, at: Date.now() })
    res.json(data)
  } catch (err) {
    console.error('weather proxy error:', err.message)
    res.status(502).json({ error: 'Weather provider unreachable' })
  }
})

// --- currency proxy ---------------------------------------------------------
// The panel compares every country's currency with the Indian rupee (INR).
// Rates come from ExchangeRate-API's free open feed (no key), fetched with an
// INR base so a single call covers every currency, cached server-side since
// the feed only updates once a day.

const CURRENCY_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours (feed updates daily)
let currencyCache = null

async function loadInrRates() {
  const upstream = await fetch('https://open.er-api.com/v6/latest/INR', {
    headers: { 'User-Agent': 'world-explorer/1.0 (currency proxy)' },
    signal: AbortSignal.timeout(8000),
  })
  if (!upstream.ok) throw new Error(`provider status ${upstream.status}`)
  const data = await upstream.json()
  if (data?.result !== 'success' || !data.rates) {
    throw new Error('provider response missing rates')
  }
  // Feed is "1 INR buys X of each currency"; invert so the client can show
  // "1 unit of the local currency = ₹Y" directly.
  const inrPerUnit = {}
  for (const [code, rate] of Object.entries(data.rates)) {
    if (typeof rate === 'number' && rate > 0) inrPerUnit[code] = 1 / rate
  }
  return {
    base: 'INR',
    updated: data.time_last_update_utc || null,
    updatedUnix: data.time_last_update_unix || null,
    rates: inrPerUnit,
  }
}

app.get('/api/currency/rates', async (req, res) => {
  if (currencyCache && Date.now() - currencyCache.at < CURRENCY_TTL_MS) {
    res.set('Cache-Control', 'public, max-age=3600')
    return res.json(currencyCache.data)
  }
  try {
    const data = await loadInrRates()
    currencyCache = { data, at: Date.now() }
    res.set('Cache-Control', 'public, max-age=3600')
    res.json(data)
  } catch (err) {
    console.error('currency proxy error:', err.message)
    // Serve a stale copy if we have one rather than failing the panel.
    if (currencyCache) return res.json(currencyCache.data)
    res.status(502).json({ error: 'Exchange rates unavailable' })
  }
})

// Vercel sets VERCEL=1; there we must not bind a port or serve dist/ (the
// platform serves the static build itself and routes /api/* to the function).
const IS_VERCEL = process.env.VERCEL === '1' || process.env.VERCEL === 'true'

// --- production static serving ----------------------------------------------

const distDir = path.join(__dirname, '..', 'dist')
if (!IS_VERCEL && fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  // SPA fallback for any non-API GET route (client-side routing).
  // Uses app.use() (not a '*' route) so it works on Express 4 and 5.
  app.use((req, res, next) => {
    if (req.method !== 'GET') return next()
    if (req.path.startsWith('/api')) return next()
    // Passing `root` keeps send's dotfile check relative to dist/ — without it,
    // any '.' segment in the absolute path (e.g. a .config dir) 404s the route.
    res.sendFile('index.html', { root: distDir })
  })
}

if (!IS_VERCEL) {
  app.listen(PORT, () => {
    console.log(`World Explorer API running on http://localhost:${PORT}`)
  })
}

// Vercel's Node runtime accepts an Express app directly as the handler.
export default app
