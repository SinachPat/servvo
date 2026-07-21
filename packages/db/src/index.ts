import { PrismaClient } from "@prisma/client";

export * from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Tenancy helper. Every read/write must be brand-scoped; call this rather than
 * hand-writing `where` clauses so the scoping is impossible to forget.
 *
 * This is the application-layer half of tenant isolation — Postgres RLS is the other.
 */
export function brandScope<T extends Record<string, unknown>>(
  brandId: string,
  where: T = {} as T,
): T & { brandId: string } {
  if (!brandId) throw new Error("brandScope requires a brandId — refusing an unscoped query");
  return { ...where, brandId };
}
