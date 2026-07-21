/**
 * @servvo/canonical — the canonical restaurant schema.
 *
 * THE BOUNDARY: everything above the adapters speaks these types. Per-vendor adapters
 * are thin translators into them. This boundary is the ~40%-reuse moat for future
 * verticals — protect it. See .claude/skills/canonical-schema/SKILL.md before changing
 * anything here.
 *
 * Money is ALWAYS integer minor units (cents) + ISO 4217. Never floats.
 */

import { z } from "zod";

// ---- primitives -----------------------------------------------------------------

export const Vendor = z.enum(["TOAST", "SQUARE", "CLOVER", "SEVENSHIFTS"]);
export type Vendor = z.infer<typeof Vendor>;

/**
 * Money in integer minor units. `.int()` is the guard that makes a float a validation
 * error rather than a silent rounding bug three layers down.
 */
export const Money = z.object({
  amount: z.number().int("money must be integer minor units (cents), never a float"),
  currency: z.string().length(3, "ISO 4217 currency code"),
});
export type Money = z.infer<typeof Money>;

export const DateRange = z.object({
  start: z.string().datetime({ offset: true }).or(z.string().date()),
  end: z.string().datetime({ offset: true }).or(z.string().date()),
});
export type DateRange = z.infer<typeof DateRange>;

/**
 * Provenance travels with every computed metric. Two vendors compute "net sales"
 * differently; we disclose which one answered and how, rather than silently averaging.
 */
export const Provenance = z.object({
  source: Vendor,
  method: z.string().min(1, "document exactly how this figure was computed"),
});
export type Provenance = z.infer<typeof Provenance>;

// ---- core entities --------------------------------------------------------------

export const Location = z.object({
  id: z.string(),
  name: z.string(),
  /** IANA zone — per-location reporting must respect it ("last week" is local). */
  timezone: z.string(),
  vendor: Vendor,
  live: z.boolean(),
});
export type Location = z.infer<typeof Location>;

export const SalesSummary = z.object({
  locationId: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  netSales: Money,
  grossSales: Money,
  checkCount: z.number().int().nonnegative(),
  /** null when the POS doesn't report covers — a null is not a zero. */
  coverCount: z.number().int().nonnegative().nullable(),
  averageCheck: Money,
  provenance: Provenance,
});
export type SalesSummary = z.infer<typeof SalesSummary>;

export const MenuModifier = z.object({
  id: z.string(),
  name: z.string(),
  price: Money,
});
export type MenuModifier = z.infer<typeof MenuModifier>;

export const MenuItem = z.object({
  id: z.string(),
  name: z.string(),
  price: Money,
  /** false === 86'd */
  available: z.boolean(),
  modifiers: z.array(MenuModifier).optional(),
  provenance: Provenance,
});
export type MenuItem = z.infer<typeof MenuItem>;

export const LaborSummary = z.object({
  locationId: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  totalHours: z.number().nonnegative(),
  laborCost: Money,
  /** null when sales for the same period aren't available — never fabricate it. */
  laborPctOfSales: z.number().nullable(),
  provenance: Provenance,
});
export type LaborSummary = z.infer<typeof LaborSummary>;

export const Shift = z.object({
  id: z.string(),
  locationId: z.string(),
  employeeName: z.string(),
  start: z.string(),
  end: z.string(),
  role: z.string().optional(),
  provenance: Provenance,
});
export type Shift = z.infer<typeof Shift>;

// ---- partial results ------------------------------------------------------------

/**
 * A mixed estate means one vendor can be down while others answer. Tools return this
 * so the agent can say "here are 8 of 12 locations; Square is unavailable" instead of
 * failing the whole request.
 */
export const PartialResult = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    results: z.array(item),
    unavailable: z.array(
      z.object({
        locationId: z.string(),
        vendor: Vendor,
        reason: z.string(),
      }),
    ),
  });

export type PartialResult<T> = {
  results: T[];
  unavailable: { locationId: string; vendor: Vendor; reason: string }[];
};

// ---- formatting helpers ---------------------------------------------------------

/** Format at the edge only. Never store or compare formatted money. */
export function formatMoney(m: Money, locale = "en-US"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: m.currency }).format(
    m.amount / 100,
  );
}

export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) throw new Error(`cannot add ${a.currency} to ${b.currency}`);
  return { amount: a.amount + b.amount, currency: a.currency };
}

/** Integer-safe average; rounds half away from zero so totals reconcile predictably. */
export function averageMoney(total: Money, count: number): Money {
  if (count <= 0) return { amount: 0, currency: total.currency };
  const raw = total.amount / count;
  return { amount: Math.round(raw), currency: total.currency };
}
