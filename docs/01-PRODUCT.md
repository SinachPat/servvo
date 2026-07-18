# Servvo — Product Document

**Version:** 1.0 (v1 scope: Restaurants)
**Status:** Pre-seed / pilot
**Last updated:** July 2026
**Owner:** Founder

---

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Problem](#2-problem)
3. [Solution](#3-solution)
4. [Why now](#4-why-now)
5. [Market](#5-market)
6. [Target customers & personas](#6-target-customers--personas)
7. [Competitive landscape](#7-competitive-landscape)
8. [Product overview](#8-product-overview)
9. [Feature specification](#9-feature-specification)
10. [Agent-facing capabilities (the MCP surface)](#10-agent-facing-capabilities-the-mcp-surface)
11. [Business model & pricing](#11-business-model--pricing)
12. [Go-to-market](#12-go-to-market)
13. [The moat: compounding connector reuse](#13-the-moat-compounding-connector-reuse)
14. [Risks & mitigations](#14-risks--mitigations)
15. [Success metrics](#15-success-metrics)
16. [Roadmap](#16-roadmap)
17. [Open questions](#17-open-questions)

---

## 1. Executive summary

**Servvo sells pre-built AI connectors for multi-location restaurants.** Each
connector is a hosted [Model Context Protocol](https://modelcontextprotocol.io)
(MCP) server that gives any AI agent — Claude, a custom copilot, an internal
assistant — safe, structured, real-time access to the restaurant systems a chain
already runs: Toast, Square, Clover, 7shifts, and their reservation and inventory
tools.

The wedge is **done-for-you, not developer-tools.** The MCP ecosystem today is
built for engineers who write their own servers. Restaurant operators don't have
engineers. Servvo removes every technical step: the operator authenticates their
POS in a dashboard, checks the locations they want live, and within 30 minutes an
AI agent can pull a sales report by store, compare labor cost against revenue, or
surface which menu items are 86'd tonight — across the whole group.

- **Model:** B2B SaaS. $299/mo per brand entry; Pro $499–$1,500/mo; enterprise setup $15K–$50K; usage-based API add-ons.
- **Target:** Multi-unit restaurant franchisees & small-to-mid chains (3–50 locations).
- **Wedge vertical:** Restaurants. Expand to salons/spas and fitness studios once the connector framework proves out.
- **Moat:** Each new vertical reuses ~40% of the prior build (control plane, auth, audit, canonical schema, agent tool layer). Build time drops from months to weeks. Each signed chain is the case study that sells the next.
- **Revenue potential:** $1M–$10M ARR (seed-stage profile).

---

## 2. Problem

### The gap between "AI-ready" and "AI-connected"

Restaurant operators have been sold on AI. What no one tells them is that an AI
agent is only as useful as the systems it can reach — and a multi-unit restaurant's
systems are a museum of pre-AI software:

- **POS** (Toast / Square / Clover) holds sales, checks, payments, menu, and often inventory.
- **Scheduling / labor** (7shifts / Toast Payroll / Homebase) holds shifts, hours, and labor cost.
- **Reservations / waitlist** (OpenTable / Resy / Yelp) holds covers and guest history.
- **Inventory / invoicing** (MarginEdge / xtraCHEF) holds food cost and vendor data.
- **Loyalty / CRM** holds guest records.

Each was built as an island. None of them was designed to be driven by an
autonomous agent. To connect even one to an AI layer, an operator faces:

| Barrier | Reality for a 12-unit operator |
|---------|-------------------------------|
| **No in-house developers** | The "IT person" is a GM who is good with spreadsheets |
| **Fragmented stacks** | Store 1–8 on Toast, stores 9–12 on Square after an acquisition |
| **Custom integration cost** | $15K–$60K per system + a developer retainer, then maintenance forever |
| **Time** | Months of scoping, building, and testing before a single query works |
| **Risk** | Handing an agent write-access to live payments and payroll with no guardrails |

The software that could pull a report or rebook a shift sits **one integration
away, untouched.** This is a chronic, increasing, high-frequency pain (Ideabrowser
Pain Score 8/10; willingness-to-pay 8/10).

### Why existing tools don't solve it

- **Zapier / Make / Workato** automate *fixed workflows* between apps — they are not an agent-readable, real-time interface. They break when the task isn't a pre-drawn "if-this-then-that," and they don't expose data as MCP tools an agent can reason over.
- **Building your own MCP server** requires an engineer to read each POS's API docs, handle OAuth, normalize data, and host it — exactly the work operators can't do.
- **POS-native "AI features"** are locked to one vendor and stop at that vendor's walls; they can't reason across a mixed Toast+Square estate.

---

## 3. Solution

**Servvo ships pre-configured MCP connectors, one vertical at a time.** For v1
that vertical is restaurants.

### What the operator experiences

1. **Sign up** and create a *brand* (their chain).
2. **Connect a system** — click "Connect Toast," authorize via OAuth in the vendor's own screen. Repeat for Square, 7shifts, etc.
3. **Select locations** — check which of their stores go live.
4. **Copy their Servvo MCP URL** into whatever agent they use (Claude Desktop, a web copilot, an internal tool). One URL, one login.
5. **Ask.** *"Which of my locations missed their labor target last week?"* *"86 the branzino at all downtown stores."* *"Text me tomorrow's covers by store at 9am."*

Setup target: **under 30 minutes**, no code, no developer.

### What Servvo is under the hood

A **managed, multi-tenant remote MCP server**. Servvo:

- Acts as an **OAuth 2.1 resource server** to the agents that connect (so any MCP-compatible agent can use it securely).
- Acts as an **OAuth client** to each POS/scheduling vendor (holding and refreshing the brand's tokens).
- Normalizes every vendor's data into a **canonical restaurant schema** so an agent sees one consistent set of tools regardless of whether a location runs Toast or Square.
- Enforces **per-brand, per-location, per-tool guardrails** — read-only by default, writes gated by policy.
- Logs every agent action to an **immutable audit trail**.

Because it's built on the open MCP standard, Servvo works across *any* agent layer
the chain adopts now or later — it is deliberately not locked to one AI vendor.

---

## 4. Why now

Four forces converged in 2025–2026 to make this the right moment (Ideabrowser Why-Now
score 9/10 — "Perfect Timing"):

1. **The MCP standard matured into a real integration layer.** The Streamable HTTP
   transport (2025-06-18 spec) plus the OAuth 2.1 authorization spec (finalized
   Nov 2025) mean a *hosted, secure, agent-agnostic* server is now a well-defined,
   buildable thing — not a research project. Servvo can be the trusted managed
   layer before the standard is common knowledge.
2. **Explosive, low-competition demand.** "MCP server" search volume is enormous
   and growing (Ideabrowser reports 246K volume with triple-digit-thousands %
   growth), yet the space is almost entirely *developer* tooling. The
   business-owner segment is wide open.
3. **API-first SaaS is now the norm.** Toast (120K+ locations), Square, Clover, and
   7shifts all expose documented REST APIs with OAuth. The raw material for
   connectors exists; nobody has packaged it for non-technical operators.
4. **AI adoption pressure + compliance tailwind.** SMB and franchise operators feel
   pressure to adopt AI to cut cost and improve guest experience, while tightening
   data-protection expectations reward a **secure, auditable** managed layer over
   DIY scripts. Establishing trust and security standards early is itself a moat.

---

## 5. Market

| Attribute | Detail |
|-----------|--------|
| **Type** | B2B SaaS |
| **Category** | AI integration / agent infrastructure ("done-for-you MCP") |
| **Beachhead** | US multi-unit restaurants (franchisees + small chains, 3–50 units) |
| **Main competitor (adjacent)** | Zapier (workflow automation, not agent-native) |
| **Comparable companies** | Zapier, Workato, Segment, Aptible |
| **Revenue potential** | $1M–$10M ARR (Ideabrowser $$$); seed profile |
| **Opportunity type** | Market gap, low competition, first-mover window "just right" |

### Sizing logic (illustrative, bottom-up)

- **US restaurant locations:** ~750K+; a large share belong to multi-unit operators and franchise systems.
- **Serviceable wedge (v1):** multi-unit operators on Toast/Square/Clover with 3–50 locations who are actively exploring AI. Even a few thousand such brands at $299–$1,500/mo is a meaningful early market.
- **Expansion multiplier:** each additional vertical (salons, fitness, retail, medical/dental, auto) reuses the platform, multiplying the addressable base without a proportional build cost.

> **Note:** All figures are directional/illustrative for planning, not forecasts.
> Validate with primary interviews before committing spend.

### Demand signals (from research)

- Reddit **r/mcp** 112K+ members; broad developer interest that operators are now catching.
- YouTube MCP explainers with hundreds of thousands of views (e.g., IBM Technology ~800K).
- Facebook groups for agency & multi-location owners voicing systems-management frustration.
- LinkedIn franchise-operator communities as a targetable channel.

---

## 6. Target customers & personas

### Primary buyer — "The Multi-Unit Operator"

> **Marcus, 44 — owns 12 fast-casual franchise units across two metros.**
> 8 stores on Toast, 4 on Square (from an acquisition). Runs the business off nightly
> email reports and a patchwork of spreadsheets. Has heard he "should be using AI"
> from every conference and vendor. Tried once; the quote to connect his systems was
> $40K and "3–4 months." He has no developers. He'll pay for something that *works
> this week* and doesn't put his payments or payroll at risk.

- **Jobs:** consolidated visibility across stores; faster answers ("which store is bleeding labor?"); less time in dashboards.
- **Fears:** an agent doing something irreversible (refund, void, price change) without control; data leaking; another tool that half-works.
- **Buying trigger:** a peer operator's case study, or a franchise consultant's recommendation.

### Secondary buyer — "The Franchise Consultant / Agency" (channel + white-label)

> **Dana** runs a consultancy that advises 30+ franchise brands on operations and
> tech. One warm intro from Dana surfaces a *cluster* of owners on the same systems.
> Dana wants to offer "AI enablement" without building it. White-label Servvo is her
> product.

- **Jobs:** add a high-value service line; look ahead-of-the-curve to clients.
- **Value:** Servvo as the delivery engine behind her brand.

### Influencer — "The Tech-Savvy GM / Ops Lead"

The person inside the brand who actually clicks "Connect." Comfortable with SaaS,
not a developer. Needs the setup to be genuinely 30-minutes-simple or they'll stall.

### End user — "The AI agent (and whoever prompts it)"

Ultimately Servvo's *user* is an agent. The design constraint: the tool surface must
be legible and safe enough that an LLM uses it correctly on the first try.

---

## 7. Competitive landscape

| Player | What they do | Why Servvo wins |
|--------|--------------|-----------------|
| **Zapier / Make** | Trigger-action workflow automation | Not agent-native or real-time; can't expose data as MCP tools for open-ended reasoning; breaks outside pre-drawn flows |
| **Workato / Tray** | Enterprise iPaaS | Priced and scoped for enterprise IT teams, not 12-unit operators; not MCP; heavy implementation |
| **DIY MCP servers** | Engineers build their own | Requires the exact developer capacity operators lack; no hosting, auth, guardrails, or audit out of the box |
| **POS-native AI** (Toast/Square features) | Vendor-locked assistants | Can't reason across a mixed estate; stop at one vendor's walls |
| **Generic MCP marketplaces / registries** | List community servers | Not vertical-tuned, not done-for-you, no SLA, no support, security varies |

**Servvo's defensible position:** the *only* done-for-you, owner-friendly, multi-POS,
audited MCP layer purpose-built for a vertical. Competitors are either too technical
(DIY, iPaaS), too shallow (workflow tools), or too locked-in (POS-native).

---

## 8. Product overview

Servvo has three surfaces:

### A. The Operator Dashboard (Next.js web app)
Where a brand connects systems, selects locations, manages users, sees the audit
log, configures guardrails, and copies their MCP endpoint. This is the *only* surface
the operator touches.

### B. The Connector Platform (the control plane + connectors)
The hosted engine: OAuth token custody, per-POS adapters, the canonical schema, the
guardrail policy engine, the audit log, rate limiting, and health monitoring.

### C. The MCP Server (the agent-facing endpoint)
A per-brand remote MCP endpoint (`https://mcp.servvo.com/b/{brandId}`) that any
MCP-compatible agent connects to over Streamable HTTP with OAuth. It exposes a
consistent set of **tools** (actions) and **resources** (readable context) mapped
from the canonical schema.

```
        ┌────────────────────────────────────────────────────────┐
        │                     AI AGENT LAYER                       │
        │   Claude Desktop · custom copilot · internal assistant   │
        └───────────────────────────┬────────────────────────────┘
                                     │  MCP over Streamable HTTP
                                     │  (agent authorizes via OAuth 2.1)
                                     ▼
        ┌────────────────────────────────────────────────────────┐
        │                   SERVVO MCP SERVER                      │
        │  tools + resources (canonical restaurant schema)         │
        │  guardrail policy engine  ·  audit logger                │
        └───────────────────────────┬────────────────────────────┘
                                     │  canonical → vendor adapters
                     ┌───────────────┼───────────────┬─────────────┐
                     ▼               ▼               ▼             ▼
                ┌─────────┐    ┌──────────┐    ┌──────────┐   ┌─────────┐
                │  Toast  │    │  Square  │    │  Clover  │   │ 7shifts │
                │  OAuth  │    │  OAuth   │    │  OAuth   │   │  OAuth  │
                └─────────┘    └──────────┘    └──────────┘   └─────────┘
                     (Servvo holds & refreshes each brand's tokens)
```

---

## 9. Feature specification

### 9.1 Onboarding & connection
- **Brand creation** — an operator account can hold multiple brands (for consultants/agencies).
- **One-click connect per system** — OAuth flow that lands the operator back in Servvo with a live connection. No API keys pasted by hand where OAuth exists.
- **Location discovery & selection** — after connecting, Servvo pulls the list of locations from the vendor; the operator checks which go live.
- **Connection health** — green/amber/red status per system per location, with "reconnect" when a token expires.
- **30-minute setup guarantee** as the north-star onboarding metric.

### 9.2 The MCP endpoint
- **Per-brand endpoint URL** + setup snippet for popular agents (Claude Desktop config, generic MCP client).
- **Agent authorization** — OAuth 2.1 + PKCE (S256), dynamic client registration where supported, scoped to that brand.
- **Consistent tool surface** regardless of underlying POS mix.

### 9.3 Guardrails & permissions
- **Read-only by default.** Writes are opt-in per tool.
- **Scoped writes** — e.g., allow "86 an item" but never "refund a payment," configurable per brand.
- **Thresholds & confirmations** — dollar limits, per-location restrictions, human-confirmation requirement for sensitive actions.
- **Role-based access** for dashboard users (owner, manager, read-only).

### 9.4 Audit & observability
- **Immutable audit log** — every agent tool call: who (which agent/token), what (tool + args), where (location), when, and the result.
- **Usage analytics** — calls per tool, per location, per day; latency; error rates. Feeds both the operator's reporting add-on and Servvo's own SLA monitoring.
- **Alerting** — connection failures, unusual write volume, rate-limit breaches.

### 9.5 Reliability
- **95% uptime pilot bar** (target 99.9% at GA), health checks per connector, automatic token refresh, graceful degradation (a down Square doesn't take Toast offline).
- **Rate-limit management** — Servvo respects and smooths each vendor's limits so agents don't trip them.

### 9.6 Reporting & analytics add-on (upsell)
Scheduled/pushed reports ("email me labor-vs-sales by store every Monday"), and a
dashboard view of what agents are doing. Part of the $200–$800/mo add-on tier.

### 9.7 Admin / internal
- **Connector template registry** — versioned per-POS adapters Servvo ships and updates centrally.
- **Tenant management** — provisioning, susp/ resume, plan enforcement.
- **Secrets custody** — encrypted token store with rotation.

---

## 10. Agent-facing capabilities (the MCP surface)

These are the **tools** and **resources** an agent sees. All map to the canonical
schema; the operator's actual POS is invisible to the agent.

### Read tools (default-on)
| Tool | What it returns |
|------|-----------------|
| `list_locations` | The brand's live locations + status |
| `get_sales_summary` | Net sales, checks, covers, average check — by location + date range |
| `get_menu` | Items, modifiers, prices, availability (incl. 86'd items) |
| `get_labor_summary` | Hours, labor cost, labor % of sales — by location + period |
| `get_shifts` | Scheduled/worked shifts by employee & location |
| `get_inventory_levels` | Stock/quantity where the POS exposes it |
| `get_reservations` | Covers / bookings by location + date (where connected) |
| `search_orders` | Orders/checks by date, location, or GUID |
| `compare_locations` | Any metric ranked across locations |

### Write tools (opt-in, guardrailed)
| Tool | Action | Default guardrail |
|------|--------|-------------------|
| `set_item_availability` | 86 / un-86 a menu item | Confirmation off, per-location allowed |
| `update_item_price` | Change a price | Requires confirmation + threshold check |
| `create_shift` / `update_shift` | Scheduling changes | Requires manager role |
| `void_check` / `refund_payment` | Financial reversal | **Disabled by default** — must be explicitly enabled per brand |

### Resources (readable context)
- `brand://profile` — brand, locations, connected systems.
- `menu://{location}` — current menu snapshot.
- `reports://labor/{period}` — precomputed labor report.

> **Design principle:** the tool surface is the product. It must be *self-describing*
> (great descriptions, typed args, examples) so an LLM calls it correctly the first
> time, and *safe* (guardrails enforced server-side, never trusting the agent).

---

## 11. Business model & pricing

Servvo monetizes with a tiered SaaS ladder plus usage and enterprise setup — mirroring
the Ideabrowser Value Ladder.

### The value ladder

| Stage | Offer | Price | Purpose |
|-------|-------|-------|---------|
| **Bait** | Integration Assessment Tool | Free | A tool that maps the operator's stack and shows what AI could do + estimated savings. Lead gen + trust. |
| **Frontend** | **Basic** — 1–2 connected systems, core read tools, single brand | **$299/mo per brand** | Low-barrier entry; test the value. |
| **Middle** | **Pro** — multiple systems, all locations, write tools + guardrails, priority support | **$499–$1,500/mo** | Full turnkey solution; the core revenue tier. |
| **Continuity** | **Support & Analytics add-ons** — advanced reporting, scheduled pushes, premium support | **$200–$800/mo** | Stickiness + margin. |
| **Backend** | **Custom Enterprise** — bespoke connectors, dedicated isolation, SLA, bespoke API management | **$15K–$50K setup** + monthly | High-ticket, large chains. |

### Usage-based add-on
- **API management fees:** ~$0.01–$0.05 per agent request above plan limits. Aligns Servvo's revenue with agent usage and covers vendor API + compute cost.

### Pricing principles
- **Per-brand, not per-seat** — matches how operators think (one chain = one bill).
- **Locations included by tier** — Pro covers "all locations"; Basic caps them.
- **Land at $299, expand via write-tools + analytics + more systems.**

### Unit economics (illustrative)
- COGS per brand ≈ hosting + vendor API + support. The 40%-reuse platform keeps marginal cost low.
- Target gross margin 75–85% at Pro tier.
- Enterprise setup fees fund bespoke work and shorten payback.

---

## 12. Go-to-market

The GTM is **channel-led**, not paid-acquisition-led — because the fastest path to
five clustered pilots is warm intros through people operators already trust.

### Phase 0 — Validation (pre-build / parallel to build)
- **Interview a dozen operators.** The single most important GTM *and* product act: find the platforms they all run, so v1 connectors hit the common denominator (very likely Toast + Square + 7shifts).
- Map the actual stack overlap; pick the connectors that unlock the most pilots.

### Phase 1 — Pilots (the 90-day proof)
- **5 pilot brands via franchise consultant networks.** One warm intro surfaces a cluster of owners on the same systems — exactly the concentration Servvo needs.
- Bar: 95% uptime, <30-min setup, real agent usage. Free or steeply discounted in exchange for a case study.
- **Falling short sends templates back for another pass** before opening a second vertical.

### Phase 2 — Channel scale
- **Franchise consultants & agencies** as white-label/referral partners (the secondary persona). Revenue-share or wholesale pricing.
- **Operator conferences & franchise expos** — where owners weighing AI adoption gather.
- **Educational content** for operators: "What an MCP connector does for your restaurant, in plain English." YouTube setup walkthroughs, LinkedIn thought-leadership, Reddit AMAs in operator/MCP communities.

### Phase 3 — Flywheel
- **Each signed chain becomes the case study that sells the next.** Concentrated verticals mean referrals travel fast within a brand community.

### GTM tactics (from research)
- Create educational content for franchise owners about MCP benefits.
- Partner with agencies for white-label.
- Reddit AMAs on non-technical MCP integration.
- YouTube easy-setup tutorials.
- LinkedIn targeted franchise-owner outreach.

---

## 13. The moat: compounding connector reuse

The defensibility isn't a single feature — it's an **architecture that compounds**:

1. **~40% reuse per new vertical.** The control plane, OAuth custody, canonical-schema
   pattern, guardrail engine, audit log, dashboard, and agent tool framework are
   vertical-agnostic. A new vertical only needs new *adapters* and a vertical-tuned
   canonical schema. Build time drops from months to weeks.
2. **Data-model expertise.** Knowing how to normalize Toast vs. Square vs. Clover into
   one clean schema is hard-won knowledge that competitors must re-earn per POS.
3. **Trust & audit.** Being the *secure, audited* layer for agent access to live
   payments/payroll is a trust position that strengthens with every incident-free month.
4. **The case-study flywheel.** Concentrated pilots → referrals → the next cluster.
5. **Standard-native.** Betting on open MCP means Servvo rides every new agent
   platform instead of being disrupted by one.

---

## 14. Risks & mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Data consistency across a mixed estate** (Toast + Square report metrics differently) | High | Canonical schema with explicit, documented normalization rules; per-metric reconciliation tests; surface source + method to the agent. |
| **API cost / rate limits** eating margin | Medium | Usage-based add-on to pass through cost; caching of slow-changing data (menus); request smoothing; per-brand quotas. |
| **Adoption variability** (operators stall at setup) | Medium | Obsessive 30-min onboarding; white-glove pilot setup; consultant-assisted activation. |
| **MCP standard still evolving** | Medium | Track the spec (Streamable HTTP + OAuth 2.1 are stable anchors); isolate transport/auth behind an internal interface so spec changes are localized. |
| **Vendor API access / partner gating** (Toast partner program, ToS) | High | Apply to each vendor's partner program early; design for revocation; never scrape; respect ToS; have fallbacks (e.g., read-only where writes aren't sanctioned). |
| **Security incident with live financial systems** | Critical | Read-only default, server-side guardrails, encrypted token custody, full audit, least-privilege scopes, SOC 2 path. |
| **Big platform builds this** (Zapier/Toast add agent access) | Medium-High | Move fast in a concentrated vertical; own the operator relationship + multi-POS reasoning a single vendor can't offer. |
| **Liability for agent mistakes** (bad refund/price change) | High | Writes disabled by default, confirmations + thresholds, clear ToS on responsibility, audit trail for dispute resolution. |

---

## 15. Success metrics

### Pilot / North-star (90 days)
- **≥95% connector uptime** across pilot brands.
- **<30 min median setup** per brand.
- **5 pilot brands** live with real, recurring agent usage.
- **≥1 publishable case study.**

### Product health (ongoing)
- **Time-to-first-successful-agent-call** (activation).
- **Weekly active agent calls** per brand (engagement).
- **Tool-call success rate** (agent gets a correct result first try).
- **Connector error rate** per vendor.
- **p95 tool latency.**

### Business
- **Logo count** by vertical; **net revenue retention.**
- **Expansion rate** (Basic → Pro, add-on attach).
- **CAC by channel** (consultant referral vs. conference vs. content).
- **Payback period**; **gross margin.**

---

## 16. Roadmap

| Phase | Timeframe | Goal | Key deliverables |
|-------|-----------|------|------------------|
| **P0 — Discovery** | Weeks 0–3 | Confirm the common stack | 12 operator interviews; connector priority list; canonical restaurant schema v1 |
| **P1 — MVP** | Weeks 2–6 | One category, working end-to-end | Control plane + Toast + Square connectors; dashboard connect flow; MCP endpoint with read tools; audit log |
| **P2 — Pilot** | Weeks 6–18 | 5 brands, hit the bar | Guardrailed write tools; 7shifts/Clover; health monitoring; 30-min onboarding; 95% uptime |
| **P3 — GA (restaurants)** | Months 5–8 | Sellable product | Billing/plans; assessment tool (bait); analytics add-on; SOC 2 path; consultant white-label |
| **P4 — Vertical #2** | Months 8–12 | Prove the 40% reuse | Salons *or* fitness: new adapters on the same platform; measure reuse; second case study |

---

## 17. Open questions

1. **Exact connector set for v1** — resolved only by the 12 interviews. Toast + Square + 7shifts is the hypothesis.
2. **Write-tool default policy** — how aggressive should guardrails be out of the box? (See the implementation guide's guardrail policy — a genuine security/UX fork.)
3. **Assessment-tool depth** — how much real data to pull for the free "bait" tool vs. a lightweight estimator.
4. **Partner-program timelines** — Toast/Square partner approval could gate write access; start early.
5. **Pricing validation** — is $299 the right land price for a 12-unit operator, or is per-location metering cleaner at scale?
6. **Second vertical** — salons (matches the original hero example, cleaner APIs) vs. fitness (cleanest API landscape). Decide based on where pilot referrals cluster.
