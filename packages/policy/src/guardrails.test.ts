import { describe, expect, it } from "vitest";
import {
  evaluateWriteAction,
  computeActionFingerprint,
  BALANCED_DEFAULT_CONFIG,
  type BrandGuardrailConfig,
  type PolicyDependencies,
  type Role,
  type WriteActionRequest,
} from "./guardrails";

// ---- fixtures -------------------------------------------------------------------

const cfg = (o: Partial<BrandGuardrailConfig> = {}): BrandGuardrailConfig => ({ ...BALANCED_DEFAULT_CONFIG, ...o });
const withFinancial = (t: "void_check" | "refund_payment") =>
  cfg({ enabledTools: [...BALANCED_DEFAULT_CONFIG.enabledTools, t] });

/** Permissive-by-default trusted deps; each test overrides only what it exercises. */
const deps = (o: Partial<PolicyDependencies> = {}): PolicyDependencies => ({
  getCurrentItemPriceCents: async () => 5000,
  resolveFinancialAmountCents: async () => 3000,
  isLiveBrandLocation: async ({ locationId }) => locationId.startsWith("L"),
  reserveVelocitySlot: async () => true,
  getAgentRole: async () => "manager" as Role,
  consumeConfirmationToken: async () => true,
  getShiftStartMs: async () => null,
  now: () => 1_000_000_000_000,
  ...o,
});
const req = (o: Partial<WriteActionRequest>): WriteActionRequest => ({
  brandId: "b1",
  agentSub: "a1",
  tool: "set_item_availability",
  args: {},
  config: cfg(),
  ...o,
});

// ---- regressions for the 8 exploits found in review -----------------------------

describe("guardrails — closed exploits (regressions)", () => {
  it("does not auto-approve zeroing out a high-priced item ($50 → $0.01)", async () => {
    const d = await evaluateWriteAction(
      req({ tool: "update_item_price", args: { locationId: "L1", itemId: "steak", newPriceCents: 1 } }),
      deps(),
    );
    expect(d.outcome).toBe("NEEDS_CONFIRMATION");
    expect(d.code).toBe("OVER_PRICE_THRESHOLD");
  });

  it("fails closed when a price change has no amount", async () => {
    const d = await evaluateWriteAction(req({ tool: "update_item_price", args: { locationId: "L1", itemId: "x" } }), deps());
    expect(d).toMatchObject({ outcome: "DENIED", code: "INVALID_ARGUMENTS" });
  });

  it("judges the resolved amount, not the agent's args, for refunds", async () => {
    const d = await evaluateWriteAction(
      req({ tool: "refund_payment", args: { locationId: "L1", paymentId: "p1" }, config: withFinancial("refund_payment") }),
      deps({ resolveFinancialAmountCents: async () => 3000 }),
    );
    expect(d).toMatchObject({ outcome: "NEEDS_CONFIRMATION", code: "FINANCIAL_ACTION_CONFIRM" });
  });

  it("refuses financial actions whose amount can't be resolved", async () => {
    const d = await evaluateWriteAction(
      req({ tool: "refund_payment", args: { locationId: "L1", paymentId: "p1" }, config: withFinancial("refund_payment") }),
      deps({ resolveFinancialAmountCents: async () => null }),
    );
    expect(d).toMatchObject({ outcome: "DENIED", code: "FINANCIAL_AMOUNT_UNRESOLVED" });
  });

  it("enforces the cap on a large void using its true amount", async () => {
    const d = await evaluateWriteAction(
      req({ tool: "void_check", args: { locationId: "L1", checkId: "c1" }, config: withFinancial("void_check") }),
      deps({ resolveFinancialAmountCents: async () => 500000 }),
    );
    expect(d).toMatchObject({ outcome: "DENIED", code: "OVER_FINANCIAL_CAP" });
  });

  it("rejects malformed config instead of silently disabling gates", async () => {
    for (const bad of [{ priceChangePctThreshold: NaN }, { maxWritesPerMinute: NaN }, { maxWritesPerMinute: 0 }]) {
      const d = await evaluateWriteAction(
        req({ tool: "set_item_availability", args: { locationId: "L1", itemId: "x", available: false }, config: cfg(bad) }),
        deps(),
      );
      expect(d).toMatchObject({ outcome: "DENIED", code: "INVALID_CONFIG" });
    }
  });

  it("denies writes to a location that isn't a live location of the brand", async () => {
    const d = await evaluateWriteAction(
      req({ tool: "set_item_availability", args: { locationId: "foreign", itemId: "x", available: false } }),
      deps({ isLiveBrandLocation: async () => false }),
    );
    expect(d).toMatchObject({ outcome: "DENIED", code: "LOCATION_UNKNOWN" });
  });

  it("rejects a negative resolved financial amount", async () => {
    const d = await evaluateWriteAction(
      req({ tool: "refund_payment", args: { locationId: "L1", paymentId: "p1" }, config: withFinancial("refund_payment") }),
      deps({ resolveFinancialAmountCents: async () => -100000 }),
    );
    expect(d).toMatchObject({ outcome: "DENIED", code: "INVALID_ARGUMENTS" });
  });
});

