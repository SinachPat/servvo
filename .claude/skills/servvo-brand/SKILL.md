---
name: servvo-brand
description: Servvo's brand system for any UI, marketing, or copy work — dashboard screens, landing pages, emails, docs, decks. Use before writing any user-facing pixel or sentence.
---

# Servvo brand system

Full reference: [docs/02-BRAND.md](../../../docs/02-BRAND.md). This is the working
subset — apply it without re-deriving.

## Color (use tokens, never raw hex in components)

| Token | Hex | Use |
|-------|-----|-----|
| `ember` | `#FF5A1F` | THE accent: primary CTA fill, logo, live/active states. One per screen/section. **Fill only — never text.** |
| `ember-deep` | `#D8430E` | Ember hover/pressed only |
| `ink` | `#141A22` | Primary text, dark chrome, **and labels on Ember fills** |
| `paper` | `#FBFAF8` | Light backgrounds (warm white, not pure #FFF) |
| `slate-500` | `#5B6672` | Secondary text, borders, muted |
| `green` | `#1FB877` | Connected/healthy — **dot/fill only, never text** |
| `amber` | `#F5A524` | Attention/degraded — **dot/fill only, never text** |

Ratio ≈ 70% neutrals / 20% status / 10% Ember. If a screen has two Ember elements,
one is wrong. Status colors are semantic — never decorative.

**Contrast constraints (measured, binding):** white-on-Ember is **3.12 → fails AA**;
Ink-on-Ember is **5.61 → passes**. So Ember buttons carry *Ink* labels, not white.
Ember-on-Paper is 2.99 and green/amber are ~2:1, so none of them may carry text or be
the sole carrier of meaning — pair every status dot with an Ink label. Full table in
[docs/02-BRAND.md](../../../docs/02-BRAND.md#accessibility-constraints-on-the-palette-measured-binding)
and [servvo-ui-design](../servvo-ui-design/SKILL.md).

## Type

- Headers: Söhne, else Inter with tight tracking. Body: Inter.
- **JetBrains Mono for anything technical the user might copy or verify:** MCP URLs,
  config snippets, GUIDs, audit-log entries. Mono signals "exact string."
- Scale: Display 56 · H1 40 · H2 30 · H3 22 · body 16/26 · small 14.

## Shape & components

- Rounded-geometric: 8–12px radii. Outline icons ~1.75px stroke, rounded caps;
  filled variants only for active states (Ember).
- Signature motif: the connector node (two shapes joining) — empty states, section
  art, illustrations.
- One primary action per screen. Data as calm tables, not busy charts.

## Voice (applies to UI microcopy, errors, emails, marketing)

- Plain-spoken, operator-first, serious-with-warmth. Contractions fine; hype never.
- Translate jargon at first touch: not "OAuth connection expired" but "Toast needs
  you to reconnect — one click, we saved everything else."
- Name real systems (Toast, Square) instead of "your tools."
- Banned: "leverage", "synergy", "robust", "enterprise-grade", "best-in-class",
  exclamation-mark enthusiasm, emoji in product UI.
- Security copy states the mechanism, not the adjective: "every action is logged" ✓,
  "bank-level security" ✗.
- Guardrail/error messages must be quotable by an agent to a human and still make
  sense — write them for that relay.

## Quick checks before shipping UI

- [ ] Exactly one Ember CTA visible
- [ ] Technical strings in mono
- [ ] Status colors used semantically only
- [ ] Copy passes the "would Marcus (12-unit operator, no dev team) get this?" test
