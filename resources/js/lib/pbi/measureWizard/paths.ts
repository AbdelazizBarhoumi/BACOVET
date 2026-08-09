import { evaluateMeasure, type TableDef } from '../model';
import { buildMeasureDax } from './dax';
import { joinCandidates, makeFieldSetsCache } from './joins';
import {
    FUZZY_OVERLAP_THRESHOLD,
    type JoinCandidate,
    type PathHop,
    type ProposedPath,
} from './types';

/**
 * Directed-adjacency graph over the lenient candidate links + manual joins.
 * Shared by `proposePath` (single best) and `proposePaths` (alternatives).
 * A hop is "reliable" when its value match was confirmed (or persisted).
 * Costs prefer real, value-verified links; manual joins are free.
 */
type PathGraph = {
    adjacency: Map<string, PathHop[]>;
    hopCost: (h: PathHop) => number;
    isReliable: (h: PathHop) => boolean;
    vertices: string[];
};

function buildGraph(tables: TableDef[], manual: JoinCandidate[]): PathGraph {
    const adjacency = new Map<string, PathHop[]>();
    const addDir = (hop: PathHop) => {
        const list = adjacency.get(hop.from) ?? [];
        list.push(hop);
        adjacency.set(hop.from, list);
    };
    const link = (c: JoinCandidate) => {
        addDir({
            from: c.a,
            to: c.b,
            fromCol: c.aCol,
            toCol: c.bCol,
            kind: c.kind,
            overlap: c.overlap,
            confidence: c.confidence,
            verified: c.verified,
        });
        addDir({
            from: c.b,
            to: c.a,
            fromCol: c.bCol,
            toCol: c.aCol,
            kind: c.kind,
            overlap: c.overlap,
            confidence: c.confidence,
            verified: c.verified,
        });
    };

    const getSets = makeFieldSetsCache();
    for (let i = 0; i < tables.length; i++) {
        for (let j = i + 1; j < tables.length; j++) {
            for (const c of joinCandidates(tables[i]!, tables[j]!, getSets)) {
                link(c);
            }
        }
    }
    for (const c of manual) link(c);

    const hopCost = (h: PathHop): number => {
        if (h.kind === 'manual') return 0;
        if (h.kind === 'shared') {
            return h.confidence >= FUZZY_OVERLAP_THRESHOLD
                ? 0.1 + (1 - Math.min(1, h.confidence)) * 0.6
                : 2;
        }
        return 1 - Math.min(1, h.confidence);
    };

    const isReliable = (h: PathHop): boolean =>
        h.kind === 'manual' || h.verified !== false;

    const vertices = tables.map((t) => t.name);
    return { adjacency, hopCost, isReliable, vertices };
}

/**
 * Dijkstra hop search from `from` to `to` over the lenient candidate links
 * (plus any persisted `manual` joins). Edges are weighted so the *most
 * plausible* chain wins (ties repeatedly over hops), falling back to the
 * shortest when the quality is equal. Manual/persisted joins are free.
 */
export function proposePath(
    tables: TableDef[],
    from: string,
    to: string,
    manual: JoinCandidate[] = [],
): ProposedPath {
    const blocked = (reason: string, detail: string): ProposedPath => ({
        from,
        to,
        hops: [],
        blocked: { reason, detail },
    });

    if (from === to) return { from, to, hops: [], blocked: null };

    const start = tables.find((t) => t.name === from);
    const target = tables.find((t) => t.name === to);
    if (!start)
        return blocked('Table inconnue', `« ${from} » n'est pas chargée.`);
    if (!target)
        return blocked('Table inconnue', `« ${to} » n'est pas chargée.`);

    const { adjacency, hopCost, isReliable } = buildGraph(tables, manual);

    const shortest = (reliableOnly: boolean): PathHop[] | null => {
        const dist = new Map<string, number>();
        const prev = new Map<string, PathHop>();
        const done = new Set<string>();
        for (const t of tables) dist.set(t.name, Infinity);
        dist.set(from, 0);

        let cur: string | null = from;
        while (cur !== null) {
            if (cur === to) break;
            done.add(cur);
            const base = dist.get(cur) ?? Infinity;
            for (const hop of adjacency.get(cur) ?? []) {
                if (done.has(hop.to)) continue;
                if (reliableOnly && !isReliable(hop)) continue;
                const nd = base + hopCost(hop);
                if (nd < (dist.get(hop.to) ?? Infinity)) {
                    dist.set(hop.to, nd);
                    prev.set(hop.to, hop);
                }
            }
            let next: string | null = null;
            let best = Infinity;
            for (const t of tables) {
                if (done.has(t.name)) continue;
                const d = dist.get(t.name) ?? Infinity;
                if (d < best) {
                    best = d;
                    next = t.name;
                }
            }
            cur = next;
        }

        if ((dist.get(to) ?? Infinity) === Infinity) return null;
        const hops: PathHop[] = [];
        let trail: string | undefined = to;
        while (trail && trail !== from) {
            const p = prev.get(trail);
            if (!p) return null;
            hops.unshift(p);
            trail = p.from;
        }
        if (!hops.length || hops[0]!.from !== from) return null;
        return hops;
    };

    const reliable = shortest(true);
    if (reliable) return { from, to, hops: reliable, blocked: null };

    const fallback = shortest(false);
    if (fallback) return { from, to, hops: fallback, blocked: null };

    return blocked(
        'Chemin introuvable',
        `Aucune colonne ne relie « ${from} » à « ${to} », même sur les valeurs partagées.`,
    );
}

