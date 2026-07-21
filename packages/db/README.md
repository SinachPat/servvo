# @servvo/db

Prisma schema, client, and the tenancy helper.

**Brand is the tenant and the isolation boundary.** Every query is brand-scoped — use
`brandScope(brandId, where)` rather than hand-writing `where` clauses so the scoping is
impossible to forget. Postgres RLS is applied on top as defense-in-depth.

Notable models beyond the obvious: `AgentGrant` (maps an agent token subject to a role,
driving the guardrail RBAC gate) and `ConfirmationToken` (one-time, expiring,
fingerprint-bound human approvals — single-use enforced by `consumedAt`).

```bash
pnpm db:generate   # prisma client
pnpm db:migrate    # dev migration
pnpm db:seed       # demo brand: a MIXED Toast+Square estate
```

The seed is the only sanctioned fake data in the project; it exists so end-to-end
verification has something to answer with.
