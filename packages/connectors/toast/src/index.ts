/**
 * Toast adapter — OAuth 2.0 client-credentials.
 *
 * Auth shape differs from every other vendor: exchange clientId + clientSecret with
 * `userAccessType: TOAST_MACHINE_CLIENT` for a bearer token. Restaurants are addressed
 * by GUID, stored in `Location.vendorRefs.TOAST`.
 *
 * GATING: multi-restaurant access requires Toast partner-program approval — the longest
 * external lead time in the plan (see docs/10-VENDOR-PARTNERSHIPS.md). Build against
 * fixtures; design for access revocation.
 *
 * IMPLEMENTATION: Prompt 9. Keep it thin. See .claude/skills/add-connector/SKILL.md.
 */

import type { RestaurantConnector } from "@servvo/connector-core";

export const TOAST_USER_ACCESS_TYPE = "TOAST_MACHINE_CLIENT" as const;

export type ToastConnector = RestaurantConnector & { readonly vendor: "TOAST" };

/** Toast APIs Servvo consumes: orders, menus, labor, restaurants(config), stock. */
export const TOAST_APIS = ["orders", "menus", "labor", "restaurants", "stock"] as const;