/**
 * How `proposePaths` orders the alternatives.
 *   - 'shortest': fewest hops first (even if a hop needs "à vérifier" approval).
 *   - 'reliable': most value-verified hops first, then cost, then fewest hops.
 */
export type ProposalRankBy = 'shortest' | 'reliable';

/**
 * Enumerate up to `max` *distinct* simple paths `from → to` over the same graph
 * used by `proposePath`, ranked by the chosen quality rule. Lets the user flip
 * between several plausible chains when testing which produces the best
 * measure. Returns a single `blocked` entry when no route exists at all.
 */
export function proposePaths(
    tables: TableDef[],
    from: string,
    to: string,
    manual: JoinCandidate[] = [],
    max = 5,
    rankBy: ProposalRankBy = 'shortest',
): ProposedPath[] {
    const blocked = (reason: string, detail: string): ProposedPath => ({
        from,
        to,
        hops: [],
        blocked: { reason, detail },
    });

    if (from === to) return [{ from, to, hops: [], blocked: null }];

    const start = tables.find((t) => t.name === from);
    const target = tables.find((t) => t.name === to);
    if (!start)
        return [blocked('Table inconnue', `« ${from} » n'est pas chargée.`)];
    if (!target)
        return [blocked('Table inconnue', `« ${to} » n'est pas chargée.`)];

    const { adjacency, hopCost, isReliable, vertices } = buildGraph(
        tables,
        manual,
    );
    const inGraph = new Set(vertices);

    // Best-first search over simple paths (no repeated vertex). A naive DFS
    // (pop from a LIFO stack) lets a deep name-coincidence hub (e.g. KPI
    // tables sharing a `chaine` column) burn the whole expansion budget
    // before the genuinely verified short branch is ever visited, so a real
    // 2-hop route can be silently dropped. Expanding by (fewest hops, lowest
    // cost) first guarantees short, value-verified paths are enumerated
    // ahead of long hub-mazes. Bounded enumeration via a hard expansion cap.
    type Frontier = { node: string; hops: PathHop[]; seen: Set<string> };
    // Numeric priority: fewest hops dominates; lower cost breaks ties. Smaller
    // key = expanded first (the cheapest shortest route wins the ordering).
    const key = (f: Frontier): number =>
        f.hops.length * 1000 +
        Math.round(f.hops.reduce((s, h) => s + hopCost(h), 0) * 1000);
    const heap: Frontier[] = [{ node: from, hops: [], seen: new Set([from]) }];
    const less = (a: Frontier, b: Frontier): boolean => key(a) < key(b);
    const siftUp = (i: number) => {
        while (i > 0) {
            const p = (i - 1) >> 1;
            if (!less(heap[i]!, heap[p]!)) break;
            [heap[i], heap[p]] = [heap[p]!, heap[i]!];
            i = p;
        }
    };
    const siftDown = (i: number) => {
        for (;;) {
            const l = 2 * i + 1;
            const r = 2 * i + 2;
            let m = i;
            if (l < heap.length && less(heap[l]!, heap[m]!)) m = l;
            if (r < heap.length && less(heap[r]!, heap[m]!)) m = r;
            if (m === i) break;
            [heap[i], heap[m]] = [heap[m]!, heap[i]!];
            i = m;
        }
    };
    const pushHeap = (f: Frontier) => {
        heap.push(f);
        siftUp(heap.length - 1);
    };
    const popHeap = (): Frontier | undefined => {
        if (!heap.length) return undefined;
        const top = heap[0]!;
        const last = heap.pop()!;
        if (heap.length) {
            heap[0] = last;
            siftDown(0);
        }
        return top;
    };

    const paths: PathHop[][] = [];
    const seenPaths = new Set<string>();
    let expansions = 0;
    const EXPANSION_LIMIT = 6000;
    const MAX_HOPS = 8;

    while (heap.length > 0 && expansions < EXPANSION_LIMIT) {
        const cur = popHeap()!;
        expansions++;
        if (cur.node === to && cur.hops.length > 0) {
            const sig = cur.hops
                .map((h) => `${h.from}→${h.to}:${h.fromCol}~${h.toCol}`)
                .join('|');
            if (!seenPaths.has(sig)) {
                seenPaths.add(sig);
                paths.push(cur.hops);
            }
            // A path ending here is already minimal in (hops, cost); we can
            // stop exploring deeper routes through this node.
            continue;
        }
        if (cur.hops.length >= MAX_HOPS) continue; // skip absurd hub-mazes
        const next = adjacency.get(cur.node) ?? [];
        for (const hop of next) {
            if (!inGraph.has(hop.to)) continue;
            if (cur.seen.has(hop.to)) continue;
            const seen = new Set(cur.seen);
            seen.add(hop.to);
            pushHeap({
                node: hop.to,
                hops: [...cur.hops, hop],
                seen,
            });
        }
    }

    if (paths.length === 0)
        return [
            blocked(
                'Chemin introuvable',
                `Aucune colonne ne relie « ${from} » à « ${to} », même sur les valeurs partagées.`,
            ),
        ];

    const score = (hops: PathHop[]): [number, number, number] => {
        const reliable = hops.filter((h) => isReliable(h)).length;
        const cost = hops.reduce((s, h) => s + hopCost(h), 0);
        return rankBy === 'shortest'
            ? [hops.length, -reliable, cost]
            : [-reliable, cost, hops.length];
    };
    const signature = (hops: PathHop[]): string =>
        hops.map((h) => `${h.from}→${h.to}:${h.fromCol}~${h.toCol}`).join('|');

    const ranked = paths.slice().sort((a, b) => {
        const sa = score(a);
        const sb = score(b);
        for (let i = 0; i < 3; i++) {
            const d = sa[i]! - sb[i]!;
            if (d !== 0) return d;
        }
        return signature(a).localeCompare(signature(b));
    });

    const seen = new Set<string>();
    const unique: PathHop[][] = [];
    for (const p of ranked) {
        const sig = signature(p);
        if (seen.has(sig)) continue;
        seen.add(sig);
        unique.push(p);
        if (unique.length >= max) break;
    }

    return unique.map((hops) => ({
        from,
        to,
        hops,
        blocked: null,
    }));
}

