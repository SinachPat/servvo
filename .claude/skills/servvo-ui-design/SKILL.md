---
name: servvo-ui-design
description: The standard for building any Servvo interface — dashboard screens, marketing pages, emails, empty/error states. Combines the Astryx component system, Servvo's brand, and an explicit anti-slop gate. Use before writing any UI code, and re-read the self-review gate before declaring UI done.
---

# Servvo UI design standard

Three inputs govern every pixel: **Astryx** (the component system — how), **the Servvo
brand** ([docs/02-BRAND.md](../../../docs/02-BRAND.md) — what it feels like), and the
**anti-slop gate** below (what disqualifies work). When they conflict, precedence is:

1. **Accessibility floor** — never negotiable.
2. **Astryx system rules** — components, tokens, frame-first. Never hand-roll around them.
3. **Servvo brand** — expressed *through* Astryx theme tokens, never as raw hex.
4. **Aesthetic preference** — last, and only inside the space the above leave.

> Skipping straight to writing JSX is the single biggest source of slop. The workflow
> below is not optional.

**Scope:** this skill governs the operator dashboard (`apps/dashboard`) and any internal
tool — both built on Astryx. The marketing site follows §8's craft rules and the brand
doc, but is *not* required to use Astryx components (it's a different app with different
constraints). Email is explicitly out of Astryx's reach — see §8b.

---

## 1. Workflow — discover, don't guess

Before any UI file is created:

```bash
npx astryx build "<what you're building, in a sentence>"   # returns page + blocks + components
npx astryx template <name> [--skeleton]                     # scaffold or study the layout
npx astryx component <Name>                                 # real props + examples
npx astryx search "<thing>"                                 # when you don't know the name
```

**Never invent a prop.** If you're unsure a component or prop exists, run
`astryx component <Name>`. Guessed props are the tell of generated code.

150 components exist. If you are writing a `<div>` for layout, you have skipped step 1.

## 2. Frame first — budget regions before content

Pick the shell and give every region an explicit px budget *before* writing content.
Content-first layout (sections stacked in a padded scroll column) reads as a prototype,
not a product.

Standard region budgets: side nav 240–280 · icon rail 64–72 · inspector panel 340–420 ·
filter rail 220–260.

**Servvo surface → frame map:**

| Surface | Archetype | Frame | Container policy |
|---|---|---|---|
| Connections (POS list + health) | Tracker / work tool | `AppShell` + `SideNav`; inspector `LayoutPanel` on select | **Rows.** One row per connection, edge-to-edge, `StatusDot` for health |
| Locations (select which go live) | Tracker | `AppShell` + `SideNav` | **Rows** with checkboxes. Never a card per store |
| Audit log | Tracker | `AppShell`, full-width `Table` + `LayoutPanel` detail | **Rows**, dense, mono for ids/timestamps |
| Guardrail config | Settings / forms | `AppShell` + settings template, `FormLayout` | Sections; `Card` **only** to fence dangerous groups (financial write toggles) |
| Overview / usage | Console | `AppShell` + `SideNav` | `Card` grid for KPI tiles only; `Table` for everything else |
| Onboarding checklist | Focused flow | Column frame, no side nav | Steps as rows; one primary action visible |
| Marketing site | Document | Plain content column | Sections; see §8 |

Declare the **responsive contract** as a comment at the frame root, before building:

```tsx
// Responsive contract:
//   > 1024px  nav 256 | content | inspector 380
//   <= 1024px inspector overlays content
//   <= 768px  nav collapses to MobileNav; toolbar actions wrap
```

## 3. Rows vs Cards — the #1 slop tell

**Card is a widget container, not a list-item wrapper.** Wrapping every record in a Card
with a Badge is the fastest way to make Servvo look like a generated prototype.

- ✅ `Table` for columnar records (audit rows, locations, orders)
- ✅ `List`/`Item` for scannable single-line records (connections), 32–40px row height, dividers, edge-to-edge
- ✅ `Card` for self-contained widgets: KPI tiles, chart panels, settings groups, danger zones
- ✅ `EmptyState` inside the region when a filter matches nothing
- ❌ A Card per connection, per location, per audit entry
- ❌ Stacked full-width Cards as a substitute for page structure
- ❌ Cards nested in Cards

**Status:** `StatusDot` or `Token` for connection health (healthy/degraded/expired).
`Badge` is only for counts and enumerated states — **never decoration**.

## 4. Tokens and the Servvo theme — no hex, ever

Servvo's brand colors live in **one place**: a theme file compiled by Astryx. They are
never typed into a component.

```bash
npx astryx theme add neutral ./packages/ui/theme   # scaffold editable source
# edit the theme: map Servvo brand → semantic roles, then:
npx astryx theme build ./packages/ui/theme/servvo.theme.ts
```

