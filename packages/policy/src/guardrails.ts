/**
 * Servvo — Guardrail Policy Engine
 * ---------------------------------
 * Decides whether an AI agent's proposed WRITE against a brand's live restaurant systems
 * (Toast/Square/Clover/7shifts) is ALLOWED, DENIED, or NEEDS_CONFIRMATION. Runs SERVER-SIDE
 * on every write, before any vendor call. The agent is never trusted; this is the last line
 * of defense in front of real money and payroll.
 *
 * DESIGN PRINCIPLES (learned the hard way from the v1 review):
 *   1. FAIL CLOSED. Missing/malformed args, unverifiable amounts, bad config, or unknown
 *      roles resolve to DENIED / NEEDS_CONFIRMATION — never to a silent ALLOW. There are no
 *      `?? 0` fallbacks: an amount we can't verify is not an amount we approve.
 *   2. JUDGE THE REAL EFFECT, NOT THE AGENT'S ARGS. The engine resolves the *actual* current
 *      price and the *actual* void/refund amount via injected, trusted lookups — the agent
 *      cannot understate a $5,000 void as "$0". The caller MUST execute exactly the figures
 *      the policy judged.
 *   3. NON-BYPASSABLE CONFIRMATION. NEEDS_CONFIRMATION returns an actionFingerprint. Only the
 *      server-side human-approval path can mint a one-time, expiring token bound to that
 *      fingerprint; the agent cannot forge a boolean to self-approve. Hard denials (over cap,
 *      disabled tool, wrong role, bad location, rate limit) are NOT bypassable by a token.
 *   4. ATOMIC VELOCITY. The rate limit is an atomic reserve-a-slot on the caller's store
 *      (Redis), not a number the engine trusts — no check-then-act race.
 *
 * POSTURE: **Balanced** (see BALANCED_DEFAULT_CONFIG). Low-sensitivity writes (86 an item)
 * flow; price changes auto-approve only within a percentage/absolute band; financial reversals
 * never auto-execute and are off unless a brand enables them. Every branch notes what a safer
 * or looser posture would change.
 */

import { createHash } from "node:crypto";

// ---- Tools & sensitivity --------------------------------------------------------

export type WriteTool =
  | "set_item_availability" // 86 / un-86 an item     (LOW)
  | "update_item_price"     // change a menu price     (MEDIUM)
  | "create_shift"          // scheduling              (MEDIUM)
  | "update_shift"          // scheduling              (MEDIUM)
  | "void_check"            // reverse a check         (HIGH)
  | "refund_payment";       // refund money            (HIGH)

export type Sensitivity = "LOW" | "MEDIUM" | "HIGH";

export const SENSITIVITY: Record<WriteTool, Sensitivity> = {
  set_item_availability: "LOW",
  update_item_price: "MEDIUM",
  create_shift: "MEDIUM",
  update_shift: "MEDIUM",
  void_check: "HIGH",
  refund_payment: "HIGH",
};

// ---- Roles ----------------------------------------------------------------------

/** Ordered least→most privileged. An agent's role must rank >= the tool's minimum. */
export const ROLE_RANK = { read_only: 0, staff: 1, manager: 2, owner: 3 } as const;
export type Role = keyof typeof ROLE_RANK;

// ---- Config (per brand, edited in the dashboard) --------------------------------

export interface BrandGuardrailConfig {
  /** Tools the operator explicitly enabled. Anything not listed is denied. */
  enabledTools: WriteTool[];
  /** Live locations where writes are permitted. Empty = all of the brand's live locations. */
  allowedLocationIds: string[];
  /** Auto-approve a price change if it is within this fraction of the current price (0.15 = 15%). */
  priceChangePctThreshold: number;
  /** …or within this absolute amount (cents), whichever is more permissive (covers cheap items). */
  priceChangeAbsFloorCents: number;
  /** Hard cap (cents) per financial tool; above this the action is DENIED outright. */
  financialCapCentsByTool: Record<"void_check" | "refund_payment", number>;
  /** If true, all MEDIUM/HIGH writes require confirmation (LOW is unaffected). */
  requireConfirmationForMediumAndHigh: boolean;
  /** Atomic per-brand-per-tool write ceiling per minute. */
  maxWritesPerMinute: number;
  /** Minimum role required per tool. Missing entry defaults to "manager" (fail-safe). */
  minimumRoleByTool: Partial<Record<WriteTool, Role>>;
  /** Block shift create/edit within this many minutes of the shift's start. 0 disables. */
  shiftEditLockoutMinutes: number;
}