/**
 * True when a hop is backed by confirmed values (or a persisted manual join).
 * Used by the UI to gate a measure behind validated relationships.
 */
export function isReliableHop(h: PathHop | undefined): boolean {
    if (!h) return false;
    return h.kind === 'manual' || h.verified !== false;
}

/** True only when every hop of the path is reliable. */
export function isReliablePath(hops: PathHop[]): boolean {
    return hops.every(isReliableHop);
}

/**
 * Live row-count for the chain `from → … → to` produced by the hops, evaluated
 * against the currently-loaded tables (module-level `TABLES`). Returns
 * `{ ok: true, count }` when the expression compiles and runs; `{ ok: false }`
 * when the chain cannot be evaluated (missing columns, etc.).
 *
 * Used by the wizard's per-hop diagnostics: a prefix that yields 0 live rows is
 * the first failing hop — the join "exists" as a column pairing but matches
 * nothing, so the produced measure will read 0/vide.
 */
export function chainRowCount(
    from: string,
    to: string,
    hops: PathHop[],
): { ok: boolean; count: number } {
    const dax = buildMeasureDax({
        from,
        to,
        hops,
        kind: 'countrows',
        column: '',
        agg: 'count',
    });
    const r = evaluateMeasure(`Diagnostic = ${dax}`, []);
    if (r.error) return { ok: false, count: 0 };
    return { ok: true, count: r.value };
}

/**
 * Index of the first hop whose chain produces no live rows (0 / vide), or -1
 * when every hop (up to the full path) matches data. A hop that cannot even be
 * evaluated is treated as failing so the UI points at the broken link.
 */
export function firstFailingHop(
    from: string,
    to: string,
    hops: PathHop[],
): number {
    for (let i = 1; i <= hops.length; i++) {
        const { ok, count } = chainRowCount(
            from,
            hops[i - 1]!.to,
            hops.slice(0, i),
        );
        if (!ok || count <= 0) return i - 1;
    }
    return -1;
}

