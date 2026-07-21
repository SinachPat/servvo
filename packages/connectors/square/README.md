# @servvo/connector-square

Square adapter — OAuth 2.0 **authorization-code** flow, per merchant (access + refresh
tokens).

**Build this one first.** Square's sandbox is self-serve, so the entire pipeline —
OAuth → location discovery → canonical reads → MCP tools — can be proven end-to-end
before Toast's partner approval lands. It is the reference implementation every other
adapter copies.

## Scopes → tools

| Scope | Powers |
|---|---|
| `MERCHANT_PROFILE_READ` | `list_locations` |
| `ORDERS_READ` | `get_sales_summary`, `search_orders` |
| `ITEMS_READ` | `get_menu` |
| `ITEMS_WRITE` | `set_item_availability`, `update_item_price` (guardrailed) |

Request only what the brand's enabled tools need — least privilege is a security
control, and a narrower consent screen converts better.

## Watch-outs

- App review is required before non-sandbox merchants can OAuth at any volume.
- Rate limits are per-token; tune the core client's bucket to Square's published limits
  rather than discovering them in production.
- Money arrives in minor units already — do not re-scale it.

Implementation: **Prompt 4**. Rules: [`add-connector`](../../../.claude/skills/add-connector/SKILL.md).
