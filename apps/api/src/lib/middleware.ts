import type { Context, Next } from "hono";
import { verifyToken, type JwtPayload } from "./auth.js";

export type AppEnv = {
  Variables: {
    user: JwtPayload;
  };
};

export async function requireAuth(c: Context<AppEnv>, next: Next) {
  const header = c.req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  try {
    const user = await verifyToken(header.slice(7));
    c.set("user", user);
    await next();
  } catch {
    return c.json({ error: "Invalid or expired token" }, 401);
  }
}

export function requireRoles(...roles: JwtPayload["role"][]) {
  return async (c: Context<AppEnv>, next: Next) => {
    const user = c.get("user");
    if (!roles.includes(user.role)) {
      return c.json({ error: "Forbidden" }, 403);
    }
    await next();
  };
}