Brand → semantic mapping (the *only* place these hexes appear):

| Servvo brand | Astryx semantic role |
|---|---|
| Ember `#FF5A1F` | `accent` (and `text-accent`, `icon-accent`) |
| Deep Ember `#D8430E` | accent pressed/hover derivation |
| Slate Ink `#141A22` | `text-primary`, `background-inverted` |
| Paper White `#FBFAF8` | `background-body` |
| Signal Green `#1FB877` | `success` |
| Amber Caution `#F5A524` | `warning` |
| Slate 500 `#5B6672` | `text-secondary` |

Then in components: `var(--color-accent)`, never `#FF5A1F`. Never override `--color-*`
in `:root` — change the theme.

**Every value is a token:** `--color-*`, `--spacing-*` (4px scale), `--radius-*`
(inner 4 / element 8 / container 12 / page 28 / full), `--shadow-*` (low/med/high),
`--duration-*`, `--ease-standard`. A raw `16px` or `#hex` in a component is a defect.

**Styling escape hatch (project-specific):** this repo has **no StyleX or Tailwind
compiler**. So: component props first → `style`/`className` with token `var()`s as the
only escape hatch. Do **not** use `xstyle`, `stylex.create`, or utility classes here.
*(If StyleX is added later, update this paragraph and this paragraph only.)*

## 5. Typography

