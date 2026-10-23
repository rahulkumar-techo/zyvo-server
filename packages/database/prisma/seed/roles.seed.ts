import type { PrismaClient } from "@prisma/client";

export const DEFAULT_ROLES = [
  { name: "admin", description: "Platform administrator with full privileges" },
  { name: "passenger", description: "Passenger booking and taking rides" },
  { name: "driver", description: "Verified driver accepting rides" },
];

export async function seedRoles(prisma: PrismaClient): Promise<void> {
  for (const role of DEFAULT_ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description },
      create: role,
    });
  }
}
