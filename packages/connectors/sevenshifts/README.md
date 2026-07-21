# @servvo/connector-sevenshifts

7shifts adapter — labor and scheduling.

**This connector is where Servvo's cross-vendor advantage becomes concrete.** It lets
`get_labor_summary` answer for a brand whose POS is Toast but whose scheduling is
7shifts — the join a single-vendor "AI feature" structurally cannot do. When an operator
asks *"which location missed its labor target last week?"*, this adapter supplies half
the answer and the POS adapter supplies the other half.

## Provides

`listLocations` · `getLaborSummary` (hours, labor cost, and `laborPctOfSales` when sales
for the same period are available — **null, never 0, when they aren't**) · `getShifts` ·
optionally `createShift` / `updateShift`.

## Write caution — read before enabling

`createShift`/`updateShift` are the product's **first scheduling writes**, and they touch
real people's hours. Before enabling them for any brand:

1. Confirm the partner ToS explicitly permits API-driven schedule changes
   ([docs/10](../../../docs/10-VENDOR-PARTNERSHIPS.md)).
2. Remember the guardrail engine blocks edits within 2h of shift start
   (`shiftEditLockoutMinutes`) — that lockout exists because a shift changed 20 minutes
   before it starts is a no-show, not an optimization.

Labor-cost fields may require elevated API access; capability advertising must hide
`get_labor_summary` when they're unavailable rather than returning zeros.

Implementation: **Prompt 10**. Rules: [`add-connector`](../../../.claude/skills/add-connector/SKILL.md).
