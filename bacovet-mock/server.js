/**
 * ============================================================
 *  BACOVET MOCK API SERVER  —  data.json driven
 * ============================================================
 *  A fake API that derives ALL of its routes and response
 *  shapes from  storage/app/public/data.json  (no hard-coded
 *  endpoint definitions). If that file changes — new endpoint,
 *  renamed column, different status — this server follows.
 *
 *  • Routes  : built from each entry's `method` + `endpoint`
 *  • Status  : reproduced from each entry's `status`
 *  • Rows    : synthesized from the captured sample rows +
 *              `columns`, so limit/offset pagination can go
 *              well beyond the captured snapshot.
 *  • Reload  : watches data.json and hot-reloads on change.
 *
 *  Runs on port 3005 by default.
 * ============================================================
 */

const fs = require("fs");
const path = require("path");
const cors = require("cors");
const express = require("express");

const app = express();

// ── Config ────────────────────────────────────────────────────
const PORT = process.env.PORT || 3005;
const DATA_FILE =
  process.env.DATA_FILE || path.join(__dirname, "..", "storage", "app", "public", "data.json");

// Synthetic pool size for large tables (pagination beyond the snapshot).
const POOL_SIZE = parseInt(process.env.POOL_SIZE || "1000", 10);
// Tables with at most this many captured rows are treated as lookup /
// scalar result sets — their row count is preserved, values still jitter.
const SMALL_TABLE_THRESHOLD = 30;
// Pools are regenerated every POOL_TTL ms so data feels alive while
// pagination stays stable within a window.
const POOL_TTL = parseInt(process.env.POOL_TTL || "60000", 10);

// ── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── State ─────────────────────────────────────────────────────
let routes = []; // normalized entries: { method, path, pattern?, status, response }
let lastLoaded = null;
let loadError = null;

/** In-memory cache of generated pools: path -> { at, rows } */
const poolCache = new Map();

// ── Helpers ───────────────────────────────────────────────────

/** Clones a JSON value deeply (so responses are never shared/mutated). */
function deepClone(value) {
  if (value === null || typeof value !== "object") return value;
  return JSON.parse(JSON.stringify(value));
}

/** Strips a URL down to its pathname (base host / query removed). */
function pathnameOf(url) {
  try {
    return new URL(url).pathname;
  } catch {
    return String(url).split("?")[0];
  }
}

/** Turns "/api/admin/jobs/52/run" into a matcher for "/api/admin/jobs/:id/run". */
function patternize(p) {
  const parts = p.split("/").filter(Boolean);
  if (parts.length < 2) return null;
  let hasParam = false;
  for (let i = 0; i < parts.length; i++) {
    if (/^\d+$/.test(parts[i])) {
      parts[i] = ":id";
      hasParam = true;
    }
  }
  return hasParam ? `/${parts.join("/")}` : null;
}

function routeKey(method, p) {
  return `${method} ${p}`;
}

// ── Row synthesis ─────────────────────────────────────────────

const DATE_RE = /^\d{4}-\d{2}-\d{2}T/;

function jitter(value, pct = 10) {
  const factor = 1 + (Math.random() * 2 - 1) * (pct / 100);
  const out = value * factor;
  return Number.isInteger(value) ? Math.round(out) : Math.round(out * 100) / 100;
}

function mutateNumber(value) {
  return jitter(value, 12);
}

function mutateString(value, variant) {
  const m = /^(\D*)(\d+)(\s*)$/.exec(value);
  if (m) {
    const width = m[2].length;
    const bumped = String(Math.abs(parseInt(m[2], 10) + variant)).padStart(width, "0");
    return m[1] + bumped + m[3];
  }
  return value;
}

function mutateDate(value, variant) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  d.setHours(d.getHours() + variant * 7 + Math.floor(Math.random() * 5) - 2);
  return d.toISOString();
}

function mutateRow(template, variant) {
  const row = {};
  for (const [k, v] of Object.entries(template)) {
    if (v === null) row[k] = null;
    else if (typeof v === "number") row[k] = variant === 0 ? v : mutateNumber(v);
    else if (typeof v === "boolean") row[k] = variant === 0 ? v : Math.random() < 0.12 ? !v : v;
    else if (typeof v === "string" && DATE_RE.test(v)) row[k] = mutateDate(v, variant);
    else if (typeof v === "string") row[k] = mutateString(v, variant);
    else row[k] = v;
  }
  return row;
}

/** Fallback: build a plausible row from column names alone. */
function inferRow(columns, variant) {
  const row = {};
  for (const col of columns) {
    const c = col.toLowerCase();
    if (/(date|time|dt\b|_dt)/.test(c)) row[col] = new Date(Date.now() - variant * 3600e3).toISOString();
    else if (/(qty|qte|quantite|count|id|no|pct|poids|qtt)/.test(c)) row[col] = variant + Math.floor(Math.random() * 1000);
    else if (/(actif|is_|etat|flag|bool)/.test(c)) row[col] = Math.random() < 0.7;
    else row[col] = `Value ${col} ${variant}`;
  }
  return row;
}

/** Builds a stable synthetic pool for a tabular endpoint. */
function buildPool(columns, sampleRows, poolSize) {
  const keepSize = sampleRows.length <= SMALL_TABLE_THRESHOLD;
  const size = keepSize ? sampleRows.length : Math.max(sampleRows.length, poolSize);
  const pool = [];
  for (let i = 0; i < size; i++) {
    if (sampleRows.length === 0) {
      pool.push(inferRow(columns, i));
    } else {
      const variant = Math.floor(i / sampleRows.length);
      pool.push(mutateRow(sampleRows[i % sampleRows.length], variant));
    }
  }
  return pool;
}

