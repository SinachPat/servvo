-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('BASIC', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "Vendor" AS ENUM ('TOAST', 'SQUARE', 'CLOVER', 'SEVENSHIFTS');

-- CreateEnum
CREATE TYPE "ConnStatus" AS ENUM ('PENDING', 'HEALTHY', 'DEGRADED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "Outcome" AS ENUM ('ALLOWED', 'DENIED', 'NEEDS_CONFIRMATION', 'ERROR');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('READ_ONLY', 'STAFF', 'MANAGER', 'OWNER');

-- CreateTable
CREATE TABLE "Operator" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Operator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "plan" "Plan" NOT NULL DEFAULT 'BASIC',
    "mcpClientId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Connection" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "vendor" "Vendor" NOT NULL,
    "status" "ConnStatus" NOT NULL DEFAULT 'PENDING',
    "secretRef" TEXT NOT NULL,
    "scopes" TEXT[],
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Connection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "live" BOOLEAN NOT NULL DEFAULT false,
    "vendorRefs" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentGrant" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "agentSub" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'READ_ONLY',
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Policy" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "rules" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfirmationToken" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "agentSub" TEXT NOT NULL,
    "tool" TEXT NOT NULL,
    "actionFingerprint" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "approvedBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConfirmationToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "agentSub" TEXT NOT NULL,
    "tool" TEXT NOT NULL,
    "args" JSONB NOT NULL,
    "locationId" TEXT,
    "outcome" "Outcome" NOT NULL,
    "code" TEXT,
    "reason" TEXT,
    "result" JSONB,
    "latencyMs" INTEGER,
    "prevHash" TEXT,
    "hash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Operator_email_key" ON "Operator"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_mcpClientId_key" ON "Brand"("mcpClientId");

-- CreateIndex
CREATE INDEX "Brand_operatorId_idx" ON "Brand"("operatorId");

-- CreateIndex
CREATE INDEX "Connection_brandId_status_idx" ON "Connection"("brandId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Connection_brandId_vendor_key" ON "Connection"("brandId", "vendor");

-- CreateIndex
CREATE INDEX "Location_brandId_live_idx" ON "Location"("brandId", "live");

-- CreateIndex
CREATE INDEX "AgentGrant_brandId_idx" ON "AgentGrant"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentGrant_brandId_agentSub_key" ON "AgentGrant"("brandId", "agentSub");

-- CreateIndex
CREATE UNIQUE INDEX "Policy_brandId_key" ON "Policy"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "ConfirmationToken_tokenHash_key" ON "ConfirmationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ConfirmationToken_brandId_actionFingerprint_idx" ON "ConfirmationToken"("brandId", "actionFingerprint");

-- CreateIndex
CREATE INDEX "ConfirmationToken_expiresAt_idx" ON "ConfirmationToken"("expiresAt");

-- CreateIndex
CREATE INDEX "AuditLog_brandId_createdAt_idx" ON "AuditLog"("brandId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_brandId_tool_createdAt_idx" ON "AuditLog"("brandId", "tool", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_brandId_outcome_idx" ON "AuditLog"("brandId", "outcome");

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Connection" ADD CONSTRAINT "Connection_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentGrant" ADD CONSTRAINT "AgentGrant_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Policy" ADD CONSTRAINT "Policy_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

