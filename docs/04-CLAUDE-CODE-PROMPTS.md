# Servvo — Claude Code Build Prompts

Copy-paste prompts to build Servvo with Claude Code, sequenced to match the phased
build plan in the [Implementation Guide](03-IMPLEMENTATION.md). Each prompt is
self-contained but assumes the ones before it ran. Run them in order; review and test
between each.

> **How to use this file**
> 1. Start by seeding project memory with **Prompt 0 (CLAUDE.md)** so every later
>    session shares the same context.
> 2. Run one prompt per Claude Code session (or a few small ones together). Let Claude
>    propose a plan, approve it, then have it implement + test.
> 3. After each prompt, run the tests it wrote and **connect a real MCP client** (Claude
>    Desktop) as soon as Phase 1 exists — the app's whole point is agent access, so
>    verify against a live agent, not just unit tests.
> 4. Keep secrets in `.env.local`; never commit real vendor credentials.

---

## Prompt 0 — Seed project memory (CLAUDE.md)

> A CLAUDE.md already exists at the repo root (created alongside these docs), and
> project skills live in `.claude/skills/`. Use this prompt to *verify and extend* it
> once code exists (fill in the Commands section), not to recreate it.

```
Review the existing CLAUDE.md at the repo root against docs/01–04 and extend it rather
than recreating it. It must capture the following context so every future session
shares it:

PROJECT: Servvo — done-for-you MCP (Model Context Protocol) connectors for multi-location
restaurants. We host a managed, multi-tenant remote MCP server. Operators connect their
POS/scheduling systems (Toast, Square, Clover, 7shifts) in a dashboard, pick locations,
and any MCP-compatible AI agent can then read sales/menu/labor/reservations and perform
guardrailed writes across their whole estate.

ARCHITECTURE: Dual-OAuth. (1) Agent → Servvo: Servvo is an OAuth 2.1 RESOURCE SERVER for
the remote MCP endpoint (Streamable HTTP transport, PKCE S256, RFC 9728 protected-resource
metadata, RFC 8707 resource indicators, correct WWW-Authenticate on 401) — delegate the
authorization server to a managed IdP. (2) Servvo → POS vendors: Servvo is an OAuth CLIENT
holding each brand's vendor tokens (encrypted, refreshed, never exposed to the agent).

STACK: TypeScript/Node 20+, pnpm monorepo (Turborepo). MCP: @modelcontextprotocol/sdk.
Dashboard: Next.js App Router + React. DB: Postgres + Prisma. Cache/queue: Redis + BullMQ.
Secrets: cloud KMS envelope encryption. Deploy: dashboard on Vercel, MCP + control plane on
Fly.io/Cloudflare.

MONOREPO: apps/{dashboard,mcp-server,control-plane}; packages/{canonical,connectors/{core,
toast,square,clover,sevenshifts},policy,audit,secrets,db}.

CORE PRINCIPLES:
- Everything above the adapters speaks a CANONICAL restaurant schema; per-vendor adapters
  are thin and translate to/from it. This canonical boundary is what makes new verticals
  reuse ~40% of the code — protect it.
- The MCP tool surface IS the UX: verbose self-describing tool descriptions + typed (zod)
  args so an LLM calls them correctly first try.
- Writes are READ-ONLY BY DEFAULT and always pass the server-side guardrail policy engine
  (packages/policy) before any vendor call. Never trust the agent.
- Every tool call (allowed or denied) writes an immutable audit row.
- Strict per-brand (tenant) isolation on every query.
- Money is always integer minor units (cents) + ISO currency; never floats.

Add a "Commands" section with the pnpm/turbo commands once they exist, and a "Testing"
note that adapters are tested against sanitized vendor fixtures and the guardrail engine
is table-driven.
```

---

## Prompt 1 — Scaffold the monorepo