function paginate(pool, limit, offset) {
  const l = Math.min(Math.max(parseInt(limit) || 100, 1), 2000);
  const o = Math.max(parseInt(offset) || 0, 0);
  return pool.slice(o, o + l);
}

// ── Route table loading ───────────────────────────────────────

function loadRoutes() {
  loadError = null;
  try {
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    if (!Array.isArray(raw)) throw new Error("data.json must be a JSON array of entries");

    routes = raw.map((entry) => {
      const method = String(entry.method || "GET").toUpperCase();
      const path = pathnameOf(entry.endpoint);
      const pattern = patternize(path);
      return {
        method,
        path,
        pattern,
        status: typeof entry.status === "number" ? entry.status : 200,
        response: entry.response,
      };
    });

    poolCache.clear();
    lastLoaded = new Date().toISOString();
    console.log(`  Loaded ${routes.length} route(s) from ${DATA_FILE}`);
    return true;
  } catch (err) {
    loadError = err.message;
    console.error(`  Failed to load ${DATA_FILE}: ${err.message}`);
    return false;
  }
}

// Hot reload: keep the previous routes on parse failure.
function reload() {
  const snapshot = routes;
  if (loadRoutes()) return;
  routes = snapshot;
}

// ── Request handling ──────────────────────────────────────────

function findEntry(method, path) {
  const exact = routes.find((r) => r.method === method && r.path === path && !r.pattern);
  if (exact) return exact;

  const patternMatch = routes.find((r) => r.method === method && r.pattern);
  if (patternMatch) {
    // match by replacing the trailing segment with the :id param
    const matcher = new RegExp(`^${patternMatch.pattern.replace(":id", "\\d+")}$`);
    if (matcher.test(path)) return patternMatch;
  }

  // Client convenience: novacity-client calls GET on the job-run route,
  // data.json captured it as POST.
  if (method === "GET") {
    const post = routes.find((r) => r.method === "POST" && r.pattern);
    if (post) {
      const matcher = new RegExp(`^${post.pattern.replace(":id", "\\d+")}$`);
      if (matcher.test(path)) return post;
    }
  }
  return null;
}

function respondTabular(entry, req, res) {
  const response = entry.response || {};
  const columns = Array.isArray(response.columns) ? response.columns : [];
  const sampleRows = Array.isArray(response.data) ? response.data : [];

  const limit = parseInt(req.query.limit) || 100;
  const offset = parseInt(req.query.offset) || 0;

  let pool = poolCache.get(entry.path);
  if (!pool || Date.now() - pool.at > POOL_TTL) {
    pool = { at: Date.now(), rows: buildPool(columns, sampleRows, POOL_SIZE) };
    poolCache.set(entry.path, pool);
  }
  const page = paginate(pool.rows, limit, offset);

  const body = deepClone(response);
  delete body.data;
  body.count = page.length;
  body.data = page;

  res.status(entry.status).json(body);
}

function respondVerbatim(entry, req, res) {
  const body = entry.response === undefined ? { success: true } : deepClone(entry.response);
  res.status(entry.status).json(body);
}

// ── Routes ────────────────────────────────────────────────────

app.use((req, res, next) => {
  if (req.path === "/" || req.path === "/health") return next();
  const entry = findEntry(req.method, req.path);
  if (!entry) return res.status(404).json({ success: false, error: "Not found in data.json" });
  req.mockEntry = entry;
  next();
});

app.get("/", (req, res) => {
  const entry = routes.find((r) => r.method === "GET" && r.path === "/");
  if (entry) return respondVerbatim(entry, req, res);
  res.json({
    name: "BACOVET Mock API",
    version: "1.0.0",
    status: "running",
    docs: "/health",
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    mode: "MOCK",
    data_file: DATA_FILE,
    routes: routes.length,
    last_loaded: lastLoaded,
    load_error: loadError || null,
    pool_ttl_ms: POOL_TTL,
    pool_size: POOL_SIZE,
    timestamp: new Date().toISOString(),
  });
});

// Generic catch-all: serve any route that exists in data.json.
app.all("*", (req, res) => {
  if (!req.mockEntry) return res.status(404).json({ success: false, error: "Not found" });
  const { response } = req.mockEntry;

  const tabular =
    req.path.startsWith("/api/data") && Array.isArray(response && response.data);

  if (tabular) return respondTabular(req.mockEntry, req, res);
  return respondVerbatim(req.mockEntry, req, res);
});

// ── Watch data.json for changes ───────────────────────────────
let reloadTimer = null;
if (fs.existsSync(DATA_FILE)) {
  fs.watchFile(DATA_FILE, { interval: 1000 }, () => {
    clearTimeout(reloadTimer);
    reloadTimer = setTimeout(() => {
      console.log("\n  data.json changed — reloading routes…");
      reload();
    }, 300);
  });
}

// ── Start ─────────────────────────────────────────────────────
loadRoutes();

app.listen(PORT, () => {
  console.log("");
  console.log("  ╔══════════════════════════════════════════╗");
  console.log("  ║   BACOVET MOCK API  —  🟡 data.json       ║");
  console.log(`  ║   http://localhost:${PORT}                  ║`);
  console.log("  ╚══════════════════════════════════════════╝");
  console.log("");
  console.log(`  Data file : ${DATA_FILE}`);
  console.log(`  Routes    : ${routes.length}`);
  console.log(`  Pool size : ${POOL_SIZE}  (TTL ${POOL_TTL / 1000}s)`);
  console.log("");
  console.log("  Hot-reloads automatically when data.json changes.");
  console.log("");
});
