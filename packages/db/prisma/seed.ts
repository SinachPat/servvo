/**
 * Seeds the demo brand used by the verify-agent-e2e skill.
 *
 * This is the ONLY sanctioned fake data in the project — it exists so end-to-end
 * verification has something to answer with. Never seed a real brand's data.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const operator = await prisma.operator.upsert({
    where: { email: "demo@servvo.local" },
    update: {},
    create: { email: "demo@servvo.local", name: "Demo Operator" },
  });

  const brand = await prisma.brand.upsert({
    where: { mcpClientId: "demo-brand-client" },
    update: {},
    create: {
      operatorId: operator.id,
      name: "Demo Restaurant Group",
      plan: "PRO",
      mcpClientId: "demo-brand-client",
    },
  });

  // A deliberately MIXED estate — this is the case Servvo exists to serve, and the
  // one most likely to break aggregation, so the demo data must exercise it.
  const locations = [
    { name: "Downtown", timezone: "America/New_York", vendorRefs: { SQUARE: "sq_loc_downtown" } },
    { name: "Riverside", timezone: "America/New_York", vendorRefs: { SQUARE: "sq_loc_riverside" } },
    { name: "Airport", timezone: "America/Chicago", vendorRefs: { TOAST: "toast-guid-airport" } },
    { name: "Uptown", timezone: "America/Chicago", vendorRefs: { TOAST: "toast-guid-uptown" } },
  ];

  for (const loc of locations) {
    const existing = await prisma.location.findFirst({
      where: { brandId: brand.id, name: loc.name },
    });
    if (!existing) {
      await prisma.location.create({
        data: { brandId: brand.id, live: true, ...loc },
      });
    }
  }

  // Balanced-posture guardrails, matching BALANCED_DEFAULT_CONFIG in @servvo/policy.
  await prisma.policy.upsert({
    where: { brandId: brand.id },
    update: {},
    create: {
      brandId: brand.id,
      rules: {
        enabledTools: [
          "set_item_availability",
          "update_item_price",
          "create_shift",
          "update_shift",
        ],
        allowedLocationIds: [],
        priceChangePctThreshold: 0.15,
        priceChangeAbsFloorCents: 50,
        financialCapCentsByTool: { void_check: 5000, refund_payment: 5000 },
        requireConfirmationForMediumAndHigh: false,
        maxWritesPerMinute: 30,
        minimumRoleByTool: {
          set_item_availability: "staff",
          update_item_price: "manager",
          create_shift: "manager",
          update_shift: "manager",
          void_check: "manager",
          refund_payment: "manager",
        },
        shiftEditLockoutMinutes: 120,
      },
    },
  });

  await prisma.agentGrant.upsert({
    where: { brandId_agentSub: { brandId: brand.id, agentSub: "demo-agent" } },
    update: {},
    create: {
      brandId: brand.id,
      agentSub: "demo-agent",
      role: "MANAGER",
      label: "Claude Desktop (demo)",
    },
  });

  console.log(`Seeded brand "${brand.name}" (${brand.id}) with ${locations.length} locations.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
