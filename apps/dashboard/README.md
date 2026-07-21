# @servvo/dashboard

The operator UI — the only surface an operator touches. Next.js App Router + the
Astryx design system.

**Before writing any screen**, run `npx astryx build "<screen idea>"` and read
[`.claude/skills/servvo-ui-design/SKILL.md`](../../.claude/skills/servvo-ui-design/SKILL.md).
That standard is not optional: it covers frame-first layout, rows-not-cards, tokens-only
styling, required empty/error/partial/denied states, and an explicit anti-slop gate.

Brand colors live in the Astryx theme, never in components. Note that **Ember fills take
Slate Ink labels, not white** — white-on-Ember fails WCAG AA at 3.12.

North-star metric: an operator goes from signup to a correct first agent answer in under
30 minutes.
