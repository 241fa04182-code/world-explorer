// Vercel serverless entry point.
//
// Vercel invokes this module per request and hands it Node's (req, res), which
// is exactly what an Express app accepts — so we export a handler rather than
// calling listen(). server/index.js skips its own listen() and dist/ static
// serving when VERCEL=1, because the platform serves the static build itself.
//
// Path normalization: vercel.json routes /api/(.*) to /api/index/$1. Vercel
// documents `dest` as "the URL path your Function reads from req.url", so the
// handler may be handed /api/index/auth/login. Express has its routes mounted
// at /api/auth/login, so collapse that prefix back. If the platform instead
// passes the original URL through untouched, the regex doesn't match and the
// path is left alone — both behaviours work.

import app from '../server/index.js'

const REWRITTEN_PREFIX = /^\/api\/index(?=\/|$)/

export default function handler(req, res) {
  if (typeof req.url === 'string' && REWRITTEN_PREFIX.test(req.url)) {
    req.url = req.url.replace(REWRITTEN_PREFIX, '/api')
  }
  return app(req, res)
}
