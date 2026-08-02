import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import type { EndpointDataset } from "@/lib/v6/datasets";
import type { Widget } from "../types";
import type { DatasetState } from "../widgets/use-dataset";
import {
  buildCsv,
  buildFilterRows,  buildRawSheet,
  buildWidgetSheet,
  buildWorkbook,
  fileNameBase,
  sheetName,
  type ExportFilters,
} from "./export";

const NO_FILTERS: ExportFilters = { slicerSelections: {}, slicerDateRanges: {}, slicerTopN: {} };

function dataset(slug: string, columns: string[], rows: Record<string, unknown>[]): EndpointDataset {
  return {
    slug,
    name: slug,
    label: null,
    object: null,
    object_type: null,
    source: null,
    method: "GET",
    columns: columns.map((name) => ({ name, type: name === "montant" ? "number" : "string" })),
    sample_data: rows,
    row_count: rows.length,
    last_synced_at: null,
  };
}

function widget(partial: Partial<Widget>): Widget {
  return { id: "w1", type: "bar", x: 0, y: 0, w: 4, h: 4, config: {}, ...partial } as Widget;
}

function state(overrides?: Partial<DatasetState>): DatasetState {
  const base: DatasetState = {
    allMeasures: [],
    filteredRowsBySlug: {
      ventes: [
        { categorie: "A", montant: 10 },
        { categorie: "B", montant: 20 },
      ],
    },
    rowsBySlug: {
      ventes: [
        { categorie: "A", montant: 10 },
        { categorie: "B", montant: 20 },
      ],
    },
    datasets: [dataset("ventes", ["categorie", "montant"], [
      { categorie: "A", montant: 10 },
      { categorie: "B", montant: 20 },
    ])],
    crossFilter: null,
    theme: null,
  };
  return { ...base, ...overrides };
}

describe("sheetName", () => {
  it("strips Excel-illegal characters and collapses whitespace", () => {
    expect(sheetName("Ventes: [2024] / France")).toBe("Ventes 2024 France");
  });

  it("truncates to 31 chars and falls back for empty input", () => {
    expect(sheetName("a".repeat(50)).length).toBeLessThanOrEqual(31);
    expect(sheetName("   ")).toBe("Feuille");
  });
});

describe("fileNameBase", () => {
  it("keeps accented letters and replaces separators", () => {
    expect(fileNameBase("Ventes France 2024")).toBe("Ventes_France_2024");
    expect(fileNameBase("  ")).toBe("rapport");
  });
});

describe("buildWidgetSheet", () => {
  it("builds a multi-row sheet matching the rendered aggregation", () => {
    const sheet = buildWidgetSheet(state(), widget({ config: { datasetSlug: "ventes", dataAxis: "categorie", dataValue: "montant" } }));
    expect(sheet).not.toBeNull();
    expect(sheet!.columns).toEqual(["categorie", "Sum of montant"]);
    expect(sheet!.rows).toEqual([
      [{ v: "B" }, { v: 20, z: "#,##0" }],
      [{ v: "A" }, { v: 10, z: "#,##0" }],
    ]);
  });

  it("keeps numbers numeric when no display format is configured", () => {
    const sheet = buildWidgetSheet(state(), widget({ config: { datasetSlug: "ventes", dataAxis: "categorie", dataValue: "montant" } }));
    expect(typeof sheet!.rows[0][1].v).toBe("number");
    expect(sheet!.rows[0][1].z).toBe("#,##0");
  });

  it("pre-formats prefix/unit/compact values as strings", () => {
    const sheet = buildWidgetSheet(
      state(),
      widget({ config: { datasetSlug: "ventes", dataAxis: "categorie", dataValue: "montant", prefix: "€ ", decimals: 2 } }),
    );
    expect(sheet!.rows[1][1]).toEqual({ v: "€ 10,00" });
  });

  it("expands a legend split into one column per series", () => {
    const s = state({
      filteredRowsBySlug: {
        ventes: [
          { categorie: "A", region: "N", montant: 10 },
          { categorie: "A", region: "S", montant: 5 },
          { categorie: "B", region: "N", montant: 20 },
        ],
      },
      rowsBySlug: {
        ventes: [
          { categorie: "A", region: "N", montant: 10 },
          { categorie: "A", region: "S", montant: 5 },
          { categorie: "B", region: "N", montant: 20 },
        ],
      },
      datasets: [dataset("ventes", ["categorie", "region", "montant"], [])],
    });
    const sheet = buildWidgetSheet(
      s,
      widget({ config: { datasetSlug: "ventes", dataAxis: "categorie", dataValue: "montant", dataLegend: "region" } }),
    );
    expect(sheet!.columns).toEqual(["categorie", "N", "S"]);
    expect(sheet!.rows).toEqual([
      [{ v: "B" }, { v: 20, z: "#,##0" }, { v: 0, z: "#,##0" }],
      [{ v: "A" }, { v: 10, z: "#,##0" }, { v: 5, z: "#,##0" }],
    ]);
  });

  it("returns null when the widget has no data", () => {
    const s = state({ filteredRowsBySlug: { ventes: [] }, rowsBySlug: { ventes: [] } });
    expect(buildWidgetSheet(s, widget({ config: { datasetSlug: "ventes", dataAxis: "categorie", dataValue: "montant" } }))).toBeNull();
  });

  it("exports a table-grid as its cell content", () => {
    const sheet = buildWidgetSheet(state(), widget({
      config: {
        tableGrid: {
          rows: 2,
          cols: 2,
          cells: [
            { r: 0, c: 0, content: "H1", isHeader: true },
            { r: 0, c: 1, content: "H2", isHeader: true },
            { r: 1, c: 0, content: "123" },
            { r: 1, c: 1, content: "abc" },
          ],
        },
      },
    }));
    expect(sheet!.columns).toEqual(["Colonne 1", "Colonne 2"]);
    expect(sheet!.rows[1][0]).toEqual({ v: 123, z: "#,##0" });
    expect(sheet!.rows[1][1]).toEqual({ v: "abc" });
  });
});

