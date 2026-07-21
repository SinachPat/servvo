import { describe, expect, it } from "vitest";
import { Money, SalesSummary, addMoney, averageMoney, formatMoney } from "./index.js";

describe("Money", () => {
  it("rejects floats — the guard that prevents silent rounding bugs", () => {
    expect(Money.safeParse({ amount: 12.5, currency: "USD" }).success).toBe(false);
    expect(Money.safeParse({ amount: 1250, currency: "USD" }).success).toBe(true);
  });

  it("requires an ISO 4217 code", () => {
    expect(Money.safeParse({ amount: 100, currency: "US" }).success).toBe(false);
  });

  it("refuses to add mismatched currencies", () => {
    expect(() => addMoney({ amount: 1, currency: "USD" }, { amount: 1, currency: "EUR" })).toThrow();
  });

  it("averages to integer cents and handles zero count", () => {
    expect(averageMoney({ amount: 1000, currency: "USD" }, 3)).toEqual({
      amount: 333,
      currency: "USD",
    });
    expect(averageMoney({ amount: 1000, currency: "USD" }, 0)).toEqual({
      amount: 0,
      currency: "USD",
    });
  });

  it("formats only at the edge", () => {
    expect(formatMoney({ amount: 123456, currency: "USD" })).toBe("$1,234.56");
  });
});

describe("SalesSummary", () => {
  const base = {
    locationId: "loc_1",
    periodStart: "2026-07-01",
    periodEnd: "2026-07-07",
    netSales: { amount: 1_000_00, currency: "USD" },
    grossSales: { amount: 1_100_00, currency: "USD" },
    checkCount: 42,
    coverCount: null,
    averageCheck: { amount: 23_81, currency: "USD" },
    provenance: { source: "SQUARE" as const, method: "sum(order.net_amounts) over closed orders" },
  };

  it("accepts a null coverCount (a null is not a zero)", () => {
    expect(SalesSummary.safeParse(base).success).toBe(true);
  });

  it("requires provenance so mixed-estate figures stay explainable", () => {
    const { provenance, ...withoutProvenance } = base;
    expect(SalesSummary.safeParse(withoutProvenance).success).toBe(false);
  });

  it("rejects an empty method string", () => {
    expect(
      SalesSummary.safeParse({ ...base, provenance: { source: "TOAST", method: "" } }).success,
    ).toBe(false);
  });
});
