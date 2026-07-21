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

```bash
pnpm install                      # install workspace
docker compose up -d              # postgres :5432 + redis :6379
cp .env.example .env              # then fill in (sandbox creds only)

pnpm typecheck                    # all packages (turbo)
pnpm test                         # all packages
pnpm build
pnpm --filter @servvo/policy test # the guardrail suite specifically

pnpm db:generate                  # prisma client
pnpm db:migrate                   # dev migration
pnpm db:seed                      # demo brand (mixed Toast+Square estate)

pnpm --filter @servvo/dashboard dev      # :3000
pnpm --filter @servvo/mcp-server dev     # :8787
pnpm --filter @servvo/control-plane dev  # :8788

npx astryx build "<screen idea>"  # ALWAYS before writing UI — see servvo-ui-design skill
```

## Design

All UI follows `.claude/skills/servvo-ui-design/SKILL.md` — Astryx components, frame-first
layout, rows-not-cards, tokens only (no raw hex/px), and an explicit anti-slop gate.
Brand colors live in the Astryx theme, never in components. Note: **Ember fills take
Slate Ink labels, not white** (white-on-Ember fails WCAG AA at 3.12).

## Testing

- Adapters: sanitized vendor fixtures + reconciliation assertions (money math exact).
- Policy: table-driven; every branch needs deny + allow cases; the exploit
  regressions in `packages/policy/src/guardrails.test.ts` must stay green.
- MCP: integration tests for schemas, 401 + `WWW-Authenticate`, cross-brand denial.
- End-to-end: verify with a real MCP client (Claude Desktop) against the seeded demo
  brand — green unit tests alone don't count as "working."

<!-- ASTRYX:START -->
Astryx v0.1.7 · 150 components
CLI: run every command as `npx astryx <cmd>` (shown below as `astryx ...`).

SETUP (once, in your app entry e.g. main.tsx) — without these, components render unstyled:
  import "@astryxdesign/core/reset.css";
  import "@astryxdesign/core/astryx.css";

WORKFLOW — discover, don't guess. Before writing UI:
1. `astryx build "<idea>"` — START HERE: returns a kit (closest [page] + [block]s + [component]s). No args = full playbook.
2. `astryx template <name> [--skeleton]` — scaffold the [page]/[block]s it named, or study their layout. Templates are reference code.
3. `astryx component <Name>` — props + examples for every component you use.

RULES:
- No <div> — components do all layout/spacing. Full page → AppShell; sidebar nav → SideNav.
- Frame first: pick the shell (AppShell / Layout+LayoutPanel) and budget regions in px BEFORE writing content (`astryx docs layout`).
- Dense data = rows (Table, List/Item) edge-to-edge — never Card-wrapped list items. Card = dashboard widgets, galleries, settings groups only.
- Status → StatusDot/Token; Badge only for counts and enumerated states, never decoration.
- Custom styling: component props first; else style/className with tokens — var(--color-*|--spacing-*|--radius-*). No raw hex/px. (No StyleX/Tailwind compiler here — don't use xstyle/utility classes.)
- Tokens for every value (`astryx docs tokens`). Brand/accent via `astryx theme` — never override --color-* in :root.
- SELF-CHECK before you finish: re-read the file and replace any raw <div>/<span> layout, imported .css/@apply, or hardcoded value (#hex, 16px) with the component or a token (var(--color-*|--spacing-*|…)). If unsure a component/prop exists, run `astryx component <Name>` / `astryx search "<thing>"`; don't hand-roll CSS.

MORE CLI:
  search "<query>"   find any component / hook / doc / template / block
  component --list   150 components by category
  template --list    page + block recipes
  docs <topic>       color, elevation, icons, illustrations, internationalization, layout, migration, motion, principles, shape, spacing, styling, theme, tokens, typography
  swizzle <Name>     eject component source for deep customization
  upgrade --apply    run after any @astryxdesign/core bump
<!-- ASTRYX:END -->
