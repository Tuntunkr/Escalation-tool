import { PrismaClient } from "@prisma/client";

function isUsableDatabaseUrl(raw?: string) {
  if (!raw) return false;
  if (raw.includes("....") || raw.includes("YOUR_PASSWORD")) return false;
  try {
    const u = new URL(raw);
    if (!u.hostname) return false;
    if (u.port && !/^\d+$/.test(u.port)) return false;
    return true;
  } catch {
    return false;
  }
}

/** Ensure Prisma sees a valid URL (Railway passwords often need encoding). */
function ensureDatabaseUrl() {
  if (isUsableDatabaseUrl(process.env.DATABASE_URL)) return;

  const user = process.env.PGUSER || process.env.POSTGRES_USER || "postgres";
  const password = process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || "";
  const host = process.env.PGHOST || process.env.POSTGRES_HOST || "";
  const port = process.env.PGPORT || process.env.POSTGRES_PORT || "5432";
  const database = process.env.PGDATABASE || process.env.POSTGRES_DB || "railway";

  if (host && password) {
    process.env.DATABASE_URL =
      `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}` +
      `@${host}:${port}/${database}`;
  }
}

ensureDatabaseUrl();

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from "@prisma/client";
export default prisma;
