# BACOVET Mock API Server

A fake API server that derives **everything** from
[`storage/app/public/data.json`](../storage/app/public/data.json) — routes,
HTTP methods, response statuses and payload shapes. Nothing is hard-coded:
edit `data.json` (add an endpoint, rename a column, flip a status) and the
server hot-reloads the change.

Runs on **port 3005** by default.

## Quick start

```bash
cd bacovet-mock
npm install
npm start          # http://localhost:3005
# or
npm run dev        # auto-restart on server.js changes (nodemon)
```

## How it works

| Behavior | Detail |
|----------|--------|
| Routes | Built from each entry's `method` + `endpoint` (base host stripped). |
| Status | Reproduced exactly — e.g. `rovereffectiveness` still returns its captured `500`. |
| Tables (`/api/data/*`) | Sample rows + `columns` are used as seeds; synthetic rows are generated so `limit`/`offset` pagination can go well beyond the captured snapshot. |
| Lookup tables / KPIs | Tables with ≤ 30 captured rows keep their real row count (values jitter per TTL). |
| Non-tabular routes (`/`, login, admin) | Replayed verbatim from `data.json`. |
| Hot reload | `data.json` is watched; routes and pools reload on change. |

## Configuration

All values are env-overridable:

```bash
PORT=3005                     # server port
DATA_FILE=path/to/data.json   # data source (default: ../storage/app/public/data.json)
POOL_SIZE=1000                # generated pool size for large tables
POOL_TTL=60000                # ms between pool regenerations (pagination stays stable within TTL)
```

## Testing endpoints

```bash
# Health / metadata
curl http://localhost:3005/health

# Root (from data.json)
curl http://localhost:3005/

# Tabular endpoint — synthetic rows, paginated
curl "http://localhost:3005/api/data/itemtrxenq?limit=10&offset=0"
curl "http://localhost:3005/api/data/itemtrxenq?limit=10&offset=500"   # beyond the snapshot

# SQL query endpoint
curl "http://localhost:3005/api/data/q/efficience_chaine"

# Error status reproduced from data.json
curl -i http://localhost:3005/api/data/rovereffectiveness

# Admin jobs
curl http://localhost:3005/api/admin/jobs

# Run a job (POST captured in data.json; GET alias works for the client)
curl -X POST http://localhost:3005/api/admin/jobs/52/run
curl http://localhost:3005/api/admin/jobs/52/run

# Login
curl -X POST -H "Content-Type: application/json" \
     -d '{"email":"novacity@bacovet.com","password":"secret"}' \
     http://localhost:3005/api/auth/prestataire/login
```

No authentication is enforced (any `x-api-key` / `Authorization: Bearer` header
is accepted and ignored), so the existing front-end client keeps working as-is.

## Generation rules

- **Numbers** are jittered ±~12% on each pool regeneration.
- **ISO dates** are shifted a few hours.
- **Digit-bearing strings** (IDs, references, padded codes) keep their format
  and trailing padding, but the numbers bump on each variant so different pages
  show different values.
- **Booleans** flip occasionally; `null` values stay `null`.
- If a table has no sample rows, rows are inferred from the `columns` names.
