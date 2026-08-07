import { proposePaths, joinCandidates } from "./resources/js/lib/pbi/measureWizard.ts";
import type { TableDef } from "./resources/js/lib/pbi/model.ts";
const mkShared = (name: string, col: string, vals: string[]): TableDef => ({
    name,
    fields: [{ table: name, name: col, type: "text" }],
    rows: vals.map((v) => ({ [col]: v })),
});
const a = mkShared("A", "grp", ["P1", "P2", "P3", "P4"]);
const x = mkShared("X", "grp", ["P1", "P2", "P3", "P4", "P5"]);
const d = mkShared("D", "grp", ["P1", "P2", "P3", "P4", "P5", "P6"]);
console.log("cand A-D:", JSON.stringify(joinCandidates(a, d).map(c=>({a:c.a,aCol:c.aCol,b:c.b,bCol:c.bCol,conf:c.confidence}))));
const s = proposePaths([a, x, d], "A", "D", [], 5, "shortest");
console.log("SHORTEST:", JSON.stringify(s.map(p=>p.hops.map(h=>`${h.from}->${h.to}@${h.confidence}`))));
const r = proposePaths([a, x, d], "A", "D", [], 5, "reliable");
console.log("RELIABLE:", JSON.stringify(r.map(p=>p.hops.map(h=>`${h.from}->${h.to}@${h.confidence}`))));