/**
 * Balanced defaults. Financial reversals are deliberately ABSENT from enabledTools — a brand
 * must add them on purpose. To go safer: raise minimum roles, lower thresholds/caps, set
 * requireConfirmationForMediumAndHigh, or narrow allowedLocationIds. To go looser: the reverse.
 */
export const BALANCED_DEFAULT_CONFIG: BrandGuardrailConfig = {
  enabledTools: ["set_item_availability", "update_item_price", "create_shift", "update_shift"],
  allowedLocationIds: [],
  priceChangePctThreshold: 0.15, // ±15% auto-approves…
  priceChangeAbsFloorCents: 50, // …or any change ≤ $0.50 (so $2 coffees aren't over-gated)
  financialCapCentsByTool: { void_check: 5000, refund_payment: 5000 }, // $50 hard ceiling
  requireConfirmationForMediumAndHigh: false,
  maxWritesPerMinute: 30,
  minimumRoleByTool: {
    set_item_availability: "staff",
    update_item_price: "manager",
    create_shift: "manager",
    update_shift: "manager",
    void_check: "manager",
    refund_payment: "manager",
  },
  shiftEditLockoutMinutes: 120, // no shift edits within 2h of start
};

// ---- Request / decision ---------------------------------------------------------

export interface WriteActionRequest {
  brandId: string;
  agentSub: string; // subject claim from the agent's OAuth token
  tool: WriteTool;
  args: Record<string, unknown>;
  config: BrandGuardrailConfig;
  /** One-time token minted by the human-approval path to satisfy a prior NEEDS_CONFIRMATION. */
  confirmationToken?: string;
}

export type DecisionCode =
  | "ALLOWED"
  | "INVALID_CONFIG"
  | "UNKNOWN_TOOL"
  | "TOOL_DISABLED"
  | "INVALID_ARGUMENTS"
  | "INSUFFICIENT_ROLE"
  | "LOCATION_UNKNOWN"
  | "LOCATION_NOT_ALLOWED"
  | "PRICE_UNVERIFIABLE"
  | "OVER_PRICE_THRESHOLD"
  | "FINANCIAL_AMOUNT_UNRESOLVED"
  | "OVER_FINANCIAL_CAP"
  | "FINANCIAL_ACTION_CONFIRM"
  | "SCHEDULING_LOCKOUT"
  | "CONFIRMATION_REQUIRED"
  | "CONFIRMATION_INVALID"
  | "CONFIRMATION_UNAVAILABLE"
  | "RATE_LIMITED";

export type Decision =
  | { outcome: "ALLOWED"; code: "ALLOWED" }
  | { outcome: "DENIED"; code: DecisionCode; reason: string }
  | { outcome: "NEEDS_CONFIRMATION"; code: DecisionCode; reason: string; actionFingerprint: string };

// ---- Injected, trusted dependencies (the caller wires these to real infra) ------

export interface PolicyDependencies {
  /** Current price (cents) of the item at the location, or null if it can't be resolved. */
  getCurrentItemPriceCents(i: { brandId: string; locationId: string; itemId: string }): Promise<number | null>;
  /** The TRUE amount (cents) a void/refund would move, resolved server-side. null if unresolved. */
  resolveFinancialAmountCents(i: { brandId: string; tool: "void_check" | "refund_payment"; args: Record<string, unknown> }): Promise<number | null>;
  /** Is this a LIVE location that belongs to this brand? */
  isLiveBrandLocation(i: { brandId: string; locationId: string }): Promise<boolean>;
  /** Atomically reserve one write slot in the current minute; false if the ceiling is reached. */
  reserveVelocitySlot(i: { brandId: string; tool: WriteTool; limitPerMinute: number }): Promise<boolean>;
  /** Role the connecting agent maps to for this brand, or null if none. */
  getAgentRole(i: { brandId: string; agentSub: string }): Promise<Role | null>;
  /** Validate & CONSUME a one-time confirmation token bound to this action's fingerprint. */
  consumeConfirmationToken?(i: { brandId: string; agentSub: string; tool: WriteTool; token: string; actionFingerprint: string }): Promise<boolean>;
  /** Start time (epoch ms) of the shift being created/edited, or null if unknown. */
  getShiftStartMs?(i: { brandId: string; args: Record<string, unknown> }): Promise<number | null>;
  /** Injectable clock (testability). */
  now?(): number;
}

