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

| # | Document | What it covers |
|---|----------|----------------|
| 1 | [Product Document](docs/01-PRODUCT.md) | Vision, problem, market, personas, full product spec, business model, pricing, GTM, risks, roadmap, metrics |
| 2 | [Brand Package](docs/02-BRAND.md) | Name rationale, positioning, logo concepts, color system, typography, voice, taglines, visual guidelines, AI image prompts |
| 3 | [Implementation Guide](docs/03-IMPLEMENTATION.md) | Architecture, dual-OAuth topology, canonical schema, connector framework, security & compliance, phased build plan, testing, deployment |
| 4 | [Claude Code Prompts](docs/04-CLAUDE-CODE-PROMPTS.md) | Copy-paste prompts to build Servvo phase-by-phase with Claude Code |

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