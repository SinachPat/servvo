# @servvo/policy

The write-action guardrail engine — **the last line of defense in front of real money
and payroll**.

`evaluateWriteAction(req, deps)` returns `ALLOWED` / `DENIED` / `NEEDS_CONFIRMATION`,
each with a machine-readable `DecisionCode`. It runs server-side on every write, before
any vendor call.

Three properties define it:

- **Fail closed.** Missing args, unverifiable amounts, or malformed config deny. There
  are no `?? 0` fallbacks.
- **Effect-aware.** Amounts come from trusted `PolicyDependencies` lookups, never from
  agent arguments — an agent cannot understate a $5,000 void as $0.
- **Non-bypassable confirmation.** Financial reversals never auto-execute; they require
  a one-time, fingerprint-bound token that only the human-approval path can mint.

Invariants that bind every change live in
[`.claude/skills/guardrail-policy/SKILL.md`](../../.claude/skills/guardrail-policy/SKILL.md).
The exploit regressions in `guardrails.test.ts` encode real holes found in review —
they must stay green.

`pnpm --filter @servvo/policy test`
