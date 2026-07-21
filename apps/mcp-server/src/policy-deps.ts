/**
 * Concrete PolicyDependencies — the trusted lookups the guardrail engine relies on.
 *
 * READ THIS BEFORE EDITING: the engine is only as correct as these implementations.
 * `evaluateWriteAction()` deliberately trusts nothing from the agent, which means the
 * security of every write rests here. Two rules dominate:
 *
 *   1. resolveFinancialAmountCents MUST return the amount that will actually move, or
 *      null. Returning a guess turns the dollar cap into decoration.
 *   2. reserveVelocitySlot MUST be atomic. A check-then-act read/write races and lets
 *      concurrent calls exceed the ceiling.
 *
 * See .claude/skills/guardrail-policy/SKILL.md.
 */

import type { PolicyDependencies, Role, WriteTool } from "@servvo/policy";
import { prisma } from "@servvo/db";

/** Minimal Redis surface we need — satisfied by ioredis or node-redis. */
export interface RedisLike {
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<unknown>;
}

const ROLE_FROM_DB: Record<string, Role> = {
  READ_ONLY: "read_only",
  STAFF: "staff",
  MANAGER: "manager",
  OWNER: "owner",
};

export interface BuildDepsOptions {
  redis: RedisLike;
  /** Resolves the live price of an item via the location's connector. */
  fetchCurrentPriceCents(i: {
    brandId: string;
    locationId: string;
    itemId: string;
  }): Promise<number | null>;
  /** Resolves the TRUE total a void/refund would move, via the connector. */
  fetchFinancialAmountCents(i: {
    brandId: string;
    tool: "void_check" | "refund_payment";
    args: Record<string, unknown>;
  }): Promise<number | null>;
  /** Resolves a shift's start time (epoch ms) for the lockout check. */
  fetchShiftStartMs(i: { brandId: string; args: Record<string, unknown> }): Promise<number | null>;
}

export function buildPolicyDeps(opts: BuildDepsOptions): PolicyDependencies {
  return {
    async getCurrentItemPriceCents(i) {
      // Never fall back to a default on failure — null makes the engine ask a human.
      try {
        return await opts.fetchCurrentPriceCents(i);
      } catch {
        return null;
      }
    },

    async resolveFinancialAmountCents(i) {
      try {
        return await opts.fetchFinancialAmountCents(i);
      } catch {
        return null; // → engine DENIES. Correct: we could not verify the amount.
      }
    },

    async isLiveBrandLocation({ brandId, locationId }) {
      const loc = await prisma.location.findFirst({
        where: { id: locationId, brandId, live: true },
        select: { id: true },
      });
      return loc !== null;
    },

    /**
     * Atomic fixed-window reserve. INCR is a single round trip, so two concurrent
     * calls cannot both observe "29" and both proceed.
     *
     * Fixed windows allow up to 2x the limit across a boundary; acceptable for a
     * containment control. Swap for a sliding-window Lua script if that matters.
     */
    async reserveVelocitySlot({ brandId, tool, limitPerMinute }) {
      const minute = Math.floor(Date.now() / 60_000);
      const key = `servvo:vel:${brandId}:${tool}:${minute}`;
      const count = await opts.redis.incr(key);
      if (count === 1) await opts.redis.expire(key, 120);
      return count <= limitPerMinute;
    },

    async getAgentRole({ brandId, agentSub }) {
      const grant = await prisma.agentGrant.findUnique({
        where: { brandId_agentSub: { brandId, agentSub } },
        select: { role: true },
      });
      return grant ? (ROLE_FROM_DB[grant.role] ?? null) : null;
    },

    /**
     * Single-use consumption of a human-minted approval. The compare-and-consume is
     * an atomic conditional update: `consumedAt: null` in the WHERE means a replay
     * updates zero rows and returns false.
     */
    async consumeConfirmationToken({ brandId, agentSub, tool, token, actionFingerprint }) {
      const tokenHash = await sha256(token);
      const result = await prisma.confirmationToken.updateMany({
        where: {
          tokenHash,
          brandId,
          agentSub,
          tool,
          actionFingerprint,
          consumedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { consumedAt: new Date() },
      });
      return result.count === 1;
    },

    async getShiftStartMs(i) {
      try {
        return await opts.fetchShiftStartMs(i);
      } catch {
        return null;
      }
    },
  };
}

async function sha256(value: string): Promise<string> {
  const { createHash } = await import("node:crypto");
  return createHash("sha256").update(value).digest("hex");
}

/** Loads a brand's guardrail config, falling back to the balanced defaults. */
export async function loadGuardrailConfig(brandId: string) {
  const { BALANCED_DEFAULT_CONFIG } = await import("@servvo/policy");
  const row = await prisma.policy.findUnique({ where: { brandId }, select: { rules: true } });
  if (!row) return BALANCED_DEFAULT_CONFIG;
  // The engine validates this and DENIES on malformed config, so a corrupt row fails
  // closed rather than silently disabling a gate.
  return row.rules as unknown as typeof BALANCED_DEFAULT_CONFIG;
}

export type { WriteTool };