// ---- helpers --------------------------------------------------------------------

const str = (a: Record<string, unknown>, k: string): string | undefined =>
  typeof a[k] === "string" && (a[k] as string).length > 0 ? (a[k] as string) : undefined;
const isPosInt = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n > 0;
const isNonNegInt = (n: unknown): n is number => typeof n === "number" && Number.isInteger(n) && n >= 0;
const isFrac = (n: unknown): n is number => typeof n === "number" && Number.isFinite(n) && n >= 0;
const usd = (cents: number): string => `${cents < 0 ? "-" : ""}$${(Math.abs(cents) / 100).toFixed(2)}`;

const allow = (): Decision => ({ outcome: "ALLOWED", code: "ALLOWED" });
const deny = (code: DecisionCode, reason: string): Decision => ({ outcome: "DENIED", code, reason });
const confirm = (code: DecisionCode, reason: string, actionFingerprint: string): Decision => ({
  outcome: "NEEDS_CONFIRMATION",
  code,
  reason,
  actionFingerprint,
});

/**
 * Stable fingerprint of the exact action, so a human-minted confirmation token binds to THIS
 * request and can't be replayed against a different amount/item/location. The human-approval
 * service must compute the token target with this same function.
 */
export function computeActionFingerprint(req: Pick<WriteActionRequest, "brandId" | "tool" | "args">): string {
  const canonical = JSON.stringify({ brandId: req.brandId, tool: req.tool, args: sortDeep(req.args) });
  return createHash("sha256").update(canonical).digest("hex");
}
function sortDeep(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === "object")
    return Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, sortDeep((v as Record<string, unknown>)[k])]));
  return v;
}

/** Reject nonsensical config up front — a NaN/negative threshold must not silently disable a gate. */
function validateConfig(c: BrandGuardrailConfig): string | null {
  if (!Array.isArray(c.enabledTools)) return "enabledTools must be an array.";
  if (!Array.isArray(c.allowedLocationIds)) return "allowedLocationIds must be an array.";
  if (!isFrac(c.priceChangePctThreshold)) return "priceChangePctThreshold must be a finite number ≥ 0.";
  if (!isNonNegInt(c.priceChangeAbsFloorCents)) return "priceChangeAbsFloorCents must be an integer ≥ 0.";
  if (!isNonNegInt(c.financialCapCentsByTool?.void_check) || !isNonNegInt(c.financialCapCentsByTool?.refund_payment))
    return "financialCapCentsByTool values must be integers ≥ 0.";
  if (!isPosInt(c.maxWritesPerMinute)) return "maxWritesPerMinute must be a positive integer.";
  if (!isNonNegInt(c.shiftEditLockoutMinutes)) return "shiftEditLockoutMinutes must be an integer ≥ 0.";
  for (const [tool, role] of Object.entries(c.minimumRoleByTool ?? {}))
    if (role && !(role in ROLE_RANK)) return `minimumRoleByTool.${tool} is not a valid role.`;
  return null;
}

