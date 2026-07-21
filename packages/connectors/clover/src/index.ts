/**
 * Clover adapter — per-merchant OAuth, distributed via the Clover App Market.
 *
 * Only build this if the discovery interviews (docs/05) surface enough Clover
 * operators to justify it — connector priority is decided by operator data, not by us.
 *
 * IMPLEMENTATION: Prompt 9 (optional). See .claude/skills/add-connector/SKILL.md.
 */

import type { RestaurantConnector } from "@servvo/connector-core";

export type CloverConnector = RestaurantConnector & { readonly vendor: "CLOVER" };

export const CLOVER_API_BASE = {
  sandbox: "https://apisandbox.dev.clover.com",
  production: "https://api.clover.com",
} as const;
