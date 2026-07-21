/**
 * The connector contract. Every vendor implements this one interface.
 *
 * Adapters are THIN: a connector knows its vendor's endpoints, auth shape, ids, and
 * field mappings — nothing about MCP, tenancy, or guardrails. If you find yourself
 * importing @servvo/policy or MCP types into an adapter, stop.
 *
 * See .claude/skills/add-connector/SKILL.md.
 */

import type {
  DateRange,
  LaborSummary,
  Location,
  MenuItem,
  Money,
  SalesSummary,
  Shift,
  Vendor,
} from "@servvo/canonical";

export interface ConnectorContext {
  brandId: string;
  locationId?: string;
  /** Fresh, decrypted vendor access token; refresh is handled transparently upstream. */
  getToken: () => Promise<string>;
  /** Vendor-specific ids for this brand/location, e.g. { TOAST: "<restaurant-guid>" }. */
  vendorRefs: Record<string, string>;
}

export interface RestaurantConnector {
  readonly vendor: Vendor;

  // ---- reads (required) ----
  listLocations(ctx: ConnectorContext): Promise<Location[]>;
  getSalesSummary(ctx: ConnectorContext, range: DateRange): Promise<SalesSummary>;
  getMenu(ctx: ConnectorContext): Promise<MenuItem[]>;

  // ---- reads (optional — drive capability advertising) ----
  getLaborSummary?(ctx: ConnectorContext, range: DateRange): Promise<LaborSummary>;
  getShifts?(ctx: ConnectorContext, range: DateRange): Promise<Shift[]>;

  // ---- writes (optional, always guardrailed upstream) ----
  setItemAvailability?(ctx: ConnectorContext, itemId: string, available: boolean): Promise<void>;
  updateItemPrice?(ctx: ConnectorContext, itemId: string, price: Money): Promise<void>;
  createShift?(ctx: ConnectorContext, shift: Omit<Shift, "id" | "provenance">): Promise<Shift>;
  updateShift?(ctx: ConnectorContext, shiftId: string, patch: Partial<Shift>): Promise<Shift>;
}

/** Optional methods a connector actually implements — drives the exposed MCP surface. */
export type Capability =
  | "getLaborSummary"
  | "getShifts"
  | "setItemAvailability"
  | "updateItemPrice"
  | "createShift"
  | "updateShift";

const OPTIONAL_METHODS: Capability[] = [
  "getLaborSummary",
  "getShifts",
  "setItemAvailability",
  "updateItemPrice",
  "createShift",
  "updateShift",
];

/**
 * Never advertise a tool a vendor can't back. A stubbed method returning fake data is
 * worse than an absent one — the agent will confidently report fiction.
 */
export function capabilitiesOf(connector: RestaurantConnector): Capability[] {
  return OPTIONAL_METHODS.filter((m) => typeof connector[m] === "function");
}
