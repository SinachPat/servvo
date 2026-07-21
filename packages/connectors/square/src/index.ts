/**
 * Square adapter — authorization-code OAuth, per merchant.
 *
 * Square is deliberately the FIRST adapter: its sandbox is self-serve, so the whole
 * pipeline (OAuth → locations → canonical reads → MCP tools) can be proven end-to-end
 * before Toast's partner approval lands.
 *
 * Scopes → tools: MERCHANT_PROFILE_READ (locations) · ORDERS_READ (sales, search) ·
 * ITEMS_READ/ITEMS_WRITE (menu, 86, price).
 *
 * IMPLEMENTATION: Prompt 4. Keep it thin — mapping and endpoints only, no MCP,
 * tenancy, or guardrail concerns. See .claude/skills/add-connector/SKILL.md.
 */

import type { RestaurantConnector } from "@servvo/connector-core";

export const SQUARE_SCOPES = [
  "MERCHANT_PROFILE_READ",
  "ORDERS_READ",
  "ITEMS_READ",
  "ITEMS_WRITE",
] as const;

export type SquareConnector = RestaurantConnector & { readonly vendor: "SQUARE" };

export const SQUARE_API_BASE = {
  sandbox: "https://connect.squareupsandbox.com",
  production: "https://connect.squareup.com",
} as const;
