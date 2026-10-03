import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// DATABASE_POOL_MAX — опциональный override размера пула подключений.
// Нужен для локальной разработки через `prisma dev`: этот эфемерный dev-демон
// надёжно держит не более ~2 одновременных подключений и рвёт остальные
// (ECONNRESET), в отличие от настоящего PostgreSQL. На реальной БД (локальной
// или managed) эту переменную задавать не нужно — используется разумный
// дефолт пула node-postgres.
const poolMax = process.env.DATABASE_POOL_MAX
  ? Number(process.env.DATABASE_POOL_MAX)
  : undefined;

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  max: poolMax,
});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
