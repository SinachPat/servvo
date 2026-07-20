# CLAUDE.md — Servvo

## Project

Servvo — done-for-you MCP (Model Context Protocol) connectors for multi-location
restaurants. A managed, multi-tenant **remote MCP server**: operators connect their
POS/scheduling systems (Toast, Square, Clover, 7shifts) in a dashboard, pick locations,
and any MCP-compatible AI agent gets guardrailed read/write access across their whole
estate. Full context: [docs/01-PRODUCT.md](docs/01-PRODUCT.md) (product),
[docs/03-IMPLEMENTATION.md](docs/03-IMPLEMENTATION.md) (architecture),
[docs/04-CLAUDE-CODE-PROMPTS.md](docs/04-CLAUDE-CODE-PROMPTS.md) (build sequence).

## Architecture (dual-OAuth — the core concept)

1. **Agent → Servvo:** Servvo is an OAuth 2.1 **resource server** for the remote MCP
   endpoint. Streamable HTTP transport; PKCE S256 only; RFC 9728 protected-resource
   metadata; RFC 8707 resource indicators; correct `WWW-Authenticate` on 401. The
   authorization server is delegated to a managed IdP.
2. **Servvo → POS vendors:** Servvo is an OAuth **client** holding each brand's vendor
   tokens (KMS envelope-encrypted, auto-refreshed, never exposed to the agent).
   Toast uses client-credentials (`TOAST_MACHINE_CLIENT`, restaurant GUIDs, partner
   program required for multi-restaurant); Square/Clover use per-merchant
   authorization-code OAuth; 7shifts covers labor.

## Stack

TypeScript / Node 20+, pnpm + Turborepo monorepo. MCP: `@modelcontextprotocol/sdk`.
Dashboard: Next.js App Router. DB: Postgres + Prisma. Cache/queue: Redis + BullMQ.
Secrets: cloud KMS envelope encryption. Deploy: dashboard → Vercel; MCP + control
plane → Fly.io/Cloudflare.

Monorepo: `apps/{dashboard,mcp-server,control-plane}`,
`packages/{canonical,connectors/{core,toast,square,clover,sevenshifts},policy,audit,secrets,db}`.

## Core principles (do not violate)

- **Canonical boundary:** everything above the adapters speaks the canonical schema in
  `packages/canonical`; per-vendor adapters are thin translators. This boundary is the
  ~40%-reuse moat for future verticals — protect it.
- **The MCP tool surface is the UX:** verbose self-describing descriptions + zod-typed
  args so an LLM calls tools correctly first try.
- **Writes are read-only by default** and always pass `evaluateWriteAction()` in
  `packages/policy` (fail-closed, effect-aware, async) before any vendor call. Never
  trust agent args for amounts — resolve truth via `PolicyDependencies`. Financial
  reversals never auto-execute. See `.claude/skills/guardrail-policy/SKILL.md`.
- **Every tool call writes an audit row** (outcome + machine-readable DecisionCode).
- **Strict per-brand tenant isolation** on every query; brand claim from the agent
  token is the only brand reachable.
- **Money is integer minor units (cents) + ISO 4217 currency. Never floats.**
- Vendor sandboxes only in dev/test; never test against live brands; never commit
  real credentials.

## Skills

Project skills in `.claude/skills/` — use them when the task matches:
`add-connector`, `mcp-tool-design`, `guardrail-policy`, `canonical-schema`,
`servvo-brand`, `servvo-security-review`, `verify-agent-e2e`.

## Commands

_To be filled in once the monorepo is scaffolded (Prompt 1)._ Expected:
`pnpm build | test | lint | typecheck` via turbo; `pnpm --filter @servvo/policy test`
for the guardrail suite.

## Testing

- Adapters: sanitized vendor fixtures + reconciliation assertions (money math exact).
- Policy: table-driven; every branch needs deny + allow cases; the exploit
  regressions in `packages/policy/src/guardrails.test.ts` must stay green.
- MCP: integration tests for schemas, 401 + `WWW-Authenticate`, cross-brand denial.
- End-to-end: verify with a real MCP client (Claude Desktop) against the seeded demo
  brand — green unit tests alone don't count as "working."
