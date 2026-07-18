# Servvo — Implementation Guide

**Scope:** v1 — restaurants, managed multi-tenant cloud, TypeScript/Node.
**Audience:** The engineer(s) building Servvo (you + Claude Code).
**Prereqs:** Familiarity with TypeScript, OAuth, and REST APIs. MCP knowledge helpful but this guide is self-contained.

---

## Table of contents

1. [System architecture](#1-system-architecture)
2. [The dual-OAuth topology (the core idea)](#2-the-dual-oauth-topology-the-core-idea)
3. [Tech stack & repo layout](#3-tech-stack--repo-layout)
4. [Data model](#4-data-model)
5. [The canonical restaurant schema](#5-the-canonical-restaurant-schema)
6. [The connector/adapter framework](#6-the-connectoradapter-framework)
7. [The MCP server (agent-facing)](#7-the-mcp-server-agent-facing)
8. [Token custody & secrets](#8-token-custody--secrets)
9. [The guardrail policy engine](#9-the-guardrail-policy-engine)
10. [Audit logging](#10-audit-logging)
11. [Multi-tenancy & isolation](#11-multi-tenancy--isolation)
12. [Reliability, rate limits & caching](#12-reliability-rate-limits--caching)
13. [Security & compliance](#13-security--compliance)
14. [Phased build plan](#14-phased-build-plan)
15. [Testing strategy](#15-testing-strategy)
16. [Deployment & infra](#16-deployment--infra)
17. [The 40% reuse checklist (for vertical #2)](#17-the-40-reuse-checklist-for-vertical-2)

---

## 1. System architecture

Three logical services, one platform:

```
┌───────────────────────────────────────────────────────────────────────┐
│                             SERVVO PLATFORM                             │
│                                                                         │
│  ┌───────────────────┐   ┌──────────────────┐   ┌───────────────────┐  │
│  │  DASHBOARD (web)  │   │  CONTROL PLANE   │   │   MCP SERVER      │  │
│  │  Next.js/React    │──▶│  API + jobs      │◀──│  remote MCP       │  │
│  │  operator UI      │   │  (Node/TS)       │   │  (Streamable HTTP)│  │
│  └───────────────────┘   └────────┬─────────┘   └─────────┬─────────┘  │
│                                    │                       │            │
│              ┌─────────────────────┼───────────────────────┘            │
│              ▼                     ▼                                     │
│      ┌──────────────┐     ┌────────────────┐    ┌──────────────────┐    │
│      │  Postgres    │     │ Secrets vault  │    │ Connector layer  │    │
│      │  (Prisma)    │     │ (KMS-encrypted │    │ Toast/Square/... │    │
│      │  tenants,    │     │  OAuth tokens) │    │ adapters +       │    │
│      │  audit, cfg  │     │                │    │ canonical map    │    │
│      └──────────────┘     └────────────────┘    └────────┬─────────┘    │
└──────────────────────────────────────────────────────────┼─────────────┘
                                                            │ OAuth (Servvo = client)
                              ┌─────────────┬───────────────┼──────────────┐
                              ▼             ▼               ▼              ▼
                          ┌───────┐    ┌────────┐     ┌────────┐     ┌────────┐
                          │ Toast │    │ Square │     │ Clover │     │7shifts │
                          └───────┘    └────────┘     └────────┘     └────────┘
```

- **Dashboard** — the only surface operators touch. Connect systems, pick locations, manage users, configure guardrails, view audit/usage, copy the MCP URL.
- **Control plane** — REST/RPC API + background jobs: OAuth flows, token refresh, location sync, health checks, billing, tenant management.
- **MCP server** — the remote MCP endpoint agents connect to. Translates MCP tool calls → canonical operations → vendor adapters, enforcing guardrails and writing audit.
- **Connector layer** — per-vendor adapters behind the canonical schema. This is where new POSs (and later, new verticals) plug in.

All three share Postgres, the encrypted secrets vault, and the connector layer, but
deploy and scale independently.

---

## 2. The dual-OAuth topology (the core idea)

**This is the concept most MCP tutorials miss and the thing Servvo must get right.**
There are *two independent OAuth relationships*, and Servvo sits in the middle of both:

### Leg 1 — Agent → Servvo (Servvo is the *resource server*)
An AI agent (Claude, a copilot) connects to Servvo's MCP endpoint. Per the current MCP
authorization spec, Servvo **must** behave as an **OAuth 2.1 resource server**:

- Streamable HTTP transport (the 2025-06-18 remote-server transport).
- OAuth 2.1 with **PKCE, S256 only** (plain PKCE is banned as of the Nov 2025 revision).
- Publish **OAuth 2.0 Protected Resource Metadata (RFC 9728)** so clients can discover the authorization server.
- Require the **resource parameter (RFC 8707)** in token requests so a token minted for another server can't be replayed against Servvo.
- Return `401` with a properly formatted **`WWW-Authenticate`** header pointing at the authorization server.
- Scope the issued token to a single **brand** (tenant).

You can either run your own authorization server or delegate to an IdP (e.g., Auth0,
WorkOS, Stytch, Clerk) that supports the MCP auth pattern. **Recommendation:** delegate
to a managed IdP for v1 — implementing a spec-compliant OAuth 2.1 AS yourself is a
security-critical distraction.

### Leg 2 — Servvo → POS vendors (Servvo is the *client*)
Separately, Servvo holds each brand's credentials to Toast/Square/Clover/7shifts and
acts as an **OAuth client** to them:

- **Toast** — OAuth 2.0 *client credentials* (exchange `clientId`+`clientSecret` with `userAccessType: TOAST_MACHINE_CLIENT` for a bearer token; restaurants identified by GUID). Requires Toast partner-program access for multi-restaurant scope.
- **Square** — OAuth 2.0 authorization-code flow; per-merchant access + refresh tokens; scoped permissions (ORDERS_READ, ITEMS_READ/WRITE, etc.).
- **Clover** — OAuth 2.0 per-merchant tokens.
- **7shifts** — OAuth 2.0 / API tokens for labor & scheduling.

Servvo stores these tokens encrypted, refreshes them on schedule, and never exposes
them to the agent. The agent only ever sees canonical tools.

```
 AGENT ──OAuth(Servvo as RESOURCE SERVER)──▶ SERVVO ──OAuth(Servvo as CLIENT)──▶ POS
   │                                            │                                  │
   │  token scoped to brandX                    │  brandX's Toast/Square tokens    │
   └── can only reach brandX's tools ───────────┴── never seen by the agent ───────┘
```

**Security invariant:** the agent's token authorizes *which brand and which tools*; the
POS tokens authorize *what Servvo can do at the vendor*. A compromised agent token can
never exceed the brand's guardrails, and never touches raw vendor credentials.

---

## 3. Tech stack & repo layout

| Layer | Choice | Why |
|-------|--------|-----|
| Language | **TypeScript (Node 20+)** | One language across control plane, connectors, MCP server, dashboard |
| MCP | **`@modelcontextprotocol/sdk`** | Official SDK; Streamable HTTP + auth helpers |
| Dashboard | **Next.js (App Router) + React** | Fast, well-supported, deploy anywhere |
| API | **Next.js route handlers** (or a small **Fastify** service for the control plane) | Keep it simple; split out if load demands |
| DB | **Postgres + Prisma** | Relational fit for tenants/connections/audit; typed access |
| Cache/queue | **Redis** (Upstash) + **BullMQ** | Token refresh, sync jobs, rate-limit smoothing |
| Secrets | **Cloud KMS + envelope encryption** (AWS KMS / GCP KMS) or a managed vault | Encrypt POS tokens at rest |
| Auth (agent leg) | **Managed IdP** (WorkOS / Stytch / Auth0) with MCP OAuth support | Don't hand-roll OAuth 2.1 AS |
| Auth (dashboard) | Clerk / Auth.js | Operator login |
| Hosting | **Fly.io / Cloudflare / Vercel** (dashboard on Vercel; MCP + control plane on Fly/Cloudflare for long-lived connections) | Streamable HTTP wants persistent-ish compute |
| Observability | OpenTelemetry + a log/APM (Axiom, Datadog, or Grafana) | SLA monitoring, the 95% uptime bar |

### Monorepo layout (pnpm workspaces or Turborepo)
```
servvo/
├─ apps/
│  ├─ dashboard/            # Next.js operator UI
│  ├─ mcp-server/           # remote MCP endpoint (Streamable HTTP)
│  └─ control-plane/        # API + background jobs (OAuth, sync, health)
├─ packages/
│  ├─ canonical/            # canonical restaurant schema (zod types)
│  ├─ connectors/           # adapter framework + per-vendor adapters
│  │  ├─ core/              #   Connector interface, registry, http client
│  │  ├─ toast/
│  │  ├─ square/
│  │  ├─ clover/
│  │  └─ sevenshifts/
│  ├─ policy/               # guardrail policy engine  ← your contribution
│  ├─ audit/                # audit log writer + query
│  ├─ secrets/              # token custody (encrypt/decrypt/refresh)
│  └─ db/                   # Prisma schema + client
├─ prisma/
│  └─ schema.prisma
└─ docs/
```

---

## 4. Data model

Core Prisma models (abbreviated):

```prisma
model Operator {           // the account holder (may own several brands)
  id        String   @id @default(cuid())
  email     String   @unique
  brands    Brand[]
  createdAt DateTime @default(now())
}

model Brand {              // a chain / tenant — the unit of billing & isolation
  id          String       @id @default(cuid())
  operatorId  String
  operator    Operator     @relation(fields: [operatorId], references: [id])
  name        String
  plan        Plan         @default(BASIC)
  mcpClientId String       @unique          // agent-leg OAuth client
  connections Connection[]
  locations   Location[]
  policies    Policy[]
  auditLogs   AuditLog[]
  createdAt   DateTime     @default(now())
}

model Connection {         // one connected vendor system for a brand
  id         String   @id @default(cuid())
  brandId    String
  brand      Brand    @relation(fields: [brandId], references: [id])
  vendor     Vendor                            // TOAST | SQUARE | CLOVER | SEVENSHIFTS
  status     ConnStatus @default(PENDING)      // PENDING|HEALTHY|DEGRADED|EXPIRED
  secretRef  String                            // pointer into secrets vault (NOT the token)
  scopes     String[]
  lastSyncAt DateTime?
  createdAt  DateTime @default(now())
}

model Location {           // a store; maps a brand location to vendor-specific ids
  id           String  @id @default(cuid())
  brandId      String
  brand        Brand   @relation(fields: [brandId], references: [id])
  name         String
  live         Boolean @default(false)         // did the operator switch it on?
  vendorRefs   Json                            // { TOAST: "guid", SQUARE: "loc_id" }
}

model Policy {             // guardrail config per brand (see §9)
  id        String  @id @default(cuid())
  brandId   String
  brand     Brand   @relation(fields: [brandId], references: [id])
  rules     Json                                // serialized guardrail rules
  updatedAt DateTime @updatedAt
}

model AuditLog {           // immutable record of every agent action (see §10)
  id         String   @id @default(cuid())
  brandId    String
  brand      Brand    @relation(fields: [brandId], references: [id])
  agentSub   String                            // subject from the agent's token
  tool       String
  args       Json
  locationId String?
  outcome    Outcome                           // ALLOWED|DENIED|ERROR
  reason     String?
  result     Json?
  latencyMs  Int?
  createdAt  DateTime @default(now())
}
```

---

## 5. The canonical restaurant schema

**The most important design decision in the codebase.** Every vendor's data is
normalized into these types so the agent sees one consistent world. Adapters translate;
the MCP server and everything above it only speak canonical.

```ts
// packages/canonical/src/index.ts
import { z } from "zod";

export const Money = z.object({
  amount: z.number().int(),      // minor units (cents) — never floats for money
  currency: z.string().length(3) // ISO 4217
});

export const Location = z.object({
  id: z.string(),                // Servvo canonical id
  name: z.string(),
  timezone: z.string(),
  vendor: z.enum(["TOAST","SQUARE","CLOVER","SEVENSHIFTS"])
});

export const SalesSummary = z.object({
  locationId: z.string(),
  periodStart: z.string(),       // ISO
  periodEnd: z.string(),
  netSales: Money,
  grossSales: Money,
  checkCount: z.number().int(),
  coverCount: z.number().int().nullable(),
  averageCheck: Money,
  source: z.enum(["TOAST","SQUARE","CLOVER"]),
  method: z.string()             // how it was computed — surfaced for trust
});

export const MenuItem = z.object({
  id: z.string(),
  name: z.string(),
  price: Money,
  available: z.boolean(),        // false === 86'd
  modifiers: z.array(z.object({ name: z.string(), price: Money })).optional()
});

export const LaborSummary = z.object({
  locationId: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  totalHours: z.number(),
  laborCost: Money,
  laborPctOfSales: z.number().nullable()
});

export const Shift = z.object({
  id: z.string(),
  locationId: z.string(),
  employeeName: z.string(),
  start: z.string(),
  end: z.string(),
  role: z.string().optional()
});

export type SalesSummary = z.infer<typeof SalesSummary>;
// ...etc
```

### Normalization rules are documented, not implicit
Because Toast and Square compute "net sales" differently, each adapter must document
*exactly* how it produces each canonical field, and set `source`/`method`. When an agent
compares two locations on different POSs, Servvo can disclose the method so the operator
trusts the number. **Reconciliation tests** (see §15) assert that known vendor fixtures
map to expected canonical values.

---

## 6. The connector/adapter framework

Every vendor implements one interface. This is the seam that makes the 40% reuse real.

```ts
// packages/connectors/core/src/connector.ts
import type { SalesSummary, MenuItem, LaborSummary, Shift, Location } from "@servvo/canonical";

export interface ConnectorContext {
  brandId: string;
  locationId?: string;
  /** returns a fresh, decrypted vendor access token; handles refresh transparently */
  getToken: () => Promise<string>;
  /** vendor-specific ids for this brand/location, e.g. Toast GUID */
  vendorRefs: Record<string, string>;
}

export interface RestaurantConnector {
  readonly vendor: "TOAST" | "SQUARE" | "CLOVER" | "SEVENSHIFTS";

  // ---- reads (v1) ----
  listLocations(ctx: ConnectorContext): Promise<Location[]>;
  getSalesSummary(ctx: ConnectorContext, range: DateRange): Promise<SalesSummary>;
  getMenu(ctx: ConnectorContext): Promise<MenuItem[]>;
  getLaborSummary?(ctx: ConnectorContext, range: DateRange): Promise<LaborSummary>;
  getShifts?(ctx: ConnectorContext, range: DateRange): Promise<Shift[]>;

  // ---- writes (guardrailed, opt-in) ----
  setItemAvailability?(ctx: ConnectorContext, itemId: string, available: boolean): Promise<void>;
  updateItemPrice?(ctx: ConnectorContext, itemId: string, price: Money): Promise<void>;
}
```

- **Capability discovery:** optional methods let the framework advertise only the tools a
  connected vendor actually supports. If a brand has no labor system, `get_labor_summary`
  isn't exposed.
- **Registry:** `packages/connectors/core/registry.ts` maps `Vendor → RestaurantConnector`.
- **Shared HTTP client:** retries, timeouts, rate-limit handling, and telemetry live in
  `core` so every adapter inherits them (this is a big chunk of the reusable 40%).
- **Adapters are thin.** Toast's adapter knows Toast's endpoints, auth header shape, GUID
  handling, and field mapping — nothing about MCP, tenancy, or guardrails.

**Aggregation** (across a mixed estate) happens *above* the connector: the MCP tool
`get_sales_summary` fans out to each live location's connector and merges canonical
results. The agent asked one question; Servvo hit Toast for 8 stores and Square for 4.

---

## 7. The MCP server (agent-facing)

Built on `@modelcontextprotocol/sdk` with the Streamable HTTP transport.

```ts
// apps/mcp-server/src/server.ts (sketch)
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";
import { resolveBrand, aggregateSales } from "./lib";
import { evaluateWriteAction } from "@servvo/policy";
import { audit } from "@servvo/audit";

export function buildServer(brandId: string) {
  const server = new McpServer({ name: "servvo", version: "1.0.0" });

  server.tool(
    "get_sales_summary",
    "Net/gross sales, check and cover counts, and average check for one or more of the "
      + "brand's locations over a date range. Returns canonical figures with the source POS "
      + "and computation method for each location.",
    {
      locationIds: z.array(z.string()).optional().describe("Omit for all live locations"),
      start: z.string().describe("ISO date, inclusive"),
      end: z.string().describe("ISO date, inclusive")
    },
    async (args, { authInfo }) => {
      const data = await aggregateSales(brandId, args);
      await audit({ brandId, agentSub: authInfo.sub, tool: "get_sales_summary", args, outcome: "ALLOWED", result: data });
      return { content: [{ type: "text", text: JSON.stringify(data) }] };
    }
  );

  server.tool(
    "set_item_availability",
    "86 (make unavailable) or un-86 a menu item at a location. This is a WRITE action and "
      + "is subject to the brand's guardrail policy; it may require confirmation or be denied.",
    {
      locationId: z.string(),
      itemId: z.string(),
      available: z.boolean()
    },
    async (args, { authInfo }) => {
      // `policyDeps` wires the engine to trusted infra (current price, resolved
      // financial amounts, live-location check, atomic velocity, agent role,
      // confirmation-token consumption). The agent's args are never trusted for amounts.
      const decision = await evaluateWriteAction(
        { brandId, agentSub: authInfo.sub, tool: "set_item_availability", args,
          config: await loadGuardrailConfig(brandId), confirmationToken: args.confirmationToken },
        policyDeps
      );
      await audit({ brandId, agentSub: authInfo.sub, tool: "set_item_availability", args,
        outcome: decision.outcome, reason: "reason" in decision ? decision.reason : undefined,
        code: decision.code });

      if (decision.outcome === "DENIED")
        return { content: [{ type: "text", text: `Blocked by policy (${decision.code}): ${decision.reason}` }], isError: true };
      if (decision.outcome === "NEEDS_CONFIRMATION")
        // Hand the fingerprint to the human-approval flow; a valid one-time token
        // returns here on the agent's retry and satisfies the gate.
        return { content: [{ type: "text", text: `Needs confirmation (${decision.code}): ${decision.reason}` }], isError: true };

      // ALLOWED — perform via connector with the exact figures the policy judged ...
      return { content: [{ type: "text", text: "Item availability updated." }] };
    }
  );

  return server;
}
```

Key points:
- **Per-brand server instance** keyed off the authenticated token's brand claim.
- **Tools are self-describing** — verbose, example-rich descriptions and typed args so
  the LLM calls them correctly. The tool surface *is* the UX.
- **Guardrails run server-side** on every write, before any vendor call. The engine is
  **async and effect-aware** — it resolves the *real* price/amount via injected deps, so the
  agent can't understate a write. Never trust the agent.
- **Every call is audited** with its machine-readable `code`, allowed or denied.
- **Resources** (e.g., `brand://profile`, `menu://{location}`) expose readable context that
  agents can attach without a tool call.

---

## 8. Token custody & secrets

- POS tokens are **never** stored in the app DB in plaintext. Store an encrypted blob
  (envelope encryption with a per-brand data key wrapped by cloud KMS) in the secrets
  package; the DB holds only a `secretRef`.
- **Refresh** runs as a BullMQ job ahead of expiry; on failure the connection flips to
  `EXPIRED` and the dashboard shows "reconnect."
- **Least privilege:** request the narrowest vendor scopes that satisfy the enabled tools
  (e.g., don't request payment-write scope if refunds are disabled for the brand).
- **Rotation & revocation:** support one-click disconnect that revokes at the vendor and
  purges the secret.

---

## 9. The guardrail policy engine

**This is the security heart of the write path.** The engine takes a proposed write and
returns `ALLOWED` / `DENIED` / `NEEDS_CONFIRMATION` (each with a machine-readable
`DecisionCode`), enforced server-side before any vendor call. It ships the **balanced
posture** in [`packages/policy/src/guardrails.ts`](../packages/policy/src/guardrails.ts)
(`BALANCED_DEFAULT_CONFIG` + `evaluateWriteAction()`) and is covered by
[`guardrails.test.ts`](../packages/policy/src/guardrails.test.ts) — 20 cases including a
regression for every hole found in review.

**The engine is async and effect-aware.** It does *not* trust the agent's args for anything
that matters; it resolves the truth through injected `PolicyDependencies` and **fails
closed** when it can't:

| Concern | How it's enforced (not trusted from args) |
|---------|-------------------------------------------|
| Price change magnitude | `getCurrentItemPriceCents()` → judged as a **% band + absolute floor**, not the raw new price. Unverifiable → `NEEDS_CONFIRMATION`. |
| Financial amount (void/refund) | `resolveFinancialAmountCents()` returns the **true** amount server-side; unresolved → `DENIED`. Above the per-tool cap → `DENIED`; otherwise **always** `NEEDS_CONFIRMATION`. |
| Location | `isLiveBrandLocation()` — an empty allow-list still requires a real live location of *this* brand (never "any string"). |
| Role | `getAgentRole()` vs. `minimumRoleByTool` — enforces the RBAC the product promises. |
| Velocity | `reserveVelocitySlot()` — an **atomic** reserve (Redis), not a passed-in count, so there's no check-then-act race. |
| Confirmation | A server-minted, one-time, expiring token bound to the action's `computeActionFingerprint()`. The agent **cannot** forge a boolean to self-approve; hard denials are never bypassable by a token. |
| Config | `validateConfig()` rejects `NaN`/negative/zero values up front, so a bad config can't silently disable a gate. |

Design decisions the posture encodes:
- **Read-only by default**; writes opt-in per tool per brand; financial reversals ship off.
- **Sensitivity tiers** — LOW (86 an item) flows; MEDIUM (price/shift) gated by band/lockout;
  HIGH (void/refund) never auto-executes.
- **Missing/malformed input is a denial, not a default** — no `?? 0`.

---

## 10. Audit logging

- **Append-only.** Every tool call writes one `AuditLog` row: brand, agent subject, tool,
  args, location, outcome (ALLOWED/DENIED/ERROR), reason, result summary, latency.
- **Tamper-evidence** (optional, for enterprise/SOC 2): hash-chain rows so any edit is
  detectable.
- **Operator-visible.** The dashboard renders the log ("your AI agent 86'd branzino at
  Downtown at 7:14pm"). This is a *trust feature*, not just compliance — it's how Marcus
  sleeps at night after enabling writes.
- **Feeds analytics** — the same stream powers the usage/analytics add-on and Servvo's own
  SLA dashboards.

---

## 11. Multi-tenancy & isolation

- **Brand = tenant = isolation boundary.** Every query is scoped by `brandId`; enforce it
  in a data-access layer, not ad hoc. Consider Postgres Row-Level Security as defense in depth.
- **Token isolation:** an agent token's brand claim is the *only* brand it can reach; the
  MCP server refuses cross-brand access even if a location id from another brand is passed.
- **Noisy-neighbor protection:** per-brand rate limits and queue quotas so one brand's
  agent can't exhaust shared vendor-API budget.
- **Enterprise path (later):** the hybrid option — dedicated isolated MCP instances for the
  $15K–$50K tier — reuses all the same packages, just deployed per-brand.

---

## 12. Reliability, rate limits & caching

- **95% pilot uptime → 99.9% GA.** Health-check each connection on a schedule; expose
  green/amber/red. A down Square must not take Toast offline (per-connector isolation).
- **Rate-limit management:** central token-bucket per vendor per brand in Redis; the shared
  HTTP client blocks/queues rather than letting agents trip vendor limits.
- **Caching:** cache slow-changing data (menus, location lists) with short TTLs; never cache
  money/labor freshness-critical reads beyond a few minutes; always cache-bust on writes.
- **Graceful degradation:** if a vendor is down, return a clear canonical error the agent
  can relay ("Square is unavailable for 4 locations; here are the 8 on Toast").
- **Idempotency:** write tools take/derive idempotency keys so a retried agent call can't
  double-apply.

---

## 13. Security & compliance

| Area | Practice |
|------|----------|
| **Agent auth** | OAuth 2.1 + PKCE (S256), RFC 9728 metadata, RFC 8707 resource indicators, correct `WWW-Authenticate` on 401 |
| **Vendor tokens** | KMS envelope encryption, `secretRef` indirection, least-privilege scopes, scheduled refresh, revoke-on-disconnect |
| **Writes** | Server-side guardrails, read-only default, confirmations/thresholds, idempotency, financial actions off by default |
| **Audit** | Append-only, operator-visible, optional hash-chain |
| **Tenancy** | Strict `brandId` scoping + RLS defense-in-depth |
| **Transport** | TLS everywhere; no tokens in URLs/logs |
| **Compliance path** | SOC 2 Type II roadmap; data-processing agreements; PCI awareness (Servvo should avoid touching raw PAN — rely on vendor APIs, never card data) |
| **Vendor ToS** | Respect each POS's partner terms; apply to partner programs; never scrape; design for access revocation |
| **Privacy** | Guest/customer PII minimization; retention limits; region-aware storage |

---

## 14. Phased build plan

### Phase 0 — Discovery (weeks 0–3, parallel to setup)
- 12 operator interviews → confirm the common stack (hypothesis: Toast + Square + 7shifts).
- Lock canonical schema v1 from real report needs.
- Apply to Toast/Square partner programs (long lead time).

### Phase 1 — MVP skeleton (weeks 2–6)
1. Monorepo + Prisma schema + Postgres.
2. Dashboard: operator auth, create brand, "Connect Square" (auth-code OAuth is easiest to start), location sync + select.
3. `packages/canonical` v1; `packages/connectors/core` + **Square adapter** (reads).
4. `apps/mcp-server`: Streamable HTTP + IdP-backed OAuth resource-server; expose `list_locations`, `get_sales_summary`, `get_menu` (read-only).
5. `packages/audit`: log every call.
6. **Milestone:** connect Claude Desktop to a test brand and ask "sales by location last week."

### Phase 2 — Pilot-ready (weeks 6–18)
7. **Toast adapter** (client-credentials + GUIDs; partner access) and **7shifts** (labor).
8. `packages/policy` guardrail engine + write tools (`set_item_availability`, `update_item_price`) behind it.
9. Health monitoring, token refresh jobs, rate-limit buckets, caching.
10. Onboarding polish → **<30-min setup**; connection-health UI; reconnect flow.
11. **Clover adapter** if interviews demand it.
12. **Milestone:** 5 pilot brands, **95% uptime**, real agent usage, 1 case study.

### Phase 3 — GA restaurants (months 5–8)
13. Billing/plans (Basic/Pro/add-ons), usage metering for API fees.
14. Free **Assessment Tool** (bait offer).
15. Analytics/reporting add-on (scheduled pushes).
16. SOC 2 path; consultant white-label mode.

### Phase 4 — Vertical #2 (months 8–12)
17. Salons *or* fitness on the same platform; measure actual reuse; second case study.

---

## 15. Testing strategy

- **Adapter unit tests against fixtures.** Capture real (sanitized) vendor responses;
  assert they map to expected canonical objects. This is where **reconciliation** lives
  ("Toast fixture X → netSales = $Y").
- **Contract tests** — every connector satisfies the `RestaurantConnector` interface and
  capability advertising.
- **Guardrail tests** — table-driven cases over the policy engine (the highest-value tests;
  a guardrail bug is a financial incident). Include deny, allow, threshold, and confirmation paths.
- **MCP integration tests** — spin the server, connect a test MCP client, assert tool
  schemas, auth rejection (401 + `WWW-Authenticate`), cross-brand denial, and audit rows.
- **E2E onboarding test** — scripted "connect → select → first successful agent call" under
  the 30-minute bar.
- **Sandbox vendor accounts** — use Square/Toast sandboxes; never test against live brands.
- **Load/rate-limit tests** — confirm the token buckets protect vendor limits.

---

## 16. Deployment & infra

- **Dashboard** → Vercel (or Cloudflare Pages).
- **MCP server + control plane** → Fly.io or Cloudflare (need steady compute for Streamable
  HTTP sessions and background jobs). Autoscale the MCP tier by connection count.
- **Postgres** → Neon / Supabase / RDS. **Redis** → Upstash.
- **Secrets** → cloud KMS; app holds only wrapped keys.
- **CI/CD** → GitHub Actions: typecheck, adapter fixture tests, guardrail tests, Prisma
  migrate, preview deploys.
- **Observability** → OpenTelemetry traces on every tool call (brand, tool, vendor, latency,
  outcome) → APM; SLA dashboard tracking the 95%/99.9% uptime bar.
- **Environments** → dev / staging (vendor sandboxes) / prod (real partner creds).

---

## 17. The 40% reuse checklist (for vertical #2)

When you open salons or fitness, these are **reused as-is** (the compounding moat):

- [x] Control plane (OAuth flows, jobs, health, billing, tenancy)
- [x] Dashboard shell (connect flow, location select, users, audit view, guardrail config)
- [x] Agent-leg OAuth resource server + IdP integration
- [x] `packages/connectors/core` (HTTP client, retries, rate limits, registry, telemetry)
- [x] `packages/policy` guardrail engine
- [x] `packages/audit`, `packages/secrets`, `packages/db` core
- [x] MCP server framework (tool registration, auth, audit wiring)

What's **new per vertical** (the other ~60%):
- [ ] Vertical-tuned canonical schema (e.g., `Appointment`, `Membership` instead of `Check`, `Menu`)
- [ ] New vendor adapters (Vagaro/Booksy/Boulevard or Mindbody/Mariana Tek/Glofox)
- [ ] Vertical tool surface + descriptions
- [ ] Vertical guardrail defaults

Measure it: track eng-hours on vertical #2 vs. #1. The thesis says weeks, not months —
prove it, and it becomes the fundraising and moat story.

---

## The guardrail decision — balanced posture (implemented)

The **`evaluateWriteAction()`** policy in
[`packages/policy/src/guardrails.ts`](../packages/policy/src/guardrails.ts) is implemented
with Servvo's **balanced** posture and defaults (`BALANCED_DEFAULT_CONFIG`):

- **Read-only by default**; only `set_item_availability`, `update_item_price`,
  `create_shift`, `update_shift` are enabled out of the box. **Financial reversals
  (`void_check`/`refund_payment`) are off** until a brand explicitly enables them.
- **LOW** actions (86 an item) flow freely — the audit log is the safety net.
- **MEDIUM** price changes auto-approve under a **$5.00** threshold and otherwise return
  `NEEDS_CONFIRMATION`; shift changes (reversible, no dollar amount) pass.
- **HIGH** financial actions **never auto-execute** — always `NEEDS_CONFIRMATION` under the
  **$50.00** cap, `DENIED` above it.
- Plus a per-location allow-list and a **30 writes/min** velocity cap.

Each branch documents the trade-off (safer vs. looser) inline, so shifting posture is a
matter of editing `BALANCED_DEFAULT_CONFIG` and the branch behavior. Next step is the
table-driven test suite (Prompt 11), which will encode these same cases in the repo.