```
Scaffold the Servvo monorepo per CLAUDE.md using pnpm workspaces + Turborepo, TypeScript
strict mode everywhere, ESLint (flat config) + Prettier, and Vitest for tests. Create the
workspace structure: apps/{dashboard,mcp-server,control-plane} and packages/{canonical,
connectors,policy,audit,secrets,db}, with connectors containing subpackages
core/toast/square/clover/sevenshifts.

Rely on the pnpm workspace protocol for @servvo/* resolution — each package sets
"main"/"types" to ./src/index.ts and depends on siblings with "workspace:*". Do NOT add
tsconfig path aliases on top: they would be a redundant second resolution mechanism that
drifts from package.json.

Set up a shared tsconfig base, a Turborepo pipeline (build, test, typecheck; lint runs
once at the root against the flat config), and placeholder index files so the workspace
compiles. Don't implement business logic yet — just a clean, compiling skeleton with a
README in each package explaining its role and the invariants that bind it. Show me the
resulting tree.
```

---

## Prompt 2 — Database schema (Prisma)

```
In packages/db, set up Prisma with a Postgres datasource and implement the schema from the
implementation guide: Operator, Brand (the tenant + billing unit, with a plan enum and an
mcpClientId), Connection (vendor enum, status enum PENDING|HEALTHY|DEGRADED|EXPIRED, a
secretRef pointer NOT the token, scopes), Location (live flag, vendorRefs JSON mapping
Servvo location → vendor-specific ids), Policy (rules JSON), and AuditLog (append-only:
brandId, agentSub, tool, args, locationId, outcome ALLOWED|DENIED|NEEDS_CONFIRMATION|ERROR,
code — the policy engine's machine-readable DecisionCode — reason, result, latencyMs,
createdAt). Add appropriate indexes (esp. AuditLog by brandId+createdAt, and
Connection by brandId+vendor). Export a typed Prisma client from the package. Generate an
initial migration. Write a seed script that creates one demo operator + brand + two
locations so later phases have data to hit. Include a brief note on adding Postgres
Row-Level Security by brandId as defense-in-depth.
```

---

## Prompt 3 — Canonical restaurant schema

```
In packages/canonical, implement the canonical restaurant domain types as zod schemas with
inferred TS types: Money (integer minor units + ISO4217 currency — enforce no floats),
Location, SalesSummary (netSales, grossSales, checkCount, coverCount nullable, averageCheck),
MenuItem (with available:boolean where false === 86'd, and optional modifiers), LaborSummary
(totalHours, laborCost, laborPctOfSales nullable), and Shift. Add a DateRange type.

Define provenance ONCE as a reusable `Provenance` object ({ source: Vendor, method: string }
where `method` documents exactly how the figure was computed, and an empty method fails
validation), then attach `provenance` to every type carrying a computed metric —
SalesSummary, MenuItem, LaborSummary, and Shift. Do not repeat flat source/method pairs on
each type; four copies drift.

Also add a `PartialResult<T>` type ({ results, unavailable[] }) so a tool can report "8 of
12 locations; Square is unavailable" instead of failing an entire request when one vendor
is down. Export everything. Write a short README documenting the normalization contract: every adapter MUST
set source/method and document exactly how it maps each field, because vendors compute
metrics differently. Add unit tests asserting the schemas reject floats-as-money and accept
valid fixtures.
```

---

## Prompt 4 — Connector framework + Square adapter (reads)

