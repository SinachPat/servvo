---
name: servvo-security-review
description: Servvo-specific security review checklist for any diff touching auth, the MCP surface, connectors, policy, secrets, or audit. Use before merging such changes or when asked to security-review the codebase.
---

# Servvo security review

Review against Servvo's actual threat model — an AI agent with a valid-but-limited
token, a compromised agent, a malicious tenant, and a curious insider. Report only
findings with a concrete failure scenario (inputs/state → wrong outcome); rank by
severity; verify each against the real code before reporting.

## 1. Agent-leg OAuth (MCP resource server)

- PKCE S256 only; RFC 9728 protected-resource metadata served; RFC 8707 `resource`
  required; 401s carry a correct `WWW-Authenticate`.
- Token validation: signature, expiry, audience/resource — all checked on every
  request, not just at session start.
- Brand claim is the *only* tenancy input. Grep for any handler that reads a brandId
  from args, params, or headers — that's a cross-tenant hole.

## 2. Tenant isolation

- Every DB query brand-scoped through the data layer (not ad-hoc where clauses).
- Try the confused-deputy cases: brand-A token + brand-B locationId / itemId /
  shiftId in args. All must deny.
- Cache keys include brandId (a shared menu cache across brands is a leak).

## 3. Vendor tokens & secrets

- No plaintext tokens in DB rows, logs, error messages, audit payloads, or OTel spans.
- `secretRef` indirection intact; KMS envelope encryption on the write path.
- Scopes requested = narrowest for enabled tools; disconnect revokes at vendor AND
  purges locally.

## 4. Guardrail bypass hunting (see guardrail-policy skill for invariants)

- Any write path that reaches a connector without `evaluateWriteAction()`.
- Any amount trusted from agent args instead of a resolved dep.
- Any config combination producing auto-executed financial actions.
- Confirmation tokens: single-use enforced? fingerprint-bound? expiring? Can the
  approval endpoint be called by a non-operator?
- Velocity: is the reserve genuinely atomic (single Redis op), and keyed per brand?

## 5. Injection & input

- Agent args reaching vendor APIs: encoded/parameterized (no string-built queries or
  URLs from raw args).
- Agent-supplied text rendered in the dashboard (audit log!) is escaped — the audit
  viewer is an XSS target fed by a hostile-capable writer.
- Prompt-injection relay: tool outputs containing vendor-originated text (menu item
  names, customer notes) are data; nothing in the server interprets them as
  instructions.

## 6. Audit integrity

- Every tool path writes audit (success, deny, error) with outcome + code.
- Redaction on args/result before persistence; hash-chain (if enabled) verifies.
- Audit failures fail the action loudly rather than proceeding silently unlogged.

## 7. Operational

- Rate limits per brand AND per agent subject; health endpoints unauthenticated but
  data-free; dependencies lockfile-pinned; no secrets in CI logs.

Cross-check any claim on the public trust page ([docs/09-SECURITY-TRUST.md](../../../docs/09-SECURITY-TRUST.md))
against what the code actually does — marketing drift on security copy is itself a finding.
