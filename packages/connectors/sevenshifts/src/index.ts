/**
 * 7shifts adapter — labor and scheduling.
 *
 * This is the connector that lets `get_labor_summary` answer for a brand whose POS is
 * Toast but whose scheduling is 7shifts — the cross-vendor join that single-vendor AI
 * features cannot do.
 *
 * WRITE CAUTION: createShift/updateShift are the product's first scheduling writes.
 * Confirm the partner ToS explicitly permits API-driven schedule changes before
 * enabling them for a brand (docs/10-VENDOR-PARTNERSHIPS.md).
 *
 * IMPLEMENTATION: Prompt 10. See .claude/skills/add-connector/SKILL.md.
 */

import type { RestaurantConnector } from "@servvo/connector-core";

export type SevenShiftsConnector = RestaurantConnector & { readonly vendor: "SEVENSHIFTS" };

export const SEVENSHIFTS_API_BASE = "https://api.7shifts.com/v2" as const;