```
In packages/connectors/core, implement the RestaurantConnector interface and framework from
the implementation guide: the interface with ConnectorContext (brandId, optional locationId,
async getToken(), vendorRefs), required read methods (listLocations, getSalesSummary,
getMenu) and optional ones (getLaborSummary, getShifts) plus optional write methods
(setItemAvailability, updateItemPrice). Build a shared HTTP client with retries, timeouts,
per-vendor rate-limit handling (token bucket, pluggable store), and OpenTelemetry spans.
Add a Connector registry (Vendor -> RestaurantConnector) and a capability-advertising helper
that reports which optional methods a connector implements.

Then implement packages/connectors/square as the first adapter: OAuth 2.0 authorization-code
flow (access + refresh tokens, scopes ORDERS_READ, ITEMS_READ, MERCHANT_PROFILE_READ, and
labor read where available). Implement listLocations, getSalesSummary (map Square Orders/
payments to canonical SalesSummary; set source="SQUARE" and a clear `method`), and getMenu
(map Square Catalog items/variations/availability). Keep the adapter THIN — no MCP, tenancy,
or guardrail concerns. Test it against sanitized Square sandbox fixtures with reconciliation
assertions (fixture -> expected canonical values). Use Square's sandbox, never live data.
```

---

## Prompt 5 — Audit package

```
In packages/audit, implement an append-only audit writer and query API over the AuditLog
Prisma model. Provide audit({ brandId, agentSub, tool, args, locationId?, outcome, code?,
reason?, result?, latencyMs? }) that writes one row — `code` is the policy engine's
machine-readable DecisionCode — redacting obvious secrets from args/result before
persistence. Provide a query function for the dashboard (filter by brand, date range, tool,
outcome, code; paginated). Add an OPTIONAL hash-chain mode (each row stores a hash of prev-hash +
this row) behind a flag, for tamper-evidence on enterprise brands, with a verify() function.
Unit-test the writer, the redaction, and the hash-chain verification.
```

---

## Prompt 6 — The MCP server: read tools + OAuth resource server

```
In apps/mcp-server, build the remote MCP server with @modelcontextprotocol/sdk using the
Streamable HTTP transport. Implement it as an OAuth 2.1 RESOURCE SERVER: verify inbound
bearer tokens from a managed IdP, enforce PKCE-based flows at the IdP, publish RFC 9728
protected-resource metadata, require the RFC 8707 resource parameter, and return 401 with a
correct WWW-Authenticate header pointing to the authorization server when auth is missing/
invalid. Resolve the brand from the token's claims and REJECT any attempt to access another
brand's data.

Register the read tools, each with a verbose, example-rich description and zod-typed args:
list_locations, get_sales_summary (fans out across the brand's live locations — hitting each
location's vendor adapter via the registry — and merges canonical SalesSummary results),
get_menu, get_labor_summary, get_shifts, compare_locations (rank any metric across locations).
Expose read-only for now. Wrap every tool call to write an audit row (ALLOWED/ERROR) with
latency. Add a brand://profile resource. Write integration tests: tool schemas are present,
unauthenticated calls 401 with WWW-Authenticate, a token for brand A cannot read brand B,
and get_sales_summary correctly aggregates a mixed Square+fixture estate. Give me the exact
Claude Desktop config snippet to connect to a local brand and test manually.
```

---

## Prompt 7 — Dashboard: connect flow & location select

```
In apps/dashboard (Next.js App Router), build the operator-facing UI per the brand package
(Slate Ink chrome, Paper White content, one Ember CTA per screen, JetBrains Mono for the MCP
URL and any GUIDs). Screens:
1. Operator auth (Clerk or Auth.js) + create/select Brand.
2. Connections page: "Connect Square" button that runs the Square OAuth authorization-code
   flow end-to-end and lands back showing a HEALTHY connection; connection cards with green/
   amber/red status and a Reconnect action.
3. After connecting, call the adapter's listLocations, persist Locations, and render a
   checklist where the operator toggles which locations go live.
4. A "Your MCP endpoint" panel showing the brand's MCP URL + copyable Claude Desktop config.
Make the connect+select flow genuinely fast — this is the <30-minute-setup north star.
Store tokens via packages/secrets (next prompt), never in the app DB in plaintext. Add empty
states using the connector-node visual motif. Keep it accessible and responsive.
```

---

## Prompt 8 — Secrets / token custody

