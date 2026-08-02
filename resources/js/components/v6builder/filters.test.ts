import { describe, expect, it } from "vitest";
import type { Row } from "@/lib/v6/model";
import {
  relativeDateRange,
  slicerDistinctValues,
  topNAggregates,
  topNValues,
  validateDateRange,
} from "./filters";

function rows(...data: (string | number | null)[]): Row[] {
  return data.map((v) => ({ cat: v, num: typeof v === "number" ? v : null }));
}

describe("relativeDateRange", () => {
  const now = new Date(2026, 7, 2); // 2026-08-02

  it("all returns an empty range", () => {
    expect(relativeDateRange("all", now)).toEqual({});
  });

  it("today is inclusive from/to", () => {
    expect(relativeDateRange("today", now)).toEqual({ from: "2026-08-02", to: "2026-08-02" });
  });

  it("7 days covers the last 7 days", () => {
    expect(relativeDateRange("7d", now)).toEqual({ from: "2026-07-27", to: "2026-08-02" });
  });

  it("30 days covers the last 30 days", () => {
    expect(relativeDateRange("30d", now)).toEqual({ from: "2026-07-04", to: "2026-08-02" });
  });

  it("month starts at the first of the month", () => {
    expect(relativeDateRange("month", now)).toEqual({ from: "2026-08-01", to: "2026-08-02" });
  });

  it("quarter starts at the first of the quarter", () => {
    expect(relativeDateRange("quarter", now)).toEqual({ from: "2026-07-01", to: "2026-08-02" });
  });

  it("year starts at January 1st", () => {
    expect(relativeDateRange("year", now)).toEqual({ from: "2026-01-01", to: "2026-08-02" });
  });
});

describe("validateDateRange", () => {
  it("accepts from <= to", () => {
    expect(validateDateRange("2026-01-01", "2026-01-02")).toBe(true);
    expect(validateDateRange("2026-01-02", "2026-01-02")).toBe(true);
  });

  it("rejects from > to", () => {
    expect(validateDateRange("2026-01-02", "2026-01-01")).toBe(false);
  });

  it("accepts open-ended ranges", () => {
    expect(validateDateRange(undefined, "2026-01-01")).toBe(true);
    expect(validateDateRange("2026-01-01", undefined)).toBe(true);
    expect(validateDateRange()).toBe(true);
  });
});

describe("topNAggregates / topNValues", () => {
  const data: Row[] = [
    { cat: "A", num: 10 }, { cat: "A", num: 5 },
    { cat: "B", num: 4 }, { cat: "B", num: 4 },
    { cat: "C", num: 1 },
    { cat: "D", num: 100 },
  ];

  it("ranks categories by summed numeric value", () => {
    expect(topNAggregates(data, "cat", "num", 3).map((e) => e.name)).toEqual(["D", "A", "B"]);
  });

  it("caps the result at n", () => {
    expect(topNAggregates(data, "cat", "num", 2).map((e) => e.name)).toEqual(["D", "A"]);
    expect(topNValues(data, "cat", "num", 2)).toEqual(new Set(["D", "A"]));
  });

  it("falls back to row counts for non-numeric values", () => {
    const counts = topNAggregates(data, "cat", undefined, 3);
    expect(counts.map((e) => e.name)).toEqual(["A", "B", "C"]);
    expect(counts[0]!.value).toBe(2);
  });

  it("falls back to counts when the value column is not numeric", () => {
    const textRows = data.map((r) => ({ ...r, num: r.num == null ? null : "n/a" }));
    expect(topNAggregates(textRows, "cat", "num", 2)[0]!.name).toBe("A");
  });

  it("handles empty rows", () => {
    expect(topNAggregates([], "cat", "num", 3)).toEqual([]);
    expect(topNValues([], "cat", "num", 3).size).toBe(0);
  });

  it("handles n <= 0", () => {
    expect(topNAggregates(data, "cat", "num", 0)).toEqual([]);
  });
});

describe("slicerDistinctValues", () => {
  it("returns distinct values in first-seen order", () => {
    expect(slicerDistinctValues(rows("A", "B", "A", "C", "D"), "cat", "").values).toEqual(["A", "B", "C", "D"]);
  });

  it("narrows by query", () => {
    const out = slicerDistinctValues(rows("Alpha", "Beta", "Apple", "Orange"), "cat", "l");
    expect(out.values).toEqual(["Alpha", "Apple"]);
    expect(out.total).toBe(2);
    expect(out.truncated).toBe(false);
  });

  it("maps null/missing to (vide)", () => {
    expect(slicerDistinctValues(rows("A", null, "B"), "cat", "").values).toEqual(["A", "(vide)", "B"]);
  });

  it("caps large lists and reports truncation", () => {
    const many: Row[] = Array.from({ length: 250 }, (_, i) => ({ cat: `v${i}` }));
    const out = slicerDistinctValues(many, "cat", "", 100);
    expect(out.values.length).toBe(100);
    expect(out.total).toBe(250);
    expect(out.truncated).toBe(true);
  });

  it("handles empty rows", () => {
    expect(slicerDistinctValues([], "cat", "")).toEqual({ values: [], total: 0, truncated: false });
  });
});
