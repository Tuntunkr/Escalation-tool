import { Hono } from "hono";
import { prisma } from "@escalation/db";
import { requireAuth, type AppEnv } from "../lib/middleware.js";

export const notificationRoutes = new Hono<AppEnv>();

notificationRoutes.use("*", requireAuth);

notificationRoutes.get("/", async (c) => {
  const user = c.get("user");
  const items = await prisma.notification.findMany({
    where: { userId: user.sub },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  const unread = await prisma.notification.count({
    where: { userId: user.sub, read: false },
  });
  return c.json({ items, unread });
});

notificationRoutes.post("/read-all", async (c) => {
  const user = c.get("user");
  await prisma.notification.updateMany({
    where: { userId: user.sub, read: false },
    data: { read: true },
  });
  return c.json({ ok: true });
});