// ---- new controls ---------------------------------------------------------------

describe("guardrails — role, location, scheduling, velocity", () => {
  it("enforces the minimum role per tool", async () => {
    const d = await evaluateWriteAction(
      req({ tool: "update_item_price", args: { locationId: "L1", itemId: "x", newPriceCents: 1050 } }),
      deps({ getAgentRole: async () => "staff" }),
    );
    expect(d).toMatchObject({ outcome: "DENIED", code: "INSUFFICIENT_ROLE" });
  });

  it("blocks shift edits inside the lockout window", async () => {
    const d = await evaluateWriteAction(
      req({ tool: "create_shift", args: { locationId: "L1" } }),
      deps({ getShiftStartMs: async () => 1_000_000_000_000 + 30 * 60000 }),
    );
    expect(d).toMatchObject({ outcome: "DENIED", code: "SCHEDULING_LOCKOUT" });
  });

  it("rate-limits via the atomic slot reservation", async () => {
    const d = await evaluateWriteAction(
      req({ tool: "set_item_availability", args: { locationId: "L1", itemId: "x", available: false } }),
      deps({ reserveVelocitySlot: async () => false }),
    );
    expect(d).toMatchObject({ outcome: "DENIED", code: "RATE_LIMITED" });
  });
});

// ---- confirmation protocol ------------------------------------------------------

describe("guardrails — confirmation protocol", () => {
  const confReq = req({ tool: "refund_payment", args: { locationId: "L1", paymentId: "p1" }, config: withFinancial("refund_payment") });

  it("returns NEEDS_CONFIRMATION with a fingerprint when no token is present", async () => {
    const d = await evaluateWriteAction(confReq, deps());
    expect(d.outcome).toBe("NEEDS_CONFIRMATION");
    if (d.outcome === "NEEDS_CONFIRMATION") expect(d.actionFingerprint).toHaveLength(64);
  });

  it("proceeds with a valid one-time token", async () => {
    const d = await evaluateWriteAction({ ...confReq, confirmationToken: "good" }, deps({ consumeConfirmationToken: async () => true }));
    expect(d.outcome).toBe("ALLOWED");
  });

  it("denies a supplied-but-invalid token (no self-approval)", async () => {
    const d = await evaluateWriteAction({ ...confReq, confirmationToken: "forged" }, deps({ consumeConfirmationToken: async () => false }));
    expect(d).toMatchObject({ outcome: "DENIED", code: "CONFIRMATION_INVALID" });
  });

  it("does not let a token bypass a hard over-cap denial", async () => {
    const d = await evaluateWriteAction(
      { ...confReq, confirmationToken: "good" },
      deps({ resolveFinancialAmountCents: async () => 999999, consumeConfirmationToken: async () => true }),
    );
    expect(d).toMatchObject({ outcome: "DENIED", code: "OVER_FINANCIAL_CAP" });
  });

  it("does not consume a velocity slot for an unapproved confirmation request", async () => {
    let reserved = false;
    const d = await evaluateWriteAction(
      confReq,
      deps({ reserveVelocitySlot: async () => ((reserved = true), true) }),
    );
    expect(d.outcome).toBe("NEEDS_CONFIRMATION");
    expect(reserved).toBe(false);
  });

  it("does not burn a confirmation token when rate-limited", async () => {
    let consumed = false;
    const d = await evaluateWriteAction(
      { ...confReq, confirmationToken: "good" },
      deps({
        reserveVelocitySlot: async () => false,
        consumeConfirmationToken: async () => ((consumed = true), true),
      }),
    );
    expect(d).toMatchObject({ outcome: "DENIED", code: "RATE_LIMITED" });
    expect(consumed).toBe(false);
  });
});

// ---- happy paths & fingerprint --------------------------------------------------

describe("guardrails — allowed paths", () => {
  it("allows a LOW action for a sufficiently-privileged agent", async () => {
    const d = await evaluateWriteAction(
      req({ tool: "set_item_availability", args: { locationId: "L1", itemId: "x", available: false } }),
      deps({ getAgentRole: async () => "staff" }),
    );
    expect(d.outcome).toBe("ALLOWED");
  });

  it("auto-approves a price change inside the percentage band", async () => {
    const d = await evaluateWriteAction(
      req({ tool: "update_item_price", args: { locationId: "L1", itemId: "x", newPriceCents: 1050 } }),
      deps({ getCurrentItemPriceCents: async () => 1000 }), // +5% ≤ 15%
    );
    expect(d.outcome).toBe("ALLOWED");
  });

  it("computes a key-order-stable fingerprint", () => {
    const a = computeActionFingerprint({ brandId: "b1", tool: "refund_payment", args: { paymentId: "p1", locationId: "L1" } });
    const b = computeActionFingerprint({ brandId: "b1", tool: "refund_payment", args: { locationId: "L1", paymentId: "p1" } });
    expect(a).toBe(b);
  });
});
