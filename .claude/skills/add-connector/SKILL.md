---
name: add-connector
description: Procedure for adding or modifying a vendor adapter (POS/scheduling/reservations) in packages/connectors. Use whenever creating a new vendor integration, extending an existing adapter, or reviewing connector code.
---

# Add a vendor connector

## Non-negotiables

1. **Adapters are thin.** A connector knows its vendor's endpoints, auth shape, ids,
   and field mappings — nothing about MCP, tenancy, guardrails, or other vendors.
   If you're importing from `@servvo/policy` or the MCP server inside an adapter, stop.
2. **Canonical out, always.** Every method returns `@servvo/canonical` types. Set
   `source` and a human-readable `method` on every computed metric (vendors compute
   "net sales" differently; we disclose how we mapped it).
3. **Money is integer cents + ISO 4217.** A float anywhere in a money path is a bug.
4. **Reuse core.** HTTP client, retries, timeouts, token buckets, and OTel spans come
   from `packages/connectors/core` — never hand-roll fetch loops in an adapter.
5. **Sandbox only.** Fixtures come from the vendor sandbox, sanitized. Never a live
   brand, never committed real credentials.

## Procedure

1. Read `packages/canonical/README` (normalization contract) and the closest existing
   adapter (`square` is the reference implementation).
2. Check [docs/10-VENDOR-PARTNERSHIPS.md](../../../docs/10-VENDOR-PARTNERSHIPS.md):
   confirm scopes/partner status cover what you're building; update its tracker table.
3. Scaffold `packages/connectors/<vendor>` implementing `RestaurantConnector` from
   core. Implement only what the vendor truly supports — capability advertising exposes
   optional methods; never stub a method to return fake data.
4. Auth: implement the vendor's OAuth shape against `packages/secrets`
   (`ConnectorContext.getToken()`); handle refresh/expiry semantics per vendor.
5. Capture sanitized sandbox fixtures into `__fixtures__/` and write **reconciliation
   tests**: fixture → exact expected canonical object. Cover: 86'd items, voided
   checks, missing cover counts, multi-currency if applicable, empty days.
6. Register in the core registry; add the vendor to `Location.vendorRefs` mapping docs.
7. Run the full policy + MCP integration suites — a new connector must not change any
   canonical type without a proposal first (see the canonical-schema skill).

## Definition of done

- [ ] All implemented methods fixture-tested with exact money assertions
- [ ] `source`/`method` set on every metric
- [ ] Rate limits configured per the vendor's published limits
- [ ] Capability advertising verified (unsupported tools absent from MCP surface)
- [ ] Vendor tracker row updated in docs/10
- [ ] Verified end-to-end via the verify-agent-e2e skill
