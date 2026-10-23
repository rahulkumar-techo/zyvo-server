import type { PrismaClient } from "@prisma/client";

// All monetary values in integer paise (1 INR = 100 paise)
export const DEFAULT_PRICING_RULES = [
  {
    category: "auto",
    baseFarePaise: 3000,
    perKmRatePaise: 1200,
    perMinuteRatePaise: 150,
    minimumFarePaise: 5000,
    cancellationFeePaise: 2000,
    isActive: true,
  },
  {
    category: "standard",
    baseFarePaise: 5000,
    perKmRatePaise: 1500,
    perMinuteRatePaise: 200,
    minimumFarePaise: 8000,
    cancellationFeePaise: 3500,
    isActive: true,
  },
  {
    category: "premium",
    baseFarePaise: 10000,
    perKmRatePaise: 2200,
    perMinuteRatePaise: 300,
    minimumFarePaise: 15000,
    cancellationFeePaise: 5000,
    isActive: true,
  },
];

export async function seedPricing(prisma: PrismaClient): Promise<void> {
  for (const rule of DEFAULT_PRICING_RULES) {
    await prisma.pricingRule.upsert({
      where: { category: rule.category },
      update: rule,
      create: rule,
    });
  }
}
