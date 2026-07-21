# @servvo/connector-toast

Toast adapter — OAuth 2.0 **client-credentials**.

Toast's auth shape differs from every other vendor: exchange `clientId` + `clientSecret`
with `userAccessType: TOAST_MACHINE_CLIENT` for a bearer token. Restaurants are addressed
by **GUID**, stored in `Location.vendorRefs.TOAST`.

## The gating risk

Multi-restaurant access requires **Toast partner-program approval** — the longest
external lead time in the whole plan (see [docs/10](../../../docs/10-VENDOR-PARTNERSHIPS.md)).
Apply in week 1. Until it lands:

- Build and test against sanitized fixtures.
- Sequence pilots Square-first so the 90-day clock isn't hostage to an approval queue.
- Design for revocation — losing Toast access must degrade one connector, not the platform.

## APIs consumed

`orders` (sales, `search_orders`) · `menus` (items, modifiers, prices, availability →
86ing) · `labor` (employees, shifts) · `restaurants` (location discovery) · `stock`
(inventory, v1.x).

## Watch-outs

- Write scopes are reviewed more strictly than reads; expect a security questionnaire
  (docs/09 is the answer packet).
- Toast and Square define "net sales" differently — document the difference in
  `provenance.method` rather than reconciling it silently.

Implementation: **Prompt 9**. Rules: [`add-connector`](../../../.claude/skills/add-connector/SKILL.md).
