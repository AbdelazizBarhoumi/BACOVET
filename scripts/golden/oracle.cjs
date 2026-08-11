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

    // ---- sales_ledger (Wave 2 time windows) --------------------------------
    // The real snapshot carries no usable flat date column, so derive a
    // deterministic date ledger from the itemtrx rows: one row per itemtrx
    // row, dates starting 2025-01-05 and advancing 4 days each, amount =
    // Quantity. The anchor is therefore the max loaded date (early 2026), and
    // every time-window scenario below is computed with plain UTC Date math —
    // independent of the measure engine.
    const parseISO = (s) => {
        const [y, m, d] = String(s).split('-').map(Number);
        return Date.UTC(y, m - 1, d);
    };
    const toISO = (ms) => new Date(ms).toISOString().slice(0, 10);
    {
        const startMs = Date.UTC(2025, 0, 5);
        const stepMs = 4 * 86400000;
        const ledger = rows.map((r, i) => {
            const ms = startMs + i * stepMs;
            return { Date: toISO(ms), Amount: Number(r.Quantity) || 0 };
        });
        data.push({
            name: 'sales_ledger',
            fields: [
                { table: 'sales_ledger', name: 'Date', type: 'date' },
                { table: 'sales_ledger', name: 'Amount', type: 'number' },
            ],
            rows: ledger,
        });

        const anchorMs = Math.max(...ledger.map((r) => parseISO(r.Date)));
        const a = new Date(anchorMs);
        const yearStart = Date.UTC(a.getUTCFullYear(), 0, 1);
        const monthStart = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), 1);
        const prevMonthStart = Date.UTC(a.getUTCFullYear(), a.getUTCMonth() - 1, 1);
        const prevMonthEnd = monthStart - 1;
        const prevYearStart = Date.UTC(a.getUTCFullYear() - 1, 0, 1);
        const slyEnd = prevYearStart + (anchorMs - yearStart);
        const inWindow = (d, lo, hi) => {
            const v = parseISO(d);
            return v >= lo && v <= hi;
        };
        const ytd = ledger.filter((r) => inWindow(r.Date, yearStart, anchorMs));
        const mtd = ledger.filter((r) => inWindow(r.Date, monthStart, anchorMs));
        const prev = ledger.filter((r) => inWindow(r.Date, prevMonthStart, prevMonthEnd));
        const sly = ledger.filter((r) => inWindow(r.Date, prevYearStart, slyEnd));

        scenarios.ledger_rows = ledger.length;
        scenarios.ledger_anchor = toISO(anchorMs);
        scenarios.ledger_ytd_rows = ytd.length;
        scenarios.ledger_ytd_sum = ytd.reduce((s, r) => s + r.Amount, 0);
        scenarios.ledger_mtd_rows = mtd.length;
        scenarios.ledger_mtd_sum = mtd.reduce((s, r) => s + r.Amount, 0);
        scenarios.ledger_prev_month_rows = prev.length;
        scenarios.ledger_sly_rows = sly.length;
        scenarios.ledger_sly_sum = sly.reduce((s, r) => s + r.Amount, 0);
    }

    // ---- kpi_br_print (Wave 2 month-granularity time windows) ---------------
    // Real snapshot table: one row per month (mois = YYYY-MM). The engine
    // treats YYYY-MM as the 1st of the month, so the anchor is the max month
    // and every window derives from it. Expected values in plain UTC JS.
    {
        const br = findEndpoint(/\/api\/data\/q\/kpi_br_print\b/);
        if (br) {
            const all = (br.response.data ?? []).filter(
                (r) => r && typeof r === 'object',
            );
            const rows = all.map((r) => ({
                mois: r.mois,
                nb_inspections: Number(r.nb_inspections) || 0,
                nb_rejets: Number(r.nb_rejets) || 0,
            }));
            data.push({
                name: 'kpi_br_print',
                fields: [
                    { table: 'kpi_br_print', name: 'mois', type: 'text' },
                    {
                        table: 'kpi_br_print',
                        name: 'nb_inspections',
                        type: 'number',
                    },
                    { table: 'kpi_br_print', name: 'nb_rejets', type: 'number' },
                ],
                rows,
            });

            const parseMonth = (s) => {
                const [y, m] = String(s).split('-').map(Number);
                return Date.UTC(y, m - 1, 1);
            };
            const anchorMs = Math.max(...rows.map((r) => parseMonth(r.mois)));
            const a = new Date(anchorMs);
            const yearStart = Date.UTC(a.getUTCFullYear(), 0, 1);
            const monthStart = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), 1);
            const prevMonthStart = Date.UTC(
                a.getUTCFullYear(),
                a.getUTCMonth() - 1,
                1,
            );
            const prevMonthEnd = monthStart - 1;
            const prevYearStart = Date.UTC(a.getUTCFullYear() - 1, 0, 1);
            const slyEnd = prevYearStart + (anchorMs - yearStart);
            const inWindow = (d, lo, hi) => {
                const v = parseMonth(d);
                return v >= lo && v <= hi;
            };
            const ytd = rows.filter((r) => inWindow(r.mois, yearStart, anchorMs));
            const mtd = rows.filter((r) => inWindow(r.mois, monthStart, anchorMs));
            const prev = rows.filter((r) =>
                inWindow(r.mois, prevMonthStart, prevMonthEnd),
            );
            const sly = rows.filter((r) => inWindow(r.mois, prevYearStart, slyEnd));

            scenarios.kpi_br_anchor = toISO(anchorMs);
            scenarios.kpi_br_rows = rows.length;
            scenarios.kpi_br_ytd_rows = ytd.length;
            scenarios.kpi_br_ytd_rejets = ytd.reduce((s, r) => s + r.nb_rejets, 0);
            scenarios.kpi_br_ytd_inspections = ytd.reduce(
                (s, r) => s + r.nb_inspections,
                0,
            );
            scenarios.kpi_br_mtd_rejets = mtd.reduce((s, r) => s + r.nb_rejets, 0);
            scenarios.kpi_br_prev_month_rows = prev.length;
            scenarios.kpi_br_sly_rows = sly.length;
        }
    }
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