```
In packages/secrets, implement encrypted token custody. Use envelope encryption: a per-brand
data key wrapped by cloud KMS (support AWS KMS and a local dev fallback that clearly warns it
is NOT for production). Store only the wrapped ciphertext + a secretRef; the Connection row
holds the secretRef, never plaintext. Provide putToken(brandId, vendor, tokenSet),
getToken(secretRef) returning a decrypted, still-valid access token (auto-refreshing via the
vendor's refresh flow when near expiry), and revoke(secretRef) that revokes at the vendor and
purges the secret. Wire the ConnectorContext.getToken() used by adapters to this package. Add
a BullMQ scheduled job that refreshes tokens ahead of expiry and flips the Connection to
EXPIRED on failure. Unit-test encrypt/decrypt round-trips and the near-expiry refresh path
with a mock vendor.
```

---

## Prompt 9 — Toast adapter

```
Implement packages/connectors/toast. Auth: Toast OAuth 2.0 client-credentials — exchange
clientId + clientSecret (userAccessType TOAST_MACHINE_CLIENT) for a bearer token; restaurants
are identified by GUID stored in Location.vendorRefs.TOAST. Implement listLocations,
getSalesSummary (map Toast Orders API — orders/checks/payments, bulk by date range — to
canonical SalesSummary; source="TOAST", document the `method`), getMenu (Toast Menus API:
items, modifiers, prices, availability), and getLaborSummary/getShifts (Toast Labor API:
employees + shifts). Reuse the core HTTP client, rate limiting, and telemetry. Note in the
README that multi-restaurant access requires Toast partner-program approval, and design for
token/access revocation. Test against sanitized Toast fixtures with reconciliation assertions,
including a mixed-estate test where get_sales_summary aggregates Toast + Square locations.
```

---

## Prompt 10 — 7shifts adapter (labor)

```
Implement packages/connectors/sevenshifts for labor/scheduling. Auth via 7shifts OAuth/API
token. Implement listLocations (7shifts locations mapped to canonical), getLaborSummary
(hours + labor cost, and laborPctOfSales when sales are available), and getShifts (scheduled/
worked shifts → canonical Shift). Also implement the optional write methods createShift/
updateShift behind capability advertising (they'll be gated by the guardrail engine later).
Reuse core. Test against sanitized fixtures. Confirm the MCP get_labor_summary and get_shifts
tools now return real data for a brand whose labor system is 7shifts even if its POS is Toast.
```

---

## Prompt 11 — Guardrail policy engine + write tools

```
packages/policy/src/guardrails.ts already contains the FINISHED balanced policy — an async,
fail-closed evaluateWriteAction(req, deps) with the PolicyDependencies interface, reason-code
Decisions, config validation, RBAC, per-tool financial caps, percentage price bands, an atomic
velocity reserve, and a confirmation-token protocol — plus guardrails.test.ts (20 passing
cases). Do NOT rewrite the policy logic or the tests. Your job is to WIRE IT to real infra.

Implement a concrete PolicyDependencies (packages/policy/src/deps.ts or in the mcp-server):
- getCurrentItemPriceCents → read via the location's connector (getMenu) with a short cache.
- resolveFinancialAmountCents → look up the true check/payment total via the connector; return
  null if it can't be resolved (the engine will DENY, which is correct).
- isLiveBrandLocation → check the Location table (live === true, belongs to brandId).
- reserveVelocitySlot → ATOMIC Redis INCR on key {brandId}:{tool}:{minute} with a 60s TTL;
  return false when the count would exceed limitPerMinute. Must be atomic (no check-then-act).
- getAgentRole → map the agent's token subject to a Role for the brand.
- consumeConfirmationToken → validate & single-use-consume a token from a short-TTL store,
  bound to computeActionFingerprint(); return false if missing/expired/mismatched.
- getShiftStartMs → resolve the shift start from the scheduling connector.

Then wire the MCP write tools (set_item_availability, update_item_price, create_shift,
update_shift; void_check/refund_payment present but DISABLED by default): each loads the
brand's BrandGuardrailConfig, calls evaluateWriteAction() BEFORE any vendor call, AUDITS the
decision.outcome + decision.code, and branches — DENIED → error; NEEDS_CONFIRMATION → return
the actionFingerprint to the human-approval flow; ALLOWED → execute via the connector using the
EXACT figures the policy judged, with an idempotency key so a retried call can't double-apply.

Build the human-approval path: an endpoint that, given a fingerprint + operator auth, mints a
one-time expiring confirmation token (bound to that fingerprint) which the agent then replays.
The token must be un-forgeable by the agent. Add a dashboard page to edit BrandGuardrailConfig
(enabled tools, allowed locations, price band, financial caps, min roles, lockout, velocity)
and to review/approve pending confirmations. Extend the test suite only to cover the new deps
and the approval endpoint; keep the existing guardrails.test.ts green.
```

