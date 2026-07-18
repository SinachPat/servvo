/**
 * Servvo — Guardrail Policy Engine
 * ---------------------------------
 * This module decides whether an AI agent's proposed WRITE action against a brand's
 * live restaurant systems (Toast/Square/Clover/7shifts) is ALLOWED, DENIED, or
 * NEEDS_CONFIRMATION. It runs SERVER-SIDE on every write, before any vendor call.
 * The agent is never trusted; this is the last line of defense in front of real
 * money and payroll.
 *
 * POSTURE IMPLEMENTED HERE: **Balanced** (Servvo's default).
 * There are several valid risk postures; this file implements the balanced one and
 * documents the trade-off at each branch so you can dial it toward either extreme:
 *   - Maximally safe: read-only always; every write needs confirmation. Great trust,
 *     more friction, agents feel "blocked."
 *   - Balanced (THIS FILE): low-sensitivity writes (86 an item) flow freely; medium
 *     writes (price changes) pass under a dollar threshold and otherwise need
 *     confirmation; high writes (refunds/voids) never auto-execute and are off unless
 *     a brand explicitly enables them.
 *   - Permissive: trust the brand's config and let most writes through, relying on the
 *     audit log after the fact.
 * To shift posture, change BALANCED_DEFAULT_CONFIG and/or the branch behavior below —
 * every branch calls out what "safer" vs. "looser" would do.
 */

// ---- Action sensitivity tiers ---------------------------------------------------

export type WriteTool =
  | "set_item_availability" // 86 / un-86 an item        (LOW sensitivity)
  | "update_item_price"     // change a menu price        (MEDIUM sensitivity)
  | "create_shift"          // scheduling                 (MEDIUM sensitivity)
  | "update_shift"          // scheduling                 (MEDIUM sensitivity)
  | "void_check"            // reverse a check            (HIGH sensitivity)
  | "refund_payment";       // refund money               (HIGH sensitivity)

export type Sensitivity = "LOW" | "MEDIUM" | "HIGH";

export const SENSITIVITY: Record<WriteTool, Sensitivity> = {
  set_item_availability: "LOW",
  update_item_price: "MEDIUM",
  create_shift: "MEDIUM",
  update_shift: "MEDIUM",
  void_check: "HIGH",
  refund_payment: "HIGH",
};

// ---- The per-brand guardrail configuration (set in the dashboard) ---------------

export interface BrandGuardrailConfig {
  /** Tools the operator has explicitly enabled for agents. Anything not listed is denied. */
  enabledTools: WriteTool[];
  /** Location ids where writes are permitted at all. Empty = all live locations. */
  allowedLocationIds: string[];
  /** Max dollar delta (in cents) an agent may change a price by without confirmation. */
  priceChangeThresholdCents: number;
  /** Max dollar amount (in cents) an agent may refund/void without confirmation. */
  financialActionThresholdCents: number;
  /** If true, MEDIUM+ actions return NEEDS_CONFIRMATION instead of executing. */
  requireConfirmationForMediumAndHigh: boolean;
  /** Max write actions per minute across all agents for this brand (velocity cap). */
  maxWritesPerMinute: number;
}

// ---- The request the engine evaluates -------------------------------------------

export interface WriteActionRequest {
  brandId: string;
  agentSub: string;               // subject claim from the agent's OAuth token
  tool: WriteTool;
  args: Record<string, unknown>;  // e.g. { locationId, itemId, priceCents } or { checkId, amountCents }
  config: BrandGuardrailConfig;
  /** Writes by this brand in the last 60s, for the velocity cap. */
  recentWriteCount: number;
}

export type Decision =
  | { outcome: "ALLOWED" }
  | { outcome: "DENIED"; reason: string }
  | { outcome: "NEEDS_CONFIRMATION"; reason: string };

/**
 * A sensible starting guardrail config embodying the balanced posture. The dashboard
 * lets each brand override these. Financial reversals are deliberately absent from
 * `enabledTools` — a brand must add them on purpose.
 */
export const BALANCED_DEFAULT_CONFIG: BrandGuardrailConfig = {
  enabledTools: ["set_item_availability", "update_item_price", "create_shift", "update_shift"],
  allowedLocationIds: [],              // empty === all live locations
  priceChangeThresholdCents: 500,      // auto-approve price moves up to $5.00
  financialActionThresholdCents: 5000, // never auto-refund/void above $50.00
  requireConfirmationForMediumAndHigh: false,
  maxWritesPerMinute: 30,
};

// ---- helpers --------------------------------------------------------------------

/** args is validated upstream by each tool's zod schema, so a present field is well-typed. */
function num(args: Record<string, unknown>, key: string): number | undefined {
  const v = args[key];
  return typeof v === "number" ? v : undefined;
}
function str(args: Record<string, unknown>, key: string): string | undefined {
  const v = args[key];
  return typeof v === "string" ? v : undefined;
}
/** cents → "$12.34" for human-readable deny/confirm reasons. */
function usd(cents: number): string {
  return `$${(Math.abs(cents) / 100).toFixed(2)}`;
}

