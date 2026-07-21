# Servvo

**Pre-built AI connectors (MCP servers) for multi-location restaurants.**

Servvo ships pre-configured Model Context Protocol connectors that let AI agents
read and act on the software a restaurant chain already runs — Toast, Square,
Clover, 7shifts — without developer retainers or months of custom integration
work. A multi-unit operator links their POS, selects which locations go live, and
gets working AI access to sales, menus, inventory, labor, and reservations in
under 30 minutes.

> **Positioning:** *AI that speaks restaurant. Connect once, run every location.*

---

## The one-paragraph pitch

Franchise and multi-unit restaurant owners have heard the AI pitch. The catch
shows up when they ask what it takes: POS, scheduling, inventory, and reservation
data each sit in their own system, built before AI agents existed. Connecting them
means developer retainers and months of custom work — a bill past what a chain
will spend. Servvo closes that gap with turnkey connectors built on the open MCP
standard, so the AI layer a chain adopts today (or tomorrow) can pull a nightly
sales report, rebook a shift, or flag a menu item running low across 40 locations
without anyone writing an integration.

---

## Documents in this repo

### Core

| # | Document | What it covers |
|---|----------|----------------|
| 1 | [Product Document](docs/01-PRODUCT.md) | Vision, problem, market, personas, full product spec, business model, pricing, GTM, risks, roadmap, metrics |
| 2 | [Brand Package](docs/02-BRAND.md) | Name rationale, positioning, logo concepts, color system, typography, voice, taglines, visual guidelines, AI image prompts |
| 3 | [Implementation Guide](docs/03-IMPLEMENTATION.md) | Architecture, dual-OAuth topology, canonical schema, connector framework, guardrails, security, phased build plan, testing, deployment |
| 4 | [Claude Code Prompts](docs/04-CLAUDE-CODE-PROMPTS.md) | Copy-paste prompts to build Servvo phase-by-phase with Claude Code |

### Execution

| # | Document | What it covers |
|---|----------|----------------|
| 5 | [Discovery Interviews](docs/05-DISCOVERY-INTERVIEWS.md) | The 12-operator interview guide that decides the v1 connector set and validates pricing — with scoring rubric and go/no-go gates |
| 6 | [Pilot Playbook](docs/06-PILOT-PLAYBOOK.md) | The 90-day pilot: offer terms, recruitment, the 30-minute onboarding runbook, weekly cadence, incident protocol, day-90 gate |
| 7 | [GTM Playbook](docs/07-GTM-PLAYBOOK.md) | Consultant partner program, conference demo, content engine, outbound templates, battlecards, funnel targets |
| 8 | [Landing Page](docs/08-LANDING-PAGE.md) | Final-draft copy + wireframe blocks for the marketing site, in brand voice, with SEO meta |
| 9 | [Security & Trust](docs/09-SECURITY-TRUST.md) | Internal security posture + the public trust-page source: data handling, guardrails, compliance roadmap, incident response, sales FAQ |
| 10 | [Vendor Partnerships](docs/10-VENDOR-PARTNERSHIPS.md) | Toast/Square/Clover/7shifts API access models, scopes, application packet, status tracker, risk register |

### Working code & project memory

- [`CLAUDE.md`](CLAUDE.md) — project memory loaded by every Claude Code session
- [`.claude/skills/`](.claude/skills) — project skills: `servvo-ui-design`, `add-connector`, `mcp-tool-design`, `guardrail-policy`, `canonical-schema`, `servvo-brand`, `servvo-security-review`, `verify-agent-e2e`
- [`.agents/skills/`](.agents/skills) — 24 general engineering skills (TDD, spec-driven, debugging, security, a11y…)

---

## Quick start

```bash
pnpm install
docker compose up -d          # postgres :5432 + redis :6379
cp .env.example .env          # fill in — sandbox credentials only
pnpm db:generate && pnpm db:migrate && pnpm db:seed

pnpm typecheck && pnpm test   # 15 tasks, 50 tests
pnpm --filter @servvo/dashboard dev   # :3000
```

## Monorepo

```
apps/
  dashboard/       Next.js operator UI (Astryx design system, theme wired)
  mcp-server/      remote MCP endpoint — OAuth 2.1 resource server (fails closed)
  control-plane/   vendor OAuth, token refresh, health, approval endpoint
packages/
  canonical/       the canonical restaurant schema — THE boundary (money = int cents)
  policy/          guardrail engine: async, fail-closed, effect-aware (20 tests)
  connectors/core/ RestaurantConnector contract, HTTP client w/ retries, registry
  audit/           append-only audit log + secret redaction
  secrets/         envelope encryption for vendor tokens (KMS-wrapped)
  db/              Prisma schema, client, brandScope() tenancy helper, demo seed
```

**Status:** foundation is green — `pnpm typecheck` and `pnpm test` pass (50 tests), the
dashboard boots with the Astryx theme applied, and the guardrail engine is production-shaped.
The vendor adapters, MCP tool surface, and dashboard screens are built next via
[the Claude Code prompts](docs/04-CLAUDE-CODE-PROMPTS.md) (start at Prompt 4).

---

## Key decisions locked for v1

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Launch vertical** | Restaurants | Highest stack fragmentation = highest pain; Toast alone covers 120K+ locations |
| **Architecture** | Managed multi-tenant cloud | Fastest onboarding (<30 min goal), centralized token custody & audit, no infra for the operator |
| **Stack** | TypeScript / Node | Most mature MCP SDK, single language control-plane → connectors → dashboard |
| **First connectors** | Toast, Square, Clover, 7shifts | The platforms a dozen operator interviews will most commonly surface |
| **Transport** | Streamable HTTP (remote MCP) + OAuth 2.1 | Required for a hosted, agent-agnostic server per the current MCP spec |

---

## The 90-day pilot bar

- **5 pilot brands**, sourced through franchise consultant networks
- **95% connector uptime**
- **Setup under 30 minutes per brand**
- Falling short → templates go back for another pass before a second vertical opens