import { describe, expect, it } from "vitest";
import type { Row } from "@/lib/v6/model";
import type { WidgetConfig } from "../types";
import {
  aggregateDataset,
  aggregateDatasetMulti,
  aggregateLegendSeries,
  aggregateScatter,
  AUTRES_LABEL,
  type ValueField,
} from "./aggregate";

const ROWS: Row[] = [
  { region: "East", month: "Jan", amount: 10, product: "A", units: 2 },
  { region: "East", month: "Feb", amount: 20, product: "B", units: 3 },
  { region: "West", month: "Jan", amount: 30, product: "A", units: 1 },
  { region: "West", month: "Feb", amount: 5, product: "C", units: 5 },
  { region: "North", month: "Jan", amount: 15, product: "B", units: 4 },
];

const COLORS = ["#1", "#2", "#3"];

function fields(names: string[], over: Partial<ValueField> = {}): ValueField[] {
  return names.map((name) => ({ name, key: name, label: name, isMeasure: false, source: "ds", ...over }));
}

function base(over: Partial<WidgetConfig>): WidgetConfig {
  return { datasetSlug: "ds", dataAxis: "month", dataValues: ["amount"], ...over };
}

const noFns: Record<string, ((rows: Row[]) => number) | null> = {};

describe("aggregateDatasetMulti", () => {
  it("groups by axis and sums the value per group, ordered by total desc", () => {
    const rows = aggregateDatasetMulti(ROWS, base({}), noFns, fields(["amount"]));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ name: "Jan", value: 55 });
    expect(rows[1]).toMatchObject({ name: "Feb", value: 25 });
  });

  it("supports count / avg / distinct aggregations", () => {
    const avg = aggregateDatasetMulti(ROWS, base({ dataAggregation: "avg" }), noFns, fields(["amount"]));
    expect(avg[0]).toMatchObject({ name: "Jan", value: 55 / 3 });

    const count = aggregateDatasetMulti(ROWS, base({ dataAggregation: "count" }), noFns, fields(["amount"]));
    expect(count[0]).toMatchObject({ value: 3 });

    const distinct = aggregateDatasetMulti(ROWS, base({ dataAggregation: "distinct" }), noFns, fields(["amount"]));
    // Jan has amounts 10, 30, 15; Feb has 20, 5
    expect(distinct[0]).toMatchObject({ value: 3 });
    expect(distinct[1]).toMatchObject({ value: 2 });
  });

  it("caps categories at maxCategories and merges the rest into Autres", () => {
    const rows: Row[] = [];
    for (let i = 1; i <= 7; i++) {
      rows.push({ month: `m${i}`, amount: i });
    }
    const out = aggregateDatasetMulti(rows, base({ maxCategories: 3 }), noFns, fields(["amount"]));
    expect(out.map((r) => r.name)).toEqual(["m7", "m6", "m5", AUTRES_LABEL]);
    // Autres = sum of m1..m4 (the remainder)
    const autres = out.find((r) => r.name === AUTRES_LABEL)!;
    expect(autres.value).toBe(1 + 2 + 3 + 4);
  });

  it("applies no cap when categories fit within the limit (default 50)", () => {
    const out = aggregateDatasetMulti(ROWS, base({}), noFns, fields(["amount"]));
    expect(out).toHaveLength(2);
  });

  it("returns an empty array when no value fields are bound", () => {
    expect(aggregateDatasetMulti(ROWS, base({}), noFns, [])).toEqual([]);
  });

  it("never throws on an unknown column and yields 0", () => {
    const out = aggregateDatasetMulti(ROWS, base({}), noFns, fields(["missing"]));
    expect(out[0].value).toBe(0);
  });

  it("aggregates tooltip fields: numbers sum, text takes the first non-empty value", () => {
    const out = aggregateDatasetMulti(ROWS, base({ dataTooltips: ["region", "amount"] }), noFns, fields(["amount"]));
    expect(out[0].tips).toMatchObject({ region: "East", amount: 55 });
    expect(out[1].tips).toMatchObject({ region: "East", amount: 25 });
  });

  it("honours measure functions over plain column aggregation", () => {
    const fns = { amount: (rows: Row[]) => rows.reduce((sum, r) => sum + Number(r.amount), 0) * 2 };
    const out = aggregateDatasetMulti(ROWS, base({}), fns, fields(["amount"], { isMeasure: true }));
    expect(out[0].value).toBe(110);
  });
});

describe("aggregateDataset (legacy single-value)", () => {
  it("returns ordered { name, value, x, y } rows", () => {
    const rows = aggregateDataset(ROWS, base({}), null);
    expect(rows[0]).toMatchObject({ name: "Jan", value: 55, y: 55 });
    expect(rows[1]).toMatchObject({ name: "Feb", value: 25 });
  });

  it("returns an empty array when dataValue is missing", () => {
    expect(aggregateDataset(ROWS, base({ dataValues: undefined, dataValue: undefined }), null)).toEqual([]);
  });
});