// ---------------------------------------------------------------------------------
// evaluateWriteAction — the balanced policy, fail-closed and effect-aware.
// Gate order: config → known tool → enabled → args → role → location → tier rules
// (hard denials) → confirmation request → atomic velocity → token consumption → ALLOWED.
// The last three are deliberately in that order: an unapproved request returns its
// fingerprint WITHOUT consuming write capacity, and a rate-limited call is rejected
// BEFORE the confirmation token is consumed — so hitting the rate limit never burns
// a human approval (the token stays valid for the retry).
// ---------------------------------------------------------------------------------
export async function evaluateWriteAction(req: WriteActionRequest, deps: PolicyDependencies): Promise<Decision> {
  const now = deps.now ?? Date.now;

  // 0. Config sanity — fail closed on malformed config so a bad value can't disable a gate.
  const cfgErr = validateConfig(req.config);
  if (cfgErr) return deny("INVALID_CONFIG", cfgErr);

  // 1. Known tool.
  const sensitivity = SENSITIVITY[req.tool];
  if (!sensitivity) return deny("UNKNOWN_TOOL", `Unknown tool "${req.tool}".`);

  // 2. Enablement. Not explicitly enabled → denied (financial tools ship off).
  if (!req.config.enabledTools.includes(req.tool))
    return deny("TOOL_DISABLED", `Tool "${req.tool}" is not enabled for this brand.`);

  // 3. Common args. A write with no valid locationId can't be scoped → fail closed.
  const locationId = str(req.args, "locationId");
  if (!locationId) return deny("INVALID_ARGUMENTS", "Missing or invalid locationId.");

  // 4. Role. No/insufficient role → denied. (Enforces the RBAC the product promises.)
  const role = await deps.getAgentRole({ brandId: req.brandId, agentSub: req.agentSub });
  const minRole = req.config.minimumRoleByTool[req.tool] ?? "manager";
  if (!role || ROLE_RANK[role] < ROLE_RANK[minRole])
    return deny("INSUFFICIENT_ROLE", `"${req.tool}" requires the ${minRole} role; agent has ${role ?? "no"} role.`);

  // 5. Location must be a LIVE location of THIS brand, then (if set) within the allow-list.
  //    Empty allow-list still requires a real live location — it never means "any string".
  if (!(await deps.isLiveBrandLocation({ brandId: req.brandId, locationId })))
    return deny("LOCATION_UNKNOWN", `Location "${locationId}" is not a live location for this brand.`);
  if (req.config.allowedLocationIds.length > 0 && !req.config.allowedLocationIds.includes(locationId))
    return deny("LOCATION_NOT_ALLOWED", `Writes are not permitted at location "${locationId}".`);

  // 6. Tier-specific rules. Sets hard denials directly, or flags that confirmation is required.
  let requiresConfirmation = req.config.requireConfirmationForMediumAndHigh && sensitivity !== "LOW";
  let confCode: DecisionCode = "CONFIRMATION_REQUIRED";
  let confReason = "Brand policy requires confirmation for this change.";

  if (req.tool === "set_item_availability") {
    // LOW: reversible, non-financial. Only requires an item + a boolean.
    if (!str(req.args, "itemId")) return deny("INVALID_ARGUMENTS", "Missing or invalid itemId.");
    if (typeof req.args["available"] !== "boolean") return deny("INVALID_ARGUMENTS", "Missing or invalid 'available' boolean.");
    // No confirmation for LOW even under the global flag; the audit log is the safety net.
    requiresConfirmation = false;
  } else if (req.tool === "update_item_price") {
    const itemId = str(req.args, "itemId");
    if (!itemId) return deny("INVALID_ARGUMENTS", "Missing or invalid itemId.");
    const newPrice = req.args["newPriceCents"];
    if (!isPosInt(newPrice)) return deny("INVALID_ARGUMENTS", "Missing or invalid newPriceCents (must be a positive integer).");
    // Judge the REAL change: resolve the current price rather than trusting the agent.
    const current = await deps.getCurrentItemPriceCents({ brandId: req.brandId, locationId, itemId });
    if (current === null) {
      // Can't verify the delta → don't guess; require a human. (Safer posture: DENY here.)
      requiresConfirmation = true;
      confCode = "PRICE_UNVERIFIABLE";
      confReason = "Current price could not be verified, so the change can't be auto-approved.";
    } else {
      const absDelta = Math.abs(newPrice - current);
      const pct = current > 0 ? absDelta / current : Infinity;
      const autoOk = absDelta <= req.config.priceChangeAbsFloorCents || pct <= req.config.priceChangePctThreshold;
      if (!autoOk) {
        requiresConfirmation = true;
        confCode = "OVER_PRICE_THRESHOLD";
        const pctLabel = current > 0 ? `${Math.round(pct * 100)}%` : "∞";
        confReason = `Price change of ${usd(absDelta)} (${pctLabel}) exceeds the auto-approve band (±${Math.round(req.config.priceChangePctThreshold * 100)}% or ${usd(req.config.priceChangeAbsFloorCents)}).`;
      }
    }
  } else if (req.tool === "create_shift" || req.tool === "update_shift") {
    if (req.tool === "update_shift" && !str(req.args, "shiftId")) return deny("INVALID_ARGUMENTS", "Missing or invalid shiftId.");
    // Scheduling lockout: block edits too close to a shift's start (labor-law / no-show risk).
    if (deps.getShiftStartMs && req.config.shiftEditLockoutMinutes > 0) {
      const startMs = await deps.getShiftStartMs({ brandId: req.brandId, args: req.args });
      if (startMs !== null) {
        const minutesUntil = (startMs - now()) / 60000;
        if (minutesUntil < req.config.shiftEditLockoutMinutes)
          return deny(
            "SCHEDULING_LOCKOUT",
            `Shift starts in ${Math.round(minutesUntil)} min; edits within ${req.config.shiftEditLockoutMinutes} min of start are blocked.`,
          );
      }
    }
    // Otherwise MEDIUM: confirmation only if the brand-wide flag is set (already reflected above).
  } else {
    // HIGH: void_check / refund_payment. Judge the TRUE amount; never auto-execute.
    const amount = await deps.resolveFinancialAmountCents({ brandId: req.brandId, tool: req.tool, args: req.args });
    if (amount === null) return deny("FINANCIAL_AMOUNT_UNRESOLVED", "Could not resolve the amount for this financial action; refusing to proceed.");
    if (!isPosInt(amount)) return deny("INVALID_ARGUMENTS", `Resolved financial amount (${usd(amount)}) is not a positive integer.`);
    const cap = req.config.financialCapCentsByTool[req.tool];
    if (amount > cap) return deny("OVER_FINANCIAL_CAP", `${usd(amount)} exceeds the ${usd(cap)} automated cap for ${req.tool}.`);
    requiresConfirmation = true; // financial reversals ALWAYS need a human, even under the cap.
    confCode = "FINANCIAL_ACTION_CONFIRM";
    confReason = `Financial action (${usd(amount)}) requires human confirmation.`;
  }

  // 7. Confirmation gate, part 1: confirmation required and no token yet → return the
  //    fingerprint now, BEFORE reserving a velocity slot, so requests waiting on a human
  //    don't consume write capacity.
  if (requiresConfirmation && !req.confirmationToken)
    return confirm(confCode, confReason, computeActionFingerprint(req));

  // 8. Velocity — atomic reserve, BEFORE consuming any confirmation token, so a
  //    rate-limited call never burns a human approval (the token stays valid for retry).
  if (!(await deps.reserveVelocitySlot({ brandId: req.brandId, tool: req.tool, limitPerMinute: req.config.maxWritesPerMinute })))
    return deny("RATE_LIMITED", `Write rate limit reached (${req.config.maxWritesPerMinute}/min). Try again shortly.`);

  // 9. Confirmation gate, part 2: validate & single-use-consume the server-minted token.
  //    A supplied-but-invalid token is a hard failure (possible tampering/replay), and a
  //    token never bypasses any gate above — it only satisfies the confirmation requirement.
  if (requiresConfirmation && req.confirmationToken) {
    if (!deps.consumeConfirmationToken)
      return deny("CONFIRMATION_UNAVAILABLE", "Confirmation is not supported by this deployment.");
    const ok = await deps.consumeConfirmationToken({
      brandId: req.brandId,
      agentSub: req.agentSub,
      tool: req.tool,
      token: req.confirmationToken,
      actionFingerprint: computeActionFingerprint(req),
    });
    if (!ok) return deny("CONFIRMATION_INVALID", "Confirmation token is invalid, expired, or does not match this action.");
  }

  return allow();
}