describe("buildRawSheet", () => {
  it("flattens referenced datasets with a Dataset column", () => {
    const raw = buildRawSheet(state(), [widget({ config: { datasetSlug: "ventes" } })]);
    expect(raw!.columns).toEqual(["Dataset", "categorie", "montant"]);
    expect(raw!.rows).toEqual([
      [{ v: "ventes" }, { v: "A" }, { v: 10 }],
      [{ v: "ventes" }, { v: "B" }, { v: 20 }],
    ]);
  });

  it("returns null when nothing references a dataset", () => {
    expect(buildRawSheet(state(), [])).toBeNull();
  });
});

describe("buildWorkbook", () => {
  it("assembles Filtres + widget + Données brutes sheets", () => {
    const { workbook, stats } = buildWorkbook(
      state(),
      [widget({ config: { datasetSlug: "ventes", dataAxis: "categorie", dataValue: "montant" } })],
      NO_FILTERS,
      { title: "Test" },
    );
    expect(workbook.SheetNames).toEqual(["Filtres", "Barres", "Données brutes"]);
    expect(stats).toEqual({ widgetCount: 1, dataWidgetCount: 1, rowCount: 2, rawRowCount: 2 });

    const filtres = XLSX.utils.sheet_to_json<(string | number)[]>(workbook.Sheets["Filtres"], { header: 1 });
    expect(filtres[0]).toEqual(["Rapport", "Test"]);
    expect(filtres[3]).toEqual(["Filtres actifs", 0]);

    const data = XLSX.utils.sheet_to_json<(string | number)[]>(workbook.Sheets["Barres"], { header: 1 });
    expect(data[0]).toEqual(["categorie", "Sum of montant"]);
    expect(data[1]).toEqual(["B", 20]);
  });

  it("produces an (aucune donnée) sheet for an empty dashboard", () => {
    const { workbook, stats } = buildWorkbook(state(), [], NO_FILTERS, { title: "Vide" });
    expect(workbook.SheetNames).toContain("(aucune donnée)");
    expect(stats.dataWidgetCount).toBe(0);
  });

  it("lists active filters in the Filtres sheet", () => {
    const { workbook } = buildWorkbook(
      state(),
      [widget({ id: "s1", type: "slicer", config: { datasetSlug: "ventes", dataAxis: "categorie", label: "Catégorie" } })],
      { slicerSelections: { s1: ["A", "B"] }, slicerDateRanges: {}, slicerTopN: {} },
      { title: "Test" },
    );
    const filtres = XLSX.utils.sheet_to_json<(string | number)[]>(workbook.Sheets["Filtres"], { header: 1 });
    expect(filtres).toContainEqual(["Catégorie", "ventes", "categorie", "A, B"]);
  });
});

describe("buildCsv", () => {
  it("serializes widget sections with ; delimiters", () => {
    const csv = buildCsv(
      state(),
      [widget({ config: { datasetSlug: "ventes", dataAxis: "categorie", dataValue: "montant" } })],
      NO_FILTERS,
      { title: "Test" },
    );
    expect(csv).toContain("Rapport;Test");
    expect(csv).toContain("categorie;Sum of montant");
    expect(csv).toContain("A;10");
    expect(csv).toContain("B;20");
  });

  it("falls back to (aucune donnée) for empty dashboards", () => {
    const csv = buildCsv(state(), [], NO_FILTERS, { title: "Vide" });
    expect(csv).toContain("(aucune donnée)");
  });
});

describe("buildFilterRows", () => {
  it("lists slicer selections", () => {
    const rows = buildFilterRows(
      [widget({ id: "s1", type: "slicer", config: { datasetSlug: "ventes", dataAxis: "categorie", label: "Catégorie" } })],
      { slicerSelections: { s1: ["A", "B"] }, slicerDateRanges: {}, slicerTopN: {} },
    );
    expect(rows).toEqual([["Catégorie", "ventes", "categorie", "A, B"]]);
  });

  it("lists date ranges", () => {
    const rows = buildFilterRows(
      [widget({ id: "d1", type: "dateSlicer", config: { datasetSlug: "ventes", dataAxis: "date", label: "Date" } })],
      { slicerSelections: {}, slicerDateRanges: { d1: { from: "2024-01-01", to: "2024-12-31" } }, slicerTopN: {} },
    );
    expect(rows).toEqual([["Date", "ventes", "date", "2024-01-01 → 2024-12-31"]]);
  });

  it("lists top-N filters only when enabled", () => {
    const rows = buildFilterRows(
      [widget({ id: "t1", type: "slicer", config: { datasetSlug: "ventes", dataAxis: "categorie", dataValue: "montant", slicerMode: "topN", label: "Top" } })],
      { slicerSelections: {}, slicerDateRanges: {}, slicerTopN: { t1: { axis: "categorie", value: "montant", n: 5, enabled: true } } },
    );
    expect(rows).toEqual([["Top (Top 5)", "ventes", "categorie", "5"]]);
  });
});
