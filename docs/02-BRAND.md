# Servvo — Brand Identity Package

**Version:** 1.0

**Use:** Hand this to any designer or AI image generator to produce consistent,
professional brand materials.

---

## Brand at a glance

| | |
|---|---|
| **Name** | **Servvo** |
| **Category** | Done-for-you AI connectors (MCP) for multi-location restaurants |
| **Positioning** | *AI that speaks restaurant. Connect once, run every location.* |
| **Personality** | Capable · Plain-spoken · Trustworthy · Quietly technical · Operator-first |
| **Primary color** | Servvo Ember `#FF5A1F` |
| **Foundation color** | Slate Ink `#141A22` |
| **Header font** | Söhne / Inter (geometric-humanist sans) |
| **Body font** | Inter |

### Why the name works
- **Servvo** = *serve* (hospitality — the restaurant's whole job) + a system/"servo"
  connotation (a motor that does precise, reliable work behind the scenes). The
  doubled **v** makes it ownable and trademark-distinct, and reads as
  "serv-vo," easy to say.
- It's warm (hospitality) *and* mechanical (infrastructure) at once — exactly the
  brand's dual nature: friendly on the surface, serious engineering underneath.
- Short, brandable, `.com`-shaped, and vertical-neutral enough to travel to salons
  and fitness later without a rename.

---

## 1. Logo concepts (5 variations)

### Concept A — "The Link" *(recommended primary)*
- **Rationale:** Servvo's whole job is *connection* — joining siloed systems into one
  agent-readable surface. A mark built from two interlocking forms says that instantly.
- **Visual description:** Wordmark "Servvo" in a medium-weight geometric-humanist sans.
  The two `v`s in the center merge into a single continuous **chevron/link** — the
  right stroke of the first `v` becomes the left stroke of the second, forming a subtle
  chain link or "connector" node where they meet. Optional standalone icon: that
  interlocked-double-v glyph in Ember on Slate Ink.
- **Style:** Wordmark with an integrated icon ligature (works as icon + text or symbol-only).
- **Mood:** Modern, confident, quietly clever, technical-but-warm.

### Concept B — "The Plug/Port"
- **Rationale:** The most literal read of "connect once." A port/socket motif communicates
  plug-and-play to non-technical operators.
- **Visual description:** A rounded-square app-icon glyph containing an abstract
  connector/port shape (two dots joining into one channel), Ember on Slate Ink.
  Wordmark set beside it.
- **Style:** Icon + text.
- **Mood:** Approachable, product-y, SaaS-standard (safe, less distinctive).

### Concept C — "The Signal"
- **Rationale:** Servvo turns dormant data into live, real-time signal an agent can act on.
- **Visual description:** A small mark of three ascending nodes connected by a clean line
  (like a route between locations, or a rising signal), doubling as a "multi-location"
  cue. Sits before the wordmark.
- **Style:** Icon + text.
- **Mood:** Energetic, data-forward, optimistic.

### Concept D — "Monogram S-node"
- **Rationale:** A compact, ownable app icon for favicons, avatars, and the MCP client tile.
- **Visual description:** A single `S` constructed from two connected pill/node segments
  with a visible "join" in the middle — the S *is* a connection. Ember gradient on Slate Ink.
- **Style:** Symbol only (pairs with the wordmark elsewhere).
- **Mood:** Minimal, tech-credible, scalable.

### Concept E — "Wordmark-only, engineered"
- **Rationale:** For a trust-led infrastructure brand, a clean confident wordmark can be
  the strongest choice — no gimmick, just competence.
- **Visual description:** "servvo" all-lowercase, tight tracking, a single custom detail:
  the crossing of the double-v cut at a precise angle so it reads as a deliberate weld/seam.
- **Style:** Wordmark.
- **Mood:** Minimalist, premium, serious.

> **Recommendation:** Ship **Concept A** as the primary lockup and **Concept D** as the
> app icon/favicon. Together they cover "trustworthy infrastructure" (wordmark) and
> "plug-and-play product" (icon).

---

## 2. Color palette

### Primary colors

**Servvo Ember** — the action / brand color
- **Hex:** `#FF5A1F`
- **RGB:** `255, 90, 31`
- **Usage:** Primary CTAs, the logo mark, active/"live" connection states, key highlights. Use sparingly as the single accent against a lot of neutral.
- **Psychology:** Warmth + energy of hospitality and "the kitchen," plus urgency/appetite (orange-red is the restaurant color) — but a modern, tech-saturated orange, not a fast-food red. It signals *served, live, on.*

**Slate Ink** — the foundation
- **Hex:** `#141A22`
- **RGB:** `20, 26, 34`
- **Usage:** Primary text, dark UI surfaces, dashboard chrome, logo on light. The "serious infrastructure" base.
- **Psychology:** Near-black with a cool blue undertone reads as stable, secure, engineered — the trust that must underpin write-access to payments and payroll.

**Paper White** — the canvas
- **Hex:** `#FBFAF8`
- **RGB:** `251, 250, 248`
- **Usage:** App backgrounds, whitespace, light surfaces. A hair warm (not clinical) to stay hospitable.
- **Psychology:** Clean, calm, uncluttered — the opposite of the "12 dashboards" chaos Servvo replaces.

### Secondary / accent colors

**Signal Green** — connection healthy / success
- **Hex:** `#1FB877` · **RGB:** `31, 184, 119`
- **Usage:** "Connected" status, uptime, success toasts, positive metrics.
- **Psychology:** Live, healthy, go. Reinforces the reliability promise (95% uptime).

**Amber Caution** — attention / reconnect
- **Hex:** `#F5A524` · **RGB:** `245, 165, 36`
- **Usage:** Token-expiring, degraded connection, "needs attention," write-confirmation prompts.
- **Psychology:** Notice, don't panic — the guardrail color.

**Slate 500** — secondary text / borders
- **Hex:** `#5B6672` · **RGB:** `91, 102, 114`
- **Usage:** Secondary text, muted labels, dividers, inactive states.

**Deep Ember** — pressed/hover of primary
- **Hex:** `#D8430E` · **RGB:** `216, 67, 14`
- **Usage:** Hover/active state of Ember buttons; never for large fills.

> **Ratio guide:** ~70% neutrals (Paper White / Slate Ink / Slate 500), ~20% supporting
> (green/amber where meaningful), ~10% Ember. Ember earns attention by being rare.

### Accessibility constraints on the palette (measured, binding)

These ratios are computed, not estimated. They constrain how the palette may be used:

| Pair | Ratio | Verdict |
|------|-------|---------|
| Slate Ink on Paper White | 16.77 | ✅ anything |
| Slate 500 on Paper White | 5.61 | ✅ body — the secondary-text workhorse |
| **Slate Ink on Ember** | **5.61** | ✅ **the correct label color on Ember fills** |
| Deep Ember on Paper White | 4.26 | ⚠️ large/bold text or UI boundaries only |
| **White on Ember** | **3.12** | ❌ **fails AA at normal text size** |
| Ember on Paper White | 2.99 | ❌ fails body and the 3:1 UI threshold |
| Signal Green on Paper White | 2.46 | ❌ dot/fill only, never text |
| Amber Caution on Paper White | 1.96 | ❌ dot/fill only, never text |

**Consequences (not negotiable):**
- **Ember is a fill color.** Never Ember text on Paper White; never Ember as a lone
  meaning-carrying border.
- **Ember buttons take Slate Ink labels, not white.** The instinctive white-on-orange
  primary button fails AA — Ink on Ember passes comfortably. This is why Servvo's
  primary CTA reads as ink-on-ember rather than the usual white-on-brand.
- **Green and amber are dots and fills only.** Status meaning always lives in an
  adjacent Ink label ("Connected", "Reconnect needed") — color alone is both an a11y
  failure and a contrast failure here.

Implementation lives in the Astryx theme, not in components — see
[`.claude/skills/servvo-ui-design/SKILL.md`](../.claude/skills/servvo-ui-design/SKILL.md).

---

## 3. Typography system

**Primary font (headers): Söhne** *(fallbacks: Inter, "Helvetica Neue", Arial, sans-serif)*
- **Character:** Geometric-humanist, modern, confident without shouting. Reads as a
  credible software company, not a consumer app.
- **Usage:** Headlines, section titles, logo text, dashboard page headers, marketing H1–H3.
- **If Söhne isn't licensed:** use **Inter** at tight tracking for headers — free, excellent, and already the body face (one-font system is a valid, clean choice).

**Secondary font (body): Inter** *(fallbacks: "Helvetica Neue", Arial, system-ui, sans-serif)*
- **Character:** Highly readable, neutral, screen-optimized, friendly-but-professional.
- **Usage:** Body copy, UI labels, tables, tooltips, docs, form fields.

**Monospace (data/code): JetBrains Mono** *(fallbacks: "SF Mono", Menlo, monospace)*
- **Character:** Precise, technical.
- **Usage:** MCP endpoint URLs, config snippets, code blocks in docs, audit-log entries, any raw identifiers (GUIDs, tokens). Signals "this is the real, exact string."

### Type scale (web)
| Token | Size / line | Use |
|-------|-------------|-----|
| Display | 56/60, tight | Marketing hero |
| H1 | 40/44 | Page titles |
| H2 | 30/36 | Sections |
| H3 | 22/28 | Sub-sections |
| Body-L | 18/28 | Lead paragraphs |
| Body | 16/26 | Default |
| Small | 14/20 | Labels, captions |
| Mono | 14/22 | Endpoints, code, audit |

---

## 4. Brand voice & personality

### Brand personality (5 adjectives)
1. **Operator-first** — We talk like someone who has closed a restaurant at 1am, not
   like an ML paper. Every feature is explained in terms of *what it does for your stores.*
2. **Plain-spoken** — We translate "MCP server," "OAuth," and "canonical schema" into
   "connect your systems so AI can actually use them." Jargon is a failure, not a flex.
3. **Trustworthy** — We are calm and precise about security because we touch live money.
   We never overpromise; we show the audit log.
4. **Quietly technical** — The competence is obvious but never performative. We prove it
   with reliability, not vocabulary.
5. **Momentum-giving** — Every message moves the operator toward "connected." Confident,
   forward, "here's the next click."

### Tone of voice (spectrum placement)
- **Formal ↔ Casual:** *Lean casual-professional.* We're the sharp, friendly vendor an
  operator would actually grab a coffee with — contractions, short sentences, direct.
  Never slangy, never stiff.
- **Technical ↔ Simple:** *Strongly simple on the surface, technical on demand.* Marketing
  and dashboard copy are plain-English; docs and security pages go deep for the ops lead
  who wants proof. Two registers, one voice.
- **Playful ↔ Serious:** *Mostly serious, with warmth.* We're handling payments and
  payroll — this isn't a toy. But hospitality is a warm business, so we're serious
  *and* human, never cold or corporate.

### Voice do / don't
| Do | Don't |
|----|-------|
| "Connect Toast in one click. Pick your locations. Done." | "Leverage our synergistic integration fabric." |
| "Your agent can read sales, but it can't refund anything unless you turn that on." | "Robust, enterprise-grade, best-in-class." |
| "One URL. Every location. Any AI." | Emoji-spam, hype, exclamation overload |
| Name the real systems (Toast, Square, 7shifts) | Vague "all your tools" hand-waving |

---

## 5. Tagline variations (5 options)

1. **"Connect once. Run every location."** — *Lead tagline.* Captures the core value
   (one connection, whole-estate reach) in five plain words. Operator-benefit first.
2. **"AI that speaks restaurant."** — Positions Servvo as vertical-fluent vs. generic
   integration tools. Great for the restaurant launch; warm and confident.
3. **"Your systems, ready for AI — in 30 minutes, not 3 months."** — Attacks the exact
   pain (cost + time of custom integration) with the concrete promise.
4. **"The AI layer for multi-location operators."** — Category-defining, buyer-facing,
   works in a deck or on LinkedIn. Slightly more corporate.
5. **"Plug in your restaurant. Let the agents work."** — Playful, product-forward,
   emphasizes done-for-you simplicity ("plug in").

---

## 6. Visual style guidelines

### Photography / imagery style
- **Subject matter:** Real multi-location restaurant operations — a manager on a tablet
  in a bright fast-casual dining room, a line during service, a laptop open to a clean
  dashboard on a stainless prep counter. People who look like *operators*, not models.
  Show *place* (multiple storefronts) to signal multi-location.
- **Mood:** Bright, clean, energetic-but-calm. Competent and human. Never sterile
  stock-tech, never chaotic-kitchen cliché.
- **Color treatment:** Natural and warm, slightly lifted whites, with real Ember accents
  present in-scene (an orange apron, signage, sunset light) so brand color feels native.

### Product / UI imagery
- Clean dashboard screenshots on Paper White with Slate Ink chrome and a single Ember CTA.
- Show the *connection* metaphor: source-system logos joining into one Servvo endpoint.
- Status colors doing real work (green = connected, amber = attention).

### Graphic elements
- **Shape language:** Rounded-geometric. 8–12px radii on cards/buttons; a signature
  "connector node" motif (two shapes joining) reused across illustration and iconography.
- **Pattern usage:** A subtle "network/route" line pattern (nodes + connecting lines,
  echoing multi-location + integration) for section backgrounds and empty states —
  low-contrast, Slate on Paper or Ember on Slate Ink. Use sparingly.
- **Icon style:** Clean **outline** icons, ~1.75px stroke, rounded caps, consistent with
  Inter's humanist geometry. Filled variants only for active/selected states (filled Ember).

### Layout principles
- Generous whitespace (the antidote to "12 dashboards").
- One primary action per screen, in Ember.
- Data presented as calm tables and simple comparisons, not busy charts.
- Dark-mode-first for the dashboard is optional but on-brand (Slate Ink surfaces).

---

## 7. AI image-generation prompts

**Logo generation prompt (Concept A — primary):**
> "A modern minimalist wordmark logo for a software company named 'Servvo', set in a
> medium-weight geometric-humanist sans-serif, all lowercase. The two central letter
> 'v's merge into a single continuous chevron that forms a subtle chain-link / connector
> node where they join. Warm orange-red (#FF5A1F) mark on a deep slate near-black
> (#141A22) background. Clean, high-contrast, vector, flat, tech-startup branding,
> lots of negative space, trademark-quality. Also provide a symbol-only version of the
> interlocked-double-v glyph as a square app icon."

**Brand / marketing image prompt:**
> "Bright, clean editorial photograph of a confident restaurant operator (40s) holding
> a tablet showing a simple analytics dashboard, standing in a modern fast-casual
> restaurant during daytime service, warm natural light, stainless and light-wood
> interior, subtle orange accents in the scene, shallow depth of field, real and human
> not stocky, professional, optimistic, product-marketing quality. Muted warm color
> grade with lifted whites."

**Icon set prompt:**
> "A set of consistent outline icons for a restaurant-AI SaaS product: a connector/port,
> a storefront, a receipt (sales), a clock (labor/shifts), a fork-and-knife menu, an
> inventory box, a shield (security), a chain link (integration), a status dot. Uniform
> ~1.75px stroke weight, rounded caps and corners, humanist-geometric style, single
> color (deep slate #141A22 on transparent), 24px grid, flat vector, no fills. Provide
> filled active-state variants in warm orange #FF5A1F."

---

## Brand application quick-reference

| Surface | Guidance |
|---------|----------|
| **Marketing site** | Paper White base, Slate Ink type, one Ember CTA per section, real-operator photography, plain-English headlines. |
| **Dashboard** | Slate Ink chrome (dark-mode-friendly), Paper White content, green/amber status, mono for endpoints & audit rows. |
| **Docs** | Inter body, JetBrains Mono for all code/URLs/GUIDs, generous spacing, "plain-English first, deep-on-demand." |
| **Sales deck** | Wordmark on Slate Ink title slide, connector-node motif, tagline #1 or #4. |
| **App icon / favicon** | Concept D monogram, Ember on Slate Ink. |
