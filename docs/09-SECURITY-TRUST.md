# Servvo — Security & Trust

Dual-purpose: the internal security posture (engineering-binding) and the source for
the public trust page + sales security answers. Buyer-facing language stays
plain-English; every claim here must be true in the code before it ships on the site.

---

## 1. What Servvo is, in security terms

A managed multi-tenant broker between AI agents and restaurant systems, holding two
distinct trust relationships:

- **To agents,** Servvo is an OAuth 2.1 **resource server** (MCP Streamable HTTP):
  PKCE S256 only, RFC 9728 protected-resource metadata, RFC 8707 resource indicators,
  `WWW-Authenticate` on 401. Tokens are brand-scoped; the brand claim is the only
  tenant reachable.
- **To vendors** (Toast/Square/Clover/7shifts), Servvo is an OAuth **client** holding
  brand credentials under least-privilege scopes.

The agent never sees vendor credentials; the vendor never sees the agent.

## 2. Data handling

| Class | Handling |
|-------|----------|
| Vendor OAuth tokens | KMS envelope encryption (per-brand data key); DB stores only a `secretRef`; auto-refresh; revoke-at-vendor + purge on disconnect |
| Business data (sales, menus, labor) | Read on demand from vendor APIs; short-TTL caches only (minutes); not warehoused in v1 |
| Cardholder data (PAN) | **Never stored, processed, or transmitted.** Servvo consumes vendor-reported totals only; PCI DSS burden stays with the POS |
| Guest/employee PII | Minimized: only fields a tool actually returns; no cross-brand aggregation; retention limits on audit payloads |
| Agent conversations | Not visible to Servvo — we see tool calls, not chats |

## 3. Write-action safety (the guardrail engine)

Enforced server-side in `packages/policy` (see the implementation guide §9), fail-closed:

- Read-only by default; each write tool opt-in per brand; financial reversals ship off.
- Amounts are **resolved server-side**, never trusted from the agent.
- Financial actions: hard cap + mandatory human confirmation via a one-time,
  fingerprint-bound token the agent cannot forge. Hard denials are never bypassable.
- Per-tool minimum roles, live-location verification, atomic rate limits.
- Every decision (allowed or denied) writes an audit row with a machine-readable code.

**Buyer sentence:** *"Nothing can move money without a human clicking yes, and you can
read the log of everything the AI ever did."*

## 4. Platform controls

- **Tenant isolation:** every query brand-scoped in the data layer; Postgres RLS as
  defense-in-depth; cross-brand access rejected at the MCP layer and tested for.
- **Transport:** TLS everywhere; no tokens in URLs or logs; secrets redacted from audit.
- **Internal access:** SSO + MFA for staff; production access role-gated and logged;
  no standing access to tenant tokens.
- **Supply chain:** lockfiles, dependency scanning, CI-gated releases.
- **Availability:** per-connector isolation (one vendor down ≠ platform down), health
  checks, 95% pilot bar → 99.9% GA target, status page at GA.

## 5. Compliance roadmap

| Milestone | When | Notes |
|-----------|------|-------|
| Security overview page + this doc as DPA basis | Pilot | Honest scope: "SOC 2 in progress" — never claim it early |
| Pen test (external) | Pre-GA | Scope: MCP auth, tenant isolation, guardrail bypass |
| SOC 2 Type I | GA + ~1 quarter | Controls already designed to map (audit, access, change mgmt) |
| SOC 2 Type II | Type I + 6–12 months observation | Enterprise-tier prerequisite |
| DPAs + subprocessor list | GA | Cloud, DB, IdP, KMS, observability vendors |

## 6. Incident response

Detect via health checks/alerting → assess blast radius by tenant → notify affected
brands within 1 hour (security incidents: without undue delay, with facts) → revoke/
rotate affected credentials → postmortem with template-level fix. Contact:
security@servvo.com; responsible-disclosure policy on the trust page.

## 7. Liability & terms (outline for counsel)

- Operator owns guardrail configuration; Servvo owns enforcing it exactly as configured.
- Write actions execute only within configured policy; confirmation records (who
  approved, when, fingerprint) are retained and exportable for disputes.
- Servvo liability capped; no liability for vendor-API outages or for actions a human
  explicitly confirmed; ToS forbids using Servvo to violate vendor terms.
- Data ownership: the brand's data is the brand's; export and deletion on request.

## 8. Sales security FAQ (fast answers)

- *"Are you SOC 2?"* → "Controls are built to SOC 2; Type I is scheduled post-GA —
  here's our security overview and the audit-log demo."
- *"Where are tokens stored?"* → "Encrypted with cloud KMS, per-brand keys; never in
  plaintext; revoked and purged the moment you disconnect."
- *"Can the AI go rogue?"* → "It can only call the tools you enabled, at the stores
  you allowed, under caps we enforce server-side — and money always waits for a human."
- *"Do you train AI on our data?"* → "No. We're the pipe, not the model. Your data
  goes to the assistant you chose, under your agreement with them."