Astryx's scale is geometric (base 14px × 1.2) and every text style is a semantic token.
Use `Text`/`Heading` props — never compose raw font tokens, never set `line-height`
manually (it's snapped to a 4px grid for you).

Servvo specifics:
- **Mono (`--font-family-code`) for anything the user must copy or verify exactly:** MCP
  endpoint URLs, config snippets, GUIDs, audit ids, token fingerprints. Mono signals
  "this is the literal string."
- Headings carry the brand's plain-spoken voice — sentence case, no title-case marketing
  caps in product UI.
- Body copy stays at the default step; resist shrinking text to fit a cramped layout —
  fix the layout instead.

## 6. Shape, elevation, motion

- **Shape:** `--radius-element` (8) for controls, `--radius-container` (12) for cards and
  panels, `--radius-full` for pills and status dots. Pick one and stay consistent within
  a view — mixed radii is visual noise.
- **Elevation:** `--shadow-low` for resting cards, `--shadow-med` for popovers/dropdowns,
  `--shadow-high` for modals. Elevation communicates layer, not importance. Don't shadow
  a row.
- **Motion:** `--duration-fast` (175ms) micro-interactions, `--duration-medium` (410ms)
  entrance/exit, `--ease-standard`. Motion exists to explain a change in layout — a panel
  opening, a row entering. **No decorative animation**: no floating blobs, no scroll-jacked
  parallax, no animated gradient meshes, no number-counting on scroll.
- **Always honor `prefers-reduced-motion`** — reduce to opacity or none.

## 7. Every state, every time

Generated UI ships the happy path and nothing else. A Servvo screen is not done until
all of these exist and have been *seen*:

| State | Requirement |
|---|---|
| **Loading** | Skeletons matched to the real content shape (`--color-skeleton`), never a centered spinner on a full page |
| **Empty (first-run)** | `EmptyState` that tells them the next action — "Connect your first system," with the action inline |
| **Empty (filtered)** | Different copy from first-run: "No locations match this filter," with a clear-filter action |
| **Error** | Plain-English cause + the recovery action. Never a raw stack trace or vendor error code |
| **Partial** | The Servvo-specific one: a vendor is down, so results cover *some* locations. Show the data **and** name which stores are missing. Never fail the whole view for one down POS |
| **Degraded / expired connection** | Amber status + an inline "Reconnect" — the operator must never have to hunt for it |
| **Denied / needs confirmation** | A guardrail refusal is a *first-class UI state*, not an error toast. Show what was blocked, why, and (if confirmable) the approve action |
| **Permission-limited** | Controls the operator's role can't use are absent or explained — never present-but-mysteriously-broken |

## 8. The craft layer — one expressive move

Studied from [hilos.sh](https://hilos.sh), [heyclicky.com](https://www.heyclicky.com),
and [mercury.com](https://mercury.com). What they share is not a style — it's a
discipline: **each picks exactly one place to be memorable and keeps everything else
quiet.**

- **hilos** — pure monochrome, one expressive element (hand-drawn illustrated wallpaper),
  serif display against clean sans body, pill shapes throughout, content floating in a
  single rounded card. Personality via *illustration*, not via color.
- **heyclicky** — restrained palette on a dotted-grid canvas, personality via *scattered
  object collage* and tactile glossy buttons, all-lowercase friendly voice.
- **mercury** — desaturated cinematic atmosphere, exactly one saturated accent
  (periwinkle) reserved for the primary action, translucent surfaces layered over depth,
  enormous negative space, email input and CTA fused into a single pill.

**Servvo's expressive move — decided, don't re-litigate:**

- **Marketing:** the *answer moment* — a real question rendered against a quiet
  multi-location backdrop, using the connector-node motif. Mercury's restraint (one
  saturated Ember against desaturated everything, generous negative space, layered
  depth), hilos's single-focal-point composition. **Not** heyclicky's skeuomorphism —
  wrong register for a product touching payroll and payments.
- **Product (dashboard):** **no expressive move at all.** It is a tool. The craft shows
  as density, instant status legibility, and zero decoration. An operator at 11pm wants
  the number, not an experience.

Transferable rules extracted from all three:
1. One focal point per view. If two things compete, one is decoration — delete it.
2. Restraint is the default; expression is a budget you spend once.
3. Depth via layering (surface over background), not via ornament.
4. Shape consistency beats shape variety.
5. Type does the differentiating work — color stays disciplined.

## 8b. Icons, charts, dark mode, and email

**Icons — use the semantic registry.** Astryx resolves icon names through a theme-aware
registry: `close`, `chevronDown/Left/Right`, `check`, `success`, `error`, `warning`,
`info`, `calendar`, `clock`, `externalLink`, `menu`, `moreHorizontal`, `search`,
`arrowUp/Down`, `arrowsUpDown`, `funnel`, `eyeSlash`, `viewColumns`, `copy`,
`checkDouble`, `wrench`, `stop` (full list: `astryx docs icons`). Pass the semantic
name to any `icon` prop. **Do not** install lucide/react-icons/heroicons and hand-pick
glyphs — mixed icon sets are an instant slop tell, and ad-hoc icons don't follow the theme.

**Charts — Astryx has no chart component.** Charts come from an external library, which
means they are the most likely place for off-system color to leak in. Rules:
- Pull every color from `useTheme()` (the hook exists precisely for SVG/canvas/D3/Vega
  consumers that need JS values, not CSS vars). Never a hardcoded palette.
- Follow the global `dataviz` skill for chart-type choice, categorical palettes, and
  axis/legend treatment.
- Servvo charts are calm: sales/labor trends, comparison bars across locations. No 3D,
  no gradient fills under lines, no rainbow categorical series for 3 locations.
- Money axes format from integer cents; label the currency once, not per tick.

**Dark mode — supported, not optional.** Astryx tokens use `light-dark()`, so dark mode
works automatically *if* you only use tokens. This is another reason raw hex is banned:
a hardcoded color is a dark-mode bug. Verify both modes before declaring UI done
(`resize_window` with `colorScheme`). Slate Ink chrome makes the dashboard read well
dark; the marketing site ships light-first.

**Email — Astryx does not apply.** Email clients need table-based HTML with inline
styles; component/token rules can't reach there. So for scheduled reports and alerts:
inline styles with the brand hex values copied *from the brand doc* (this is the one
sanctioned place raw hex appears), single-column ≤600px, no web fonts (system stack),
alt text on every image, and a plain-text alternative. Keep the same voice and the same
Ink-on-Ember button rule.

## 9. Data display rules (Servvo-specific)

- **Money:** stored as integer cents; format at the edge only. Always show currency.
  Never a bare float. Never invent precision the source didn't have.
- **Provenance:** when a figure comes from a specific POS, the UI can surface `source`
  and `method` — a mixed Toast+Square comparison must never look like one homogeneous
  number without a way to see how it was computed.
- **Time:** every location has its own timezone. Render per-location times in *that
  location's* zone and label it. "Last week" must be unambiguous.
- **Nulls are not zeros.** A missing cover count renders as "—" with a tooltip, never `0`.
- **Never fabricate data.** No lorem ipsum, no plausible-looking fake restaurant names in
  committed code. Use the seeded demo brand.

## 10. Accessibility floor (non-negotiable)

**Measured contrast for the Servvo palette** (computed, not estimated — do not re-derive,
and do not "design around" these):

| Pair | Ratio | Verdict |
|---|---|---|
| Slate Ink on Paper White | **16.77** | ✅ body, anything |
| Slate 500 on Paper White | **5.61** | ✅ body — the secondary-text workhorse |
| **Slate Ink on Ember** | **5.61** | ✅ **the correct label color for Ember fills** |
| Deep Ember on Paper White | 4.26 | ⚠️ large/bold or UI boundary only |
| **White on Ember** | **3.12** | ❌ **fails AA body — never white text on an Ember button** |
| Ember on Paper White | 2.99 | ❌ fails body *and* the 3:1 UI threshold |
| Signal Green on Paper White | 2.46 | ❌ fill/dot only, never text |
| Amber Caution on Paper White | 1.96 | ❌ fill/dot only, never text |

Three hard rules follow:
1. **Ember is a fill color only.** Never Ember text on Paper, never Ember as a lone
   border carrying meaning. Body copy is `text-primary` / `text-secondary`.
2. **Ember fills take Slate Ink labels, not white.** The instinctive white-on-orange
   button fails AA at normal text size (3.12). Ink on Ember passes at 5.61.
3. **Status colors never carry text or meaning alone.** Green/amber at ~2 : 1 are dots
   and fills; the meaning lives in an adjacent Ink label ("Connected", "Reconnect
   needed"). This is why "never color-alone" is a contrast requirement here, not a
   preference.

Everything else: WCAG 2.2 AA — 4.5:1 body, 3:1 large text and UI boundaries.
- Visible focus on every interactive element; never `outline: none` without a replacement.
- Full keyboard path: tab order follows visual order; Escape closes overlays; focus is
  trapped in modals and restored on close.
- Status is never color-alone — pair `StatusDot` with a text label or icon.
- Real semantics: buttons are buttons, one `h1` per page, labels tied to inputs, tables
  with headers. Icon-only controls get an accessible name.
- Hit targets ≥ 44×44px on touch.
- Forms are controlled (`value` + `onChange`); errors are announced, tied to the field,
  and say how to fix it.

## 11. Anti-slop gate

Any one of these disqualifies the work. These are the specific failure modes of
AI-generated UI:

**Layout & structure**
- ❌ `<div>`/`<span>` doing layout that an Astryx component covers
- ❌ Card soup (a card per record) or stacked full-width cards as page structure
- ❌ Content-first padded scroll column instead of a budgeted frame
- ❌ Inspector/detail implemented as a route change when master-detail was right

**Visual**
- ❌ Raw hex, raw px, arbitrary spacing off the 4px scale
- ❌ Purple/blue gradient hero, abstract floating blobs, glowing orbs
- ❌ Multiple competing accent colors, or Ember used more than once per view
- ❌ Emoji as UI iconography or in headings
- ❌ Decorative Badges; status conveyed by color alone
- ❌ Mixed radii and inconsistent shadow levels in one view
- ❌ Drop shadows on rows; borders *and* shadows *and* background fills all at once

**Content**
- ❌ Lorem ipsum or invented sample data in committed code
- ❌ Marketing voice in product UI ("Empower your restaurant with AI-driven insights")
- ❌ Jargon the operator doesn't speak: "OAuth token expired" → "Toast needs you to reconnect"
- ❌ Three-column feature-card grid with generic icons as the default marketing section
- ❌ Error text that names a stack frame, HTTP status, or vendor error code to the operator

**Behavior**
- ❌ Happy path only — any missing state from §7
- ❌ Decorative animation; scroll-jacking; motion that ignores `prefers-reduced-motion`
- ❌ Invented component props (didn't run `astryx component`)
- ❌ Guardrail denials surfaced as generic red toasts instead of the designed state

## 12. Self-review gate — run before declaring any UI done

Re-read the file you just wrote and answer each. A "no" means it isn't finished.

1. Did I start from `astryx build`/`template`, or did I freehand it?
2. Is there a frame with budgeted regions and a responsive-contract comment?
3. Zero raw `<div>` layout, zero raw hex, zero off-scale px?
4. Dense data as rows; Cards only as widgets/settings/danger groups?
5. Every prop I used verified against `astryx component <Name>`?
6. All §7 states implemented — including **partial** and **denied/needs-confirmation**?
7. Keyboard-navigable, visible focus, AA contrast, status not color-alone?
8. Exactly one Ember element in the view? One focal point? Ember fills carry **Ink**
   labels, and no status color carries text alone?
9. Money/time/null/provenance rules honored?
10. Semantic icon names only; chart colors from `useTheme()`?
11. Rendered correctly in **both** light and dark mode?
12. Would Marcus — a 12-unit operator with no dev team, at 11pm — get what to do next?

Then **look at it**: run it and screenshot (browser tools or the `run` skill), in both
color schemes. Reviewing UI you have not rendered is how slop ships.

---

## Provenance

Astryx conventions verified against `@astryxdesign/core` v0.1.7 CLI docs (principles,
layout, tokens, typography, theme, styling, motion, shape, elevation, spacing, icons).
Every component named in this file was verified to exist via `astryx component <Name>`.
Contrast ratios were computed from the brand hexes, not estimated. Craft principles in
§8 are drawn from hilos.sh, heyclicky.com, and mercury.com as studied directly.

When `@astryxdesign/core` is upgraded, run `npx astryx upgrade --apply` and re-verify
this file's component names and token names before trusting it.
