/**
 * @servvo/audit — append-only record of everything an agent did.
 *
 * This is a TRUST FEATURE, not just compliance: it's how an operator sleeps at night
 * after enabling writes. Every tool call writes exactly one row — allowed, denied,
 * needs-confirmation, or errored.
 *
 * Redaction runs before persistence: the audit log is rendered in the dashboard, so
 * anything landing here is effectively user-visible.
 */

import { type Outcome, prisma } from "@servvo/db";

/** Keys whose values never reach the log, at any depth. */
const REDACT_KEYS = [
  "token",
  "accesstoken",
  "refreshtoken",
  "confirmationtoken",
  "secret",
  "clientsecret",
  "password",
  "authorization",
  "apikey",
  "cardnumber",
  "pan",
];

const REDACTED = "[redacted]";

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 8 || value == null) return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (typeof value !== "object") return value;

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = REDACT_KEYS.includes(k.toLowerCase().replace(/[_-]/g, ""))
      ? REDACTED
      : redact(v, depth + 1);
  }
  return out;
}

export interface AuditInput {
  brandId: string;
  agentSub: string;
  tool: string;
  args: unknown;
  locationId?: string;
  outcome: Outcome;
  /** Machine-readable DecisionCode from the policy engine. */
  code?: string;
  reason?: string;
  result?: unknown;
  latencyMs?: number;
}

/**
 * Writes one audit row. Failure to audit must be loud: a tool call that executed but
 * wasn't recorded is worse than one that didn't run, so callers should surface a
 * thrown error rather than swallowing it.
 */
export async function audit(input: AuditInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      brandId: input.brandId,
      agentSub: input.agentSub,
      tool: input.tool,
      args: redact(input.args) as object,
      locationId: input.locationId ?? null,
      outcome: input.outcome,
      code: input.code ?? null,
      reason: input.reason ?? null,
      result: input.result === undefined ? undefined : (redact(input.result) as object),
      latencyMs: input.latencyMs ?? null,
    },
  });
}

export interface AuditQuery {
  brandId: string;
  tool?: string;
  outcome?: Outcome;
  code?: string;
  from?: Date;
  to?: Date;
  take?: number;
  cursor?: string;
}

/** Brand-scoped by construction — there is no unscoped read path. */
export async function queryAudit(q: AuditQuery) {
  const take = Math.min(q.take ?? 50, 200);
  return prisma.auditLog.findMany({
    where: {
      brandId: q.brandId,
      ...(q.tool ? { tool: q.tool } : {}),
      ...(q.outcome ? { outcome: q.outcome } : {}),
      ...(q.code ? { code: q.code } : {}),
      ...(q.from || q.to
        ? { createdAt: { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: q.to } : {}) } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
    ...(q.cursor ? { cursor: { id: q.cursor }, skip: 1 } : {}),
  });
}
