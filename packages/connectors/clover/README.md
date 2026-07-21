# @servvo/connector-clover

Clover adapter — per-merchant OAuth 2.0, distributed through the Clover App Market.

## Build this only if the data says so

Connector priority is decided by **operator interviews, not by us**
([docs/05](../../../docs/05-DISCOVERY-INTERVIEWS.md)). Clover ships as a stub precisely
so it stays unbuilt until enough interviewed locations run it to clear the scoring
threshold:

> priority = (# operators using it) × (API feasibility 1–3) × (pain intensity 1–3)

## Watch-outs

- App Market review carries UX/branding requirements even for API-only integrations.
- Regional platform split (US vs EU endpoints) — pick the base URL from the merchant's
  region, never hardcode.

APIs Servvo would consume: merchants/locations, orders, inventory/items.

Implementation: **Prompt 9 (conditional)**. Rules: [`add-connector`](../../../.claude/skills/add-connector/SKILL.md).