// ---- kpi_rft — RFT "premier coup" snapshot, per chaîne, jour en cours ----
// Real endpoint: "RFT (Right First Time) par chaîne — jour" (period: jour,
// date: today). Rows carry `chaine`, `ok_premier_coup`, `pieces_controlees`
// (and a stored `rft_pct`). The oracle recomputes the exact first-pass KPI
// `ok_premier_coup / pieces_controlees * 100` with plain JS, per chain and
// total, so the measure engine is never compared against the rounded stored
// percentage.
{
    const rft = findEndpoint(/\/api\/data\/q\/kpi_rft\b/);
    if (rft) {
        const all = (rft.response.data ?? []).filter(
            (r) => r && typeof r === 'object',
        );
        const rows = all.map((r) => ({
            chaine: String(r.chaine ?? ''),
            ok_premier_coup: Number(r.ok_premier_coup) || 0,
            pieces_controlees: Number(r.pieces_controlees) || 0,
        }));
        data.push({
            name: 'kpi_rft',
            fields: [
                { table: 'kpi_rft', name: 'chaine', type: 'text' },
                { table: 'kpi_rft', name: 'ok_premier_coup', type: 'number' },
                { table: 'kpi_rft', name: 'pieces_controlees', type: 'number' },
            ],
            rows,
        });

        scenarios.kpi_rft_rows = rows.length;
        scenarios.kpi_rft_ok_first_coup = rows.reduce(
            (s, r) => s + r.ok_premier_coup,
            0,
        );
        scenarios.kpi_rft_pieces_controlees = rows.reduce(
            (s, r) => s + r.pieces_controlees,
            0,
        );
        const denom = scenarios.kpi_rft_pieces_controlees;
        scenarios.kpi_rft_ratio =
            denom === 0 ? 0 : (scenarios.kpi_rft_ok_first_coup / denom) * 100;

        // Per-chain shares: the "par chaîne de production" granularity. Keep
        // every chain (the golden test asserts the DEP-J low performer at 68).
        const byChain = Object.fromEntries(
            rows
                .map((r) => [
                    r.chaine,
                    {
                        ok: r.ok_premier_coup,
                        controlled: r.pieces_controlees,
                        pct:
                            r.pieces_controlees === 0
                                ? 0
                                : (r.ok_premier_coup / r.pieces_controlees) *
                                  100,
                    },
                ])
                .sort((a, b) => (a[0] < b[0] ? -1 : 1)),
        );
        scenarios.kpi_rft_by_chain = byChain;
    }
}

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
console.log(
    `  RFT jour = ${scenarios.kpi_rft_ok_first_coup}/${scenarios.kpi_rft_pieces_controlees} * 100 = ${Number(scenarios.kpi_rft_ratio).toFixed(2)} (${scenarios.kpi_rft_rows} chains)`,
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