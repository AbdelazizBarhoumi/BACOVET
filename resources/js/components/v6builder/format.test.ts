import { describe, expect, it } from "vitest";
import { formatNumber } from "./format";

describe("formatNumber parity with legacy toFixed().replace('.', ',')", () => {
  it("formats French comma decimals", () => {
    expect(formatNumber(12.5, { decimals: 1 })).toBe("12,5");
    expect(formatNumber(0, { decimals: 2 })).toBe("0,00");
  });

  it("defaults to 0 decimals like toFixed(undefined)", () => {
    expect(formatNumber(12.5)).toBe("13");
  });

  it("handles negatives", () => {
    expect(formatNumber(-12.5, { decimals: 1 })).toBe("-12,5");
  });

  it("returns empty string for null/undefined/NaN", () => {
    expect(formatNumber(null)).toBe("");
    expect(formatNumber(undefined)).toBe("");
    expect(formatNumber(Number.NaN)).toBe("");
  });
});

describe("formatNumber prefix/unit", () => {
  it("appends unit after the value", () => {
    expect(formatNumber(12.5, { decimals: 1, unit: "%" })).toBe("12,5%");
  });

  it("prepends prefix before the value", () => {
    expect(formatNumber(12.5, { decimals: 1, prefix: "Δ" })).toBe("Δ12,5");
  });

  it("combines prefix and unit", () => {
    expect(formatNumber(12.5, { decimals: 1, prefix: "+", unit: " €" })).toBe("+12,5 €");
  });
});

describe("formatNumber compact", () => {
  it("leaves small magnitudes untouched", () => {
    expect(formatNumber(999, { compact: true })).toBe("999");
  });

  it("shortens thousands", () => {
    expect(formatNumber(1500, { decimals: 1, compact: true })).toBe("1,5 k");
    expect(formatNumber(1000, { compact: true })).toBe("1 k");
  });

  it("shortens millions and billions", () => {
    expect(formatNumber(1234567, { decimals: 1, compact: true })).toBe("1,2 M");
    expect(formatNumber(2e9, { decimals: 1, compact: true })).toBe("2 B");
  });

  it("keeps the unit after the compact suffix", () => {
    expect(formatNumber(1_234_567, { decimals: 1, compact: true, unit: " €" })).toBe("1,2 M €");
  });

  it("handles negative compact values", () => {
    expect(formatNumber(-2_500_000, { decimals: 1, compact: true })).toBe("-2,5 M");
  });
});
