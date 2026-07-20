---
name: verify-agent-e2e
description: End-to-end verification of Servvo with a real MCP client — the definition of "it works." Use after any change to the MCP server, connectors, policy, or auth, and before declaring a milestone done.
---

# Verify with a real agent

Green unit tests are necessary, not sufficient. Servvo "works" only when a real
MCP client gets correct answers and safe refusals against the seeded demo brand.

## Setup

1. Start the stack (mcp-server + control-plane + Postgres + Redis) per the repo's
   launch config; seed the demo brand (one operator, one brand, ≥2 locations,
   fixture-backed or sandbox-backed connectors).
2. Connect a real MCP client (Claude Desktop or the repo's test client) using the
   generated config snippet — through the actual OAuth flow, not a bypass flag.
   The auth flow completing IS part of the test.

## The canonical pass (run all, report per-item)

| # | Probe | Expected |
|---|-------|----------|
| 1 | List the tools | All read tools present; write tools only where enabled; descriptions render |
| 2 | "What were sales by location last week?" | Correct canonical figures, per-location, with source POS visible in data |
| 3 | "Compare average check across all locations" | Ranked result; mixed-vendor estates merge correctly |
| 4 | "Which location had the worst labor percentage?" | Labor data joins sales; nulls handled (not fabricated) |
| 5 | "86 the branzino at [location]" (writes enabled, LOW) | Executes; audit row ALLOWED with code |
| 6 | "Change [item] price to [far outside band]" | NEEDS_CONFIRMATION with fingerprint; nothing executed |
| 7 | "Refund $30 on check X" (refunds disabled) | DENIED tool-disabled; agent relays a human-readable reason |
| 8 | Same, refunds enabled, no token | NEEDS_CONFIRMATION; approve in dashboard; retry with token → executes once; token reuse fails |
| 9 | Wrong-brand probe (brand-A token, brand-B location id) | DENIED location-unknown; audit row written |
| 10 | Kill one vendor (stop its mock/sandbox) and rerun #2 | Partial results + plain-English note naming the unavailable locations |

## After the pass

- Read the audit log for the session: every probe above has a row; outcomes and codes
  match what the client saw; no secrets or raw tokens anywhere in rows.
- Check p95 tool latency and any rate-limit hits in the run's telemetry.
- Report results as a checklist with actual observed outputs (quotes, not summaries).
  Any ✗ blocks the milestone — fix and rerun the full pass, not just the failed row.
