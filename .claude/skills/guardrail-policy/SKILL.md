---
name: guardrail-policy
description: Invariants that bind any change to packages/policy (the write-action guardrail engine). Use whenever editing guardrails.ts, its tests, PolicyDependencies implementations, or the confirmation/approval flow.
---

# Guardrail policy invariants

This package is the last line of defense in front of real money and payroll. These
invariants are load-bearing; a PR that weakens one needs an explicit, written decision
from the founder, not a refactor rationale.

## Fail closed — always

- Missing, malformed, or unverifiable input → `DENIED` (or `NEEDS_CONFIRMATION` where
  the file already says so). **Never** default an amount (`?? 0` is a security bug).
- Malformed config (NaN, negative, zero-where-positive-required) → `INVALID_CONFIG`
  denial. A bad dashboard value must not silently disable a gate.
- Unknown tool, unknown role, unresolvable location → deny.

## Judge the effect, not the args

- Amounts that gate decisions come from `PolicyDependencies`
  (`getCurrentItemPriceCents`, `resolveFinancialAmountCents`), never from agent args.
- The caller must execute **exactly** the figures the policy judged. If a dep
  implementation can't guarantee that, it returns `null` and the engine denies.

## The financial floor

- `void_check` / `refund_payment`: absent from default `enabledTools`; hard-denied
  above the per-tool cap; **never** return `ALLOWED` without a consumed confirmation
  token. There must be no config combination that creates an auto-refund path — this
  is enforced by code shape, not by default values.

## Ordering (do not reorder without updating tests + docs §9)

config → known tool → enabled → args → role → location → tier rules →
**confirmation request** (no token: return fingerprint, consume nothing) →
**atomic velocity reserve** → **token consumption** → `ALLOWED`.

Rationale: unapproved requests must not consume write capacity, and a rate-limited
call must never burn a human approval.

## Confirmation protocol

- Tokens are server-minted by the human-approval path only, single-use, expiring,
  bound to `computeActionFingerprint()` (brandId + tool + canonicalized args).
- A supplied-but-invalid token is a hard `CONFIRMATION_INVALID` denial, not a fallback
  to the request path (possible tampering/replay).
- A token satisfies only the confirmation gate — never any other denial.

## Testing rules

- Every new branch ships with at least one deny case and one allow case.
- The exploit-regression suite in `guardrails.test.ts` must stay green verbatim —
  those tests encode real holes found in review; deleting one requires the founder.
- Any `PolicyDependencies` implementation gets its own tests: the Redis velocity
  reserve must be proven atomic (concurrent-call test), and token consumption proven
  single-use.
- After changes: run the package tests AND strict `tsc`, then verify one guardrailed
  write end-to-end via the verify-agent-e2e skill.
