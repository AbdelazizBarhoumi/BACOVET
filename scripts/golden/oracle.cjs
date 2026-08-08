#!/usr/bin/env node
/**
 * Golden oracle — the INDEPENDENT reference implementation for the measure
 * engine's acceptance suite.
 *
 * It reads the real Novacity snapshot (storage/app/private/data.json), builds a
 * small deterministic table set the way the frontend `buildTables` would, and
 * computes expected values with plain JS — deliberately NOT using the measure
 * engine, the wizard, or any of our DAX evaluation code.
 *
 * Output: tests/golden/golden.json (committed, deterministic). Re-generate
 * after a live sync with:
 *
 *     npm run goldens:refresh
 */
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..', '..');
const DATA_FILE = process.env.DATA_JSON
    ? path.resolve(process.env.DATA_JSON)
    : path.join(ROOT, 'storage', 'app', 'private', 'data.json');
const OUT_DIR = path.join(ROOT, 'tests', 'golden');
const OUT = path.join(OUT_DIR, 'golden.json');

const raw = fs.readFileSync(DATA_FILE, 'utf8');
const entries = JSON.parse(raw);
const findEndpoint = (re) => entries.find((e) => re.test(e.endpoint ?? ''));

function inferTypeOf(rows, col) {
    const seen = rows
        .slice(0, 50)
        .map((r) => r[col] ?? null)
        .filter((v) => v !== null && v !== undefined);
    if (!seen.length) return 'text';
    if (seen.every((v) => typeof v === 'number')) return 'number';
    if (seen.every((v) => typeof v === 'boolean')) return 'boolean';
    if (seen.every((v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)))
        return 'date';
    return 'text';
}

const data = [];
const scenarios = {};

// ---- itemtrx (SDT) -----------------------------------------------------
const item = findEndpoint(/\/api\/data\/itemtrxenq\b/);
if (!item) throw new Error('data.json does not contain the itemtrxenq endpoint.');
{
    const all = (item.response.data ?? []).filter((r) => r && typeof r === 'object');
    const cols = [
        'EmpGroup',
        'EmployeeName',
        'ProdGroup',
        'Quantity',
        'ShiftCode',
        'ItemNo',
        'TransactionID',
    ];
    const rows = all.map((r) => {
        const o = {};
        for (const c of cols) o[c] = r[c];
        return o;
    });
    const fields = cols.map((c) => ({
        table: 'itemtrx',
        name: c,
        type: inferTypeOf(rows, c),
    }));
    data.push({ name: 'itemtrx', fields, rows });

    scenarios.itemtrx_row_count = rows.length;
    scenarios.itemtrx_sum_quantity = rows.reduce((s, r) => s + (Number(r.Quantity) || 0), 0);
    scenarios.itemtrx_distinct_emp = new Set(
        rows.map((r) => String(r.EmployeeName).trim()).filter(Boolean),
    ).size;
    scenarios.itemtrx_distinct_prodgroup = new Set(
        rows.map((r) => String(r.ProdGroup).trim()).filter(Boolean),
    ).size;

    // Per-employee slice for the "each row has its own list" scenario.
    const byEmp = new Map();
    for (const r of rows) {
        const key = String(r.EmployeeName).trim();
        if (!key) continue;
        const acc = byEmp.get(key) ?? { count: 0, sumQty: 0, items: new Set() };
        acc.count += 1;
        acc.sumQty += Number(r.Quantity) || 0;
        acc.items.add(String(r.ItemNo).trim());
        byEmp.set(key, acc);
    }
    scenarios.itemtrx_by_emp = Object.fromEntries(
        [...byEmp.entries()]
            .sort((a, b) => b[1].count - a[1].count)
            .slice(0, 4)
            .map(([k, v]) => [k, { count: v.count, sumQty: v.sumQty, items: [...v.items].sort() }]),
    );
}

// ---- QCM inspection / rejet KPI tables — single-row snapshots -----------
const kpiQueries = [
    ['kpi_rejets_annee', /\/api\/data\/q\/rejets_suite_inspection_paquet_annee_en_cours\b/],
    ['kpi_inspections_annee', /\/api\/data\/q\/inspections_paquet_annee_en_cours\b/],
    ['kpi_rejets_jour', /\/api\/data\/q\/rejets_suite_inspection_paquet_jour_en_cours\b/],
    ['kpi_inspections_jour', /\/api\/data\/q\/inspections_paquet_jour_en_cours\b/],
];
for (const [table, re] of kpiQueries) {
    const q = findEndpoint(re);
    if (!q) continue;
    const rows = (q.response.data ?? []).filter((r) => r && typeof r === 'object');
    const cols = Object.keys(rows[0] ?? {});
    const fields = cols.map((c) => ({
        name: c,
        table,
        type: inferTypeOf(rows, c),
    }));
    data.push({ name: table, fields, rows });
    for (const c of cols) {
        scenarios[`${table}.${c}`] = rows[0] ? rows[0][c] : null;
    }
}

const rY = Number(scenarios['kpi_rejets_annee.BundleRejectYear']) || 0;
const iY = Number(scenarios['kpi_inspections_annee.BundleInspectedYear']) || 0;
scenarios.kpi_annee_ratio_numerator = rY;
scenarios.kpi_annee_ratio_denominator = iY;
// The user's target KPI: rejets / inspections * 100 (division-by-zero safe).
scenarios.kpi_annee_ratio_div = iY === 0 ? 0 : (rY / iY) * 100;

// ---- Pareto defect FG (KPI-D16) — precomputed share column to verify -----
const pareto = findEndpoint(/\/api\/data\/q\/kpi_pareto_defects_fg\b/);
if (pareto) {
    const rows = (pareto.response.data ?? []).filter((r) => r && typeof r === 'object');
    const fields = Object.keys(rows[0] ?? {}).map((c) => ({
        name: c,
        table: 'kpi_pareto_defects',
        type: inferTypeOf(rows, c),
    }));
    data.push({ name: 'kpi_pareto_defects', fields, rows });
    const total = rows.reduce((s, r) => s + (Number(r.nb_defauts) || 0), 0);
    scenarios.pareto_rows = rows.length;
    scenarios.pareto_total_defauts = total;
    scenarios.pareto_part_pct_max_delta = Math.max(
        ...rows.map((r) =>
            Math.abs((Number(r.nb_defauts) / total) * 100 - (Number(r.part_pct) || 0)) || 0,
        ),
        0,
    );
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(
    OUT,
    JSON.stringify(
        {
            generated_at: new Date().toISOString(),
            source_signature: hash(raw),
            tables: data,
            scenarios,
        },
        null,
        2,
    ) + '\n',
);
console.log(`golden.json written (${data.length} tables)`);
console.log(`  itemtrx: rows=${scenarios.itemtrx_row_count}, sumQty=${scenarios.itemtrx_sum_quantity}`);
console.log(
    `  YTD ratio = ${scenarios.kpi_annee_ratio_numerator}/${scenarios.kpi_annee_ratio_denominator} * 100 = ${scenarios.kpi_annee_ratio_div}`,
);
console.log(`  source_signature=${hash(raw).slice(0, 12)}…`);

function hash(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(16).padStart(8, '0');
}