---

## Prompt 12 — Reliability: health, rate limits, caching, degradation

```
Add production reliability across the platform. (1) Health monitoring: a scheduled job pings
each Connection's vendor, updates status HEALTHY/DEGRADED/EXPIRED, and surfaces it in the
dashboard; a public /health for the MCP tier. (2) Rate-limit management: a Redis token-bucket
per vendor per brand in the core HTTP client that queues/blocks rather than tripping vendor
limits. (3) Caching: cache slow-changing reads (menus, location lists) with short TTLs in
Redis, bust on relevant writes, and NEVER stale-cache money/labor beyond a couple of minutes.
(4) Graceful degradation: if one vendor is down, get_sales_summary/compare_locations still
return the reachable locations plus a clear canonical note about which are unavailable —
never fail the whole call because one POS is down. (5) Per-connector isolation so a down
Square can't take Toast offline. Add tests for the token bucket, cache-bust on write, and the
partial-estate degradation path. Emit OpenTelemetry spans (brand, tool, vendor, latency,
outcome) and describe an SLA dashboard tracking the 95%→99.9% uptime bar.
```

---

## Prompt 13 — Onboarding polish (the 30-minute bar)

```
Optimize the operator onboarding to reliably beat 30 minutes end-to-end. Add a guided
first-run checklist (create brand → connect first system → select locations → copy MCP URL →
run a first test query), inline help that translates every technical term into plain English
per the brand voice, sensible defaults (all discovered locations pre-checked, read tools on,
writes off), and a "Test connection" button that runs a real get_sales_summary and shows the
result so the operator sees value before leaving. Instrument time-to-first-successful-agent-
call and surface it internally. Add an E2E test (Playwright) that walks the whole flow with a
sandbox Square account and asserts it completes under the target.
```

---

## Prompt 14 — Billing, plans & usage metering

```
Add billing with Stripe. Implement the value ladder from the product doc: Basic ($299/mo per
brand, caps connected systems + locations), Pro ($499–$1,500/mo, all systems + locations +
write tools + priority support), and add-ons ($200–$800/mo for analytics/reporting +
premium support). Enforce plan limits in the control plane (e.g., Basic can't enable write
tools or exceed its location cap). Meter agent requests per brand and bill overage API usage
(~$0.01–$0.05/request) above plan limits — reuse the audit stream as the metering source of
truth. Add a billing page (plan, usage this period, upgrade). Keep enterprise ($15K–$50K
setup) as a manual/sales-assisted flow flagged in the admin. Test plan-limit enforcement and
usage aggregation.
```

---

## Prompt 15 — The free Assessment Tool (bait offer)

```
Build the free MCP Integration Assessment Tool as a public, no-login lead-gen page (the
"bait" offer). The operator picks their systems (Toast/Square/Clover/7shifts/OpenTable/etc.)
and number of locations; the tool visualizes what an AI agent could do once connected
(concrete example queries per selected system), estimates time/cost savings vs. custom
integration, and captures an email to start a Servvo trial. No real data pulled — it's an
illustrative estimator. Match the brand package visually. Track conversions. Keep the copy
plain-English and operator-first.
```

