// Tiny JSON-file data store. No native dependencies, so `npm install` is fast
// and works everywhere. For a competition demo this is plenty; swap in SQLite
// or Postgres later without changing the call sites below.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import crypto from 'node:crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Locally we persist next to the code in server/data/. On Vercel the bundle's
// filesystem is read-only and server/data/ is gitignored (so it isn't even in
// the bundle) — /tmp is the only writable location. NOTE: /tmp is ephemeral,
// so on Vercel accounts and sessions reset on cold start. Durable auth needs
// a hosted database (see README "Deploying").
const IS_VERCEL = process.env.VERCEL === '1' || process.env.VERCEL === 'true'
const DATA_DIR = IS_VERCEL
  ? path.join('/tmp', 'world-explorer')
  : path.join(__dirname, 'data')
const DB_FILE = path.join(DATA_DIR, 'db.json')

// --- persistence ------------------------------------------------------------

function load() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
    if (!fs.existsSync(DB_FILE)) {
      const initial = { users: [], sessions: {} }
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2))
      return initial
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
  } catch (err) {
    // Never let storage take the whole API down — degrade to an empty store
    // so routes still answer instead of throwing at import time.
    console.error(`db load failed (${err.code || err.message}); using empty store`)
    return { users: [], sessions: {} }
  }
}

let db = load()

// Debounced write so we don't hammer the disk on rapid changes. On Vercel the
// function can freeze between invocations, so a delayed write would be lost —
// there we flush synchronously instead.
let writeTimer = null
function flush() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
  } catch (err) {
    // Storage may be read-only. Keep serving from memory rather than crashing
    // the request that triggered the write.
    console.error(`db save failed (${err.code || err.message})`)
  }
}
function save() {
  if (IS_VERCEL) return flush()
  clearTimeout(writeTimer)
  writeTimer = setTimeout(flush, 50)
}

// --- seed a default admin ---------------------------------------------------

function ensureAdmin() {
  const email = 'admin@worldexplorer.com'
  if (!db.users.some((u) => u.email === email)) {
    db.users.push({
      id: newId(),
      name: 'Admin',
      email,
      // Password: "admin123" — change this before deploying anywhere real.
      passwordHash: bcrypt.hashSync('admin123', 10),
      isAdmin: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    })
    save()
    console.log('Seeded admin account: admin@worldexplorer.com / admin123')
  }
}

function newId() {
  return crypto.randomUUID()
}

// --- users ------------------------------------------------------------------

export function getUserByEmail(email) {
  return db.users.find((u) => u.email === email.toLowerCase().trim()) || null
}

export function getUserById(id) {
  return db.users.find((u) => u.id === id) || null
}

export function createUser({ name, email, password, isAdmin = false }) {
  const user = {
    id: newId(),
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash: bcrypt.hashSync(password, 10),
    isAdmin,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  }
  db.users.push(user)
  save()
  return user
}

export function listUsers() {
  return db.users
}

export function countUsers() {
  return db.users.length
}

export function countAdmins() {
  return db.users.filter((u) => u.isAdmin).length
}

export function recordLogin(id) {
  const user = getUserById(id)
  if (user) {
    user.lastLoginAt = new Date().toISOString()
    save()
  }
}

// Strip sensitive fields before sending a user to the client.
export function publicUser(user) {
  if (!user) return null
  const { id, name, email, isAdmin, createdAt, lastLoginAt } = user
  return { id, name, email, isAdmin, createdAt, lastLoginAt }
}

// --- sessions ---------------------------------------------------------------

export function createSession(userId) {
  const token = crypto.randomBytes(32).toString('hex')
  db.sessions[token] = { userId, createdAt: new Date().toISOString() }
  save()
  return token
}

export function getSession(token) {
  return db.sessions[token] || null
}

export function countSessions() {
  return Object.keys(db.sessions).length
}

// Sessions for one user, newest first. The cookie lives 7 days, so anything
// younger than that counts as "active" for the dashboards.
export function sessionsForUser(userId) {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
  return Object.values(db.sessions)
    .filter((s) => s.userId === userId && Date.parse(s.createdAt) >= cutoff)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

export function deleteSession(token) {
  delete db.sessions[token]
  save()
}

ensureAdmin()
