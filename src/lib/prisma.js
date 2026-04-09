import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';

// PrismaLibSql is a factory — takes a libsql config object, creates the client internally
const DB_URL = process.env.DATABASE_URL || 'file:./dev.db';

const globalForPrisma = globalThis;

function createPrismaClient() {
  const adapter = new PrismaLibSql({ url: DB_URL });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
