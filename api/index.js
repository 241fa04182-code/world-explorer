// Vercel serverless entry point.
//
// Vercel invokes this module per request and hands it Node's (req, res), which
// is exactly what an Express app accepts — so we export a handler rather than
// calling listen(). server/index.js skips its own listen() and dist/ static
// serving when VERCEL=1, because the platform serves the static build itself.
//
// Path normalization: vercel.json rewrites /api/(.*) to the function path
// /api/index. Depending on how the platform resolves `dest`, req.url may be
// the original path (/api/auth/login), the function path (/api/index or
// /api/index/auth/login), or a path missing the /api mount entirely. Express
// mounts its routes at /api/..., so normalise all three shapes to that.

import app from '../server/index.js'

const FUNCTION_PREFIX = /^\/api\/index(?=\/|$)/
const ALREADY_MOUNTED = /^\/api(?=\/|$)/

export default function handler(req, res) {
  if (typeof req.url === 'string') {
    if (FUNCTION_PREFIX.test(req.url)) {
      req.url = req.url.replace(FUNCTION_PREFIX, '/api')
    } else if (!ALREADY_MOUNTED.test(req.url)) {
      const path = req.url.startsWith('/') ? req.url : `/${req.url}`
      req.url = `/api${path}`
    }
  }
  return app(req, res)
}