// ---------------------------------------------------------------------------------
// evaluateWriteAction — the balanced policy.
// Evaluated most-restrictive-gate-first; returns the strictest applicable Decision.
// Every ALLOWED here can move real money, so ambiguity resolves toward
// DENIED / NEEDS_CONFIRMATION.
// ---------------------------------------------------------------------------------
export function evaluateWriteAction(req: WriteActionRequest): Decision {
  const { tool, args, config, recentWriteCount } = req;

  // 1. Enablement. Anything the operator hasn't explicitly turned on is denied.
  //    Because void_check/refund_payment ship OFF, they fail here on a fresh brand —
  //    an agent literally cannot move money until someone opts in.
  //    Trade-off: safest possible default; the cost is operators must enable each tool.
  //    Looser posture would default more tools on; we don't.
  if (!config.enabledTools.includes(tool)) {
    return { outcome: "DENIED", reason: `Tool "${tool}" is not enabled for this brand.` };
  }

  // 2. Location scope. If the brand restricts writes to specific stores, enforce it.
  //    Empty list === all live locations allowed.
  //    Trade-off: an allow-list caps the blast radius of a misbehaving agent to stores
  //    the operator chose; leaving it empty is friendlier but wider. Balanced ships empty
  //    (friendly) and lets cautious brands narrow it.
  const locationId = str(args, "locationId");
  if (
    config.allowedLocationIds.length > 0 &&
    (!locationId || !config.allowedLocationIds.includes(locationId))
  ) {
    return { outcome: "DENIED", reason: `Writes are not permitted at location "${locationId ?? "unknown"}".` };
  }

  // 3. Velocity cap. Contain a runaway agent regardless of sensitivity.
  //    Trade-off: a hard ceiling can also block a legitimate bulk op (e.g. 86'ing an item
  //    across 40 stores in a loop). Set maxWritesPerMinute with real bulk flows in mind;
  //    raise it for large estates, lower it for tighter control.
  if (recentWriteCount >= config.maxWritesPerMinute) {
    return { outcome: "DENIED", reason: `Write rate limit reached (${config.maxWritesPerMinute}/min). Try again shortly.` };
  }

  const sensitivity = SENSITIVITY[tool];

  // 4. LOW (e.g. 86 an item): reversible, non-financial → let it flow.
  //    Trade-off: frictionless for the common case; the audit log is the safety net
  //    rather than a prompt. Max-safe posture would route even this through confirmation.
  if (sensitivity === "LOW") {
    return { outcome: "ALLOWED" };
  }

  // 5. MEDIUM (price / shift changes).
  if (sensitivity === "MEDIUM") {
    // A brand can force a human check on all medium/high writes.
    if (config.requireConfirmationForMediumAndHigh) {
      return { outcome: "NEEDS_CONFIRMATION", reason: "Brand policy requires confirmation for this change." };
    }
    // Price changes are gated by magnitude; scheduling changes carry no dollar amount and
    // are easily reversible, so they pass. `deltaCents` (change vs. current price) is
    // preferred; fall back to the absolute new `priceCents` if a delta wasn't supplied.
    // Trade-off: the threshold is the line between "routine tweak" (auto) and "needs a
    // human" (confirm). Lower it to catch more changes; raise it for less friction.
    if (tool === "update_item_price") {
      const magnitude = num(args, "deltaCents") ?? num(args, "priceCents") ?? 0;
      if (Math.abs(magnitude) > config.priceChangeThresholdCents) {
        return {
          outcome: "NEEDS_CONFIRMATION",
          reason: `Price change of ${usd(magnitude)} exceeds the ${usd(config.priceChangeThresholdCents)} auto-approve limit.`,
        };
      }
    }
    return { outcome: "ALLOWED" };
  }

  // 6. HIGH (void_check / refund_payment): the deliberately conservative edge of "balanced".
  //    Moving money is the one place we accept friction to avoid an irreversible mistake:
  //    even when enabled and under the cap, a reversal ALWAYS needs a human; above the cap
  //    it is denied outright.
  //    Trade-off: this will frustrate agents that legitimately need to refund — that's the
  //    intended cost. A looser posture could auto-approve small refunds; we never do.
  const amount = num(args, "amountCents") ?? 0;
  if (amount > config.financialActionThresholdCents) {
    return {
      outcome: "DENIED",
      reason: `${usd(amount)} exceeds the ${usd(config.financialActionThresholdCents)} limit for automated financial actions.`,
    };
  }
  return { outcome: "NEEDS_CONFIRMATION", reason: `Financial action (${usd(amount)}) requires human confirmation.` };
}
