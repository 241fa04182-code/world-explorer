// Small fetch wrapper for the auth + admin API. Cookies are sent automatically
// (same-origin / Vite proxy), so we don't manage tokens in the frontend.

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  })

  let data = null
  try {
    data = await res.json()
  } catch {
    /* non-JSON response — fall through */
  }

  if (!res.ok) {
    throw new Error(data?.error || `Request failed (${res.status})`)
  }
  return data
}

export const api = {
  signup: (payload) => request('/api/auth/signup', { method: 'POST', body: payload }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  me: () => request('/api/auth/me'),
  dashboard: () => request('/api/dashboard'),
  adminUsers: () => request('/api/admin/users'),
  adminStats: () => request('/api/admin/stats'),
}
