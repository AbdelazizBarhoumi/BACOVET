# Novacity Mock API Server

Full mock of the Novacity API contract — 22 endpoints, 36 queries, 39 jobs.
Build your dashboard against this, then switch one variable to go live.

## Quick start

```bash
npm install
npm start          # server on http://localhost:3001
# or
npm run dev        # with auto-reload (nodemon)
```

## What's included

| Section | Count | Route pattern |
|---------|-------|---------------|
| Configured endpoints | 22 | `GET /api/data/:nom` |
| SQL queries | 36 | `GET /api/data/q/:slug` |
| Admin jobs list | 39 | `GET /api/admin/jobs` |
| Manual job run | – | `GET /api/admin/jobs/:id/run` |

All responses match the exact JSON shape from the spec (Novacity API v1.2).

## Authentication

- Data routes expect any non-empty `x-api-key` header.
- Admin routes expect any `Authorization: Bearer <token>` header.
- Set `STRICT_AUTH = true` in `server.js` to enforce exact key matching.

## Switching to production

In your front-end, change **one line**:

```js
// development (mock)
const api = new NovacityClient({
  baseUrl: 'http://localhost:3001',
  apiKey:  'mock-dev-key',
});

// production (real backend)
const api = new NovacityClient({
  baseUrl: 'https://api.novacity.bacovet.com',
  apiKey:  process.env.NOVACITY_API_KEY,
});
```

Or use the `.env` switch if you use Vite:

```env
# .env.development
VITE_API_MODE=mock

# .env.production
VITE_API_MODE=production
VITE_API_BASE_URL=https://api.novacity.bacovet.com
VITE_API_KEY=your-real-key
```

## Mock data behavior

- Data is **randomly jittered** on each request so charts feel alive.
- Dates are always **relative to today** — the data never goes stale.
- Pool size is 200 rows per endpoint; `limit` / `offset` pagination is applied.
- Inactive queries (état: Inactif) still return data in mock mode.

## Testing endpoints

```bash
# Health check
curl http://localhost:3001/health

# Configured endpoint
curl -H "x-api-key: test" "http://localhost:3001/api/data/wip_chaine?limit=10"

# SQL query
curl -H "x-api-key: test" "http://localhost:3001/api/data/q/efficience_chaine"

# Dashboard unifié
curl -H "x-api-key: test" "http://localhost:3001/api/data/q/requete_unifiee_dashboard_tout-en-un"

# Admin jobs
curl -H "Authorization: Bearer tok" "http://localhost:3001/api/admin/jobs"

# Run a specific job
curl -H "Authorization: Bearer tok" "http://localhost:3001/api/admin/jobs/52/run"
```
