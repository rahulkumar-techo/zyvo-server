import { PrismaClient } from "@prisma/client";
import { seedRoles } from "./roles.seed.js";
import { seedPricing } from "./pricing.seed.js";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding platform database...");
  await seedRoles(prisma);
  console.log("✓ Roles seeded successfully");

  await seedPricing(prisma);
  console.log("✓ Pricing rules seeded successfully");
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
