import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;

// Prisma 7.6: datasource URL is read from prisma.config.ts, not passed to constructor
export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
