import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getServerEnv } from "@/lib/env";

const globalForPrisma = globalThis as unknown as { booklyPrisma?: PrismaClient };

export function getDb(): PrismaClient {
  if (!globalForPrisma.booklyPrisma) {
    const adapter = new PrismaPg({
      connectionString: getServerEnv().DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
    });
    globalForPrisma.booklyPrisma = new PrismaClient({ adapter });
  }
  return globalForPrisma.booklyPrisma;
}