describe("aggregateLegendSeries", () => {
  it("splits each value into one series per legend value, aligned to the axis order", () => {
    const series = aggregateLegendSeries(ROWS, base({ dataLegend: "region" }), noFns, fields(["amount"]), "region", COLORS);
    expect(series).toHaveLength(3);
    expect(series.map((s) => s.label)).toEqual(["West", "East", "North"]);
    const west = series.find((s) => s.label === "West")!;
    expect(west.data).toEqual([
      { x: "Jan", v: 30 },
      { x: "Feb", v: 5 },
    ]);
    const east = series.find((s) => s.label === "East")!;
    expect(east.data).toEqual([
      { x: "Jan", v: 10 },
      { x: "Feb", v: 20 },
    ]);
    const north = series.find((s) => s.label === "North")!;
    expect(north.data).toEqual([
      { x: "Jan", v: 15 },
      { x: "Feb", v: 0 },
    ]);
  });

  it("colors series cyclically by legend index", () => {
    const series = aggregateLegendSeries(ROWS, base({ dataLegend: "region" }), noFns, fields(["amount"]), "region", COLORS);
    expect(series[0].color).toBe(COLORS[0]);
    expect(series[1].color).toBe(COLORS[1]);
    expect(series[2].color).toBe(COLORS[2]);
  });

  it("combines legend value and value label when several values are bound", () => {
    const series = aggregateLegendSeries(ROWS, base({ dataLegend: "region", dataValues: ["amount", "units"] }), noFns, fields(["amount", "units"]), "region", COLORS);
    expect(series).toHaveLength(6);
    expect(series[0].label).toBe("West · amount");
    expect(series[1].label).toBe("West · units");
  });

  it("caps legend values at 20 and buckets the rest into Autres", () => {
    const rows: Row[] = [];
    for (let i = 0; i < 21; i++) {
      rows.push({ month: "Jan", region: `R${i}`, amount: 1 });
    }
    const series = aggregateLegendSeries(rows, base({ dataLegend: "region" }), noFns, fields(["amount"]), "region", COLORS);
    expect(series).toHaveLength(21);
    expect(series[series.length - 1].label).toBe(AUTRES_LABEL);
    const autres = series[series.length - 1];
    expect(autres.data[0].v).toBe(1);
    const janTotal = series.reduce((sum, s) => sum + s.data[0].v, 0);
    expect(janTotal).toBe(21);
  });

  it("respects the axis category cap before splitting", () => {
    const rows: Row[] = [];
    for (let i = 1; i <= 4; i++) {
      rows.push({ month: `m${i}`, region: "East", amount: i });
      rows.push({ month: `m${i}`, region: "West", amount: i * 10 });
    }
    const series = aggregateLegendSeries(rows, base({ dataLegend: "region", maxCategories: 2 }), noFns, fields(["amount"]), "region", COLORS);
    // categories: m4(44), m3(33) on top; m1/m2 merge into Autres
    for (const s of series) {
      expect(s.data.map((d) => d.x)).toEqual(["m4", "m3", AUTRES_LABEL]);
    }
  });

  it("returns an empty array without a legend field or value fields", () => {
    expect(aggregateLegendSeries(ROWS, base({}), noFns, fields(["amount"]), "", COLORS)).toEqual([]);
    expect(aggregateLegendSeries(ROWS, base({ dataLegend: "region" }), noFns, [], "region", COLORS)).toEqual([]);
  });
});

describe("aggregateScatter", () => {
  it("groups by axis and aggregates explicit X/Y fields", () => {
    const vf = fields(["units", "amount"]);
    const points = aggregateScatter(
      ROWS,
      base({ dataAxis: "month", scatterX: "units", scatterY: "amount" }),
      noFns,
      vf,
      COLORS,
    );
    expect(points).toHaveLength(2);
    expect(points[0]).toMatchObject({ name: "Jan", x: 7, y: 55, size: 60 });
    expect(points[1]).toMatchObject({ name: "Feb", x: 8, y: 25, size: 60 });
  });

  it("uses a single Total bucket when no axis is bound", () => {
    const vf = fields(["units", "amount"]);
    const points = aggregateScatter(ROWS, base({ dataAxis: undefined, scatterX: "units", scatterY: "amount" }), noFns, vf, COLORS);
    expect(points).toHaveLength(1);
    expect(points[0]).toMatchObject({ name: "Total", x: 15, y: 80 });
  });

  it("uses scatterSize for bubble radius", () => {
    const vf = fields(["units", "amount"]);
    const points = aggregateScatter(
      ROWS,
      base({ dataAxis: "month", scatterX: "units", scatterY: "amount", scatterSize: "amount" }),
      noFns,
      vf,
      COLORS,
    );
    expect(points[0].size).toBe(55);
    expect(points[1].size).toBe(25);
  });

  it("colors points by legend value when a legend is bound", () => {
    const vf = fields(["units", "amount"]);
    const points = aggregateScatter(
      ROWS,
      base({ dataAxis: "month", scatterX: "units", scatterY: "amount", dataLegend: "region" }),
      noFns,
      vf,
      COLORS,
      "region",
    );
    // groups: (Jan,East),(Feb,East),(Jan,West),(Feb,West),(Jan,North) → 5 points
    expect(points).toHaveLength(5);
    const eastFeb = points.find((p) => p.name === "Feb · East")!;
    expect(eastFeb).toMatchObject({ x: 3, y: 20 });
    expect(points.filter((p) => p.color === COLORS[0])).toHaveLength(2); // West
    expect(points.filter((p) => p.color === COLORS[1])).toHaveLength(2); // East
    expect(points.filter((p) => p.color === COLORS[2])).toHaveLength(1); // North
  });

  it("returns an empty array when X or Y is not bound", () => {
    const vf = fields(["units", "amount"]);
    expect(aggregateScatter(ROWS, base({ scatterX: "units" }), noFns, vf, COLORS)).toEqual([]);
    expect(aggregateScatter(ROWS, base({ scatterY: "amount" }), noFns, vf, COLORS)).toEqual([]);
  });

  it("returns an empty array for empty input rows", () => {
    const vf = fields(["units", "amount"]);
    expect(aggregateScatter([], base({ scatterX: "units", scatterY: "amount" }), noFns, vf, COLORS)).toEqual([]);
  });
});
