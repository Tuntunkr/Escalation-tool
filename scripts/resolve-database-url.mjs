/**
 * Build a valid Prisma DATABASE_URL for Railway.
 * Prefer discrete PG* vars when DATABASE_URL is missing/placeholder/unparseable
 * (passwords often contain @ : / that break unescaped URLs).
 */
export function resolveDatabaseUrl(env = process.env) {
  const current = env.DATABASE_URL?.trim() || "";
  if (current && isUsableDatabaseUrl(current)) {
    return { url: current, source: "DATABASE_URL" };
  }

  const user = env.PGUSER || env.POSTGRES_USER || "postgres";
  const password = env.PGPASSWORD || env.POSTGRES_PASSWORD || "";
  const host = env.PGHOST || env.POSTGRES_HOST || "";
  const port = env.PGPORT || env.POSTGRES_PORT || "5432";
  const database = env.PGDATABASE || env.POSTGRES_DB || "railway";

  if (host && password) {
    const url =
      `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}` +
      `@${host}:${port}/${database}`;
    return { url, source: "PG*" };
  }

  return {
    url: current,
    source: current ? "DATABASE_URL_invalid" : "missing",
  };
}

export function isUsableDatabaseUrl(raw) {
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

export function applyResolvedDatabaseUrl(env = process.env) {
  const resolved = resolveDatabaseUrl(env);
  if (resolved.url) {
    env.DATABASE_URL = resolved.url;
  }
  return resolved;
}
