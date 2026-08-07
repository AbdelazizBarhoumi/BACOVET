import { it, expect, describe } from "vitest";
import { deriveMeasureSpec, buildMeasureDax } from "./resources/js/lib/pbi/measureWizard.ts";
describe("dbg", () => {
  it("x", () => {
    const specIn = { from: "taging_reel", to: "codestyle", hops: [{ from: "taging_reel", to: "codestyle", fromCol: "MONo", toCol: "SONo", kind: "fk_pk", overlap: 0.36, confidence: 0.45 }], kind: "list", column: "StyleCode", agg: "count" };
    const generated = buildMeasureDax(specIn);
    console.log("GEN:", JSON.stringify(generated));
    console.log("RES:", JSON.stringify(deriveMeasureSpec(generated)));
  });
});
