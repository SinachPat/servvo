---
name: mcp-tool-design
description: Rules for designing or changing agent-facing MCP tools and resources in apps/mcp-server. Use when adding a tool, editing a tool description or schema, or reviewing the agent-facing surface.
---

# MCP tool design

The tool surface **is** the product's UX — an LLM must call it correctly on the first
try, and a wrong-but-plausible call must be impossible or safely refused.

## Descriptions

- Verbose and concrete: what it returns, for what scope, with 1–2 example use cases.
  A model that has never seen Servvo should pick the right tool from descriptions alone.
- State reach explicitly: "across the brand's live locations", "for one location".
- Write tools must say so: "This is a WRITE action, subject to the brand's guardrail
  policy; it may require human confirmation or be denied."
- Never leak vendor names into tool semantics — the agent sees canonical restaurant
  concepts, not "Toast checks".

## Schemas (zod)

- Every arg gets `.describe()`. Dates are ISO strings with the boundary semantics
  stated ("inclusive"). Money args are integer cents, named `*Cents`.
- Optional args must have safe defaults described ("omit for all live locations").
- Write tools take `confirmationToken: z.string().optional()` and, where retries are
  possible, an idempotency key.
- Validate at the edge; the policy engine may trust arg *types* downstream.

## Behavior

- **Reads** fan out across live locations and merge canonical results; partial vendor
  outages return the reachable subset plus a clear note naming what's missing — never
  fail the whole call for one down vendor.
- **Writes** always: load brand config → `evaluateWriteAction()` → audit the decision
  (outcome + code) → only then call the connector, with the exact figures the policy
  judged. On `NEEDS_CONFIRMATION`, return the fingerprint and instructions; on
  `DENIED`, return the reason — both as text an agent can relay verbatim to a human.
- Errors are written for two readers: the agent (structured, retriable-or-not) and the
  operator who will see the agent quote it (plain English, no stack traces, no ids
  they can't act on).
- Output budget: return compact JSON summaries, not raw vendor dumps; paginate or cap
  list responses; an agent context window is a cost surface.

## Resources vs tools

Use a **resource** for stable, read-often context (`brand://profile`, menu snapshots);
use a **tool** for anything parameterized or fresh. Don't duplicate the same data as
both without a reason.

## Checklist for any surface change

- [ ] Tool description passes the "cold model picks correctly" test
- [ ] Args all described; money in cents; dates ISO
- [ ] Cross-brand access impossible (brand comes from the token, never from args)
- [ ] Audit row written on every path, including denials and errors
- [ ] Integration test updated (schema presence + auth rejection + a happy path)