---

## Prompt 16 — Prove the moat: scaffold vertical #2

```
Demonstrate the ~40% reuse thesis by scaffolding a SECOND vertical (salons) on the existing
platform WITHOUT touching the reusable core. Add packages/canonical-salon (Appointment,
Service, Membership, Client, StaffSchedule types) and packages/connectors/{vagaro,booksy,
boulevard} implementing the same connector framework and registry. Add a vertical-tuned MCP
tool surface (get_appointments, get_service_sales, reschedule_appointment behind guardrails).
Reuse — with ZERO changes — control-plane, dashboard shell, agent-leg OAuth, connectors/core,
policy, audit, secrets, and db. Produce a short report at docs/REUSE-REPORT.md measuring
which files/packages were reused vs. net-new and the eng-hours delta vs. the restaurant build,
to validate the "months → weeks" claim.
```

---

## Cross-cutting prompts (use anytime)

**Security review**
```
Review the current diff for security issues specific to Servvo's threat model: agent-leg
OAuth 2.1 correctness (PKCE S256, RFC 9728/8707, WWW-Authenticate on 401), cross-brand
tenant isolation on every query and MCP tool, vendor-token custody (no plaintext tokens in DB
or logs, least-privilege scopes), guardrail bypasses on the write path, injection via agent-
supplied args, and PII/secret leakage in audit rows or error messages. Report only high-
confidence findings with the exact failing scenario.
```

**Add a new POS connector**
```
Add a <VENDOR> connector under packages/connectors/<vendor> implementing RestaurantConnector.
Follow the existing Square/Toast adapters exactly: thin adapter, reuse core HTTP client/rate-
limiting/telemetry, map to the canonical schema with documented source/method, advertise only
supported capabilities, and add sanitized-fixture reconciliation tests. Do not modify
canonical types or the MCP server unless a genuinely new field is required — if it is, propose
the canonical change first.
```

**Write reconciliation tests for an adapter**
```
For packages/connectors/<vendor>, capture representative sanitized responses as fixtures and
write reconciliation tests asserting each maps to the exact expected canonical object,
including edge cases: 86'd items, voided checks, multi-currency, missing cover counts, and
labor without matching sales. These tests are the trust layer — be thorough about money math.
```

**Verify end-to-end with a real agent**
```
Start the MCP server locally against the seeded demo brand, connect it as a Claude Desktop
MCP server using the config you generated, and drive these real queries end-to-end, reporting
what the agent received: "sales by location last week", "which location had the worst labor
percentage", "86 the branzino at Downtown" (should hit the guardrail), and "compare average
check across all locations". Confirm each produced an audit row.
```

---

## Suggested session order (recap)

| Session | Prompt | Phase |
|---------|--------|-------|
| 1 | 0 CLAUDE.md + 1 Scaffold | P1 |
| 2 | 2 DB + 3 Canonical | P1 |
| 3 | 4 Connector core + Square | P1 |
| 4 | 5 Audit + 6 MCP read tools | P1 (milestone: agent reads sales) |
| 5 | 7 Dashboard + 8 Secrets | P1/P2 |
| 6 | 9 Toast + 10 7shifts | P2 |
| 7 | 11 Guardrails + write tools | P2 |
| 8 | 12 Reliability + 13 Onboarding | P2 (milestone: pilot-ready, 95% uptime) |
| 9 | 14 Billing + 15 Assessment tool | P3 |
| 10 | 16 Vertical #2 + REUSE-REPORT | P4 (milestone: prove the moat) |

Between sessions: run tests, connect a real agent, and check the audit log. The product is
only "working" when an actual AI agent does something useful across locations — verify that,
not just green unit tests.
```
