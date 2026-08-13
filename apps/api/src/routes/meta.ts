import { Hono } from "hono";
import { prisma } from "@escalation/db";
import { requireAuth, type AppEnv } from "../lib/middleware.js";

export const metaRoutes = new Hono<AppEnv>();

metaRoutes.get("/categories", requireAuth, async (c) => {
  const items = await prisma.issueCategory.findMany({
    where: { active: true },
    orderBy: { sortOrder: "asc" },
  });
  return c.json({ items });
});

metaRoutes.get("/pocs", requireAuth, async (c) => {
  const items = await prisma.poc.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
  });
  return c.json({ items });
});

metaRoutes.get("/sellers", requireAuth, async (c) => {
  const user = c.get("user");
  if (user.role === "SELLER") {
    if (!user.sellerId) return c.json({ items: [] });
    const seller = await prisma.seller.findUnique({
      where: { id: user.sellerId },
    });
    return c.json({ items: seller ? [seller] : [] });
  }
  if (user.role === "KAM") {
    const items = await prisma.seller.findMany({
      where: { kamId: user.kamId ?? "__none__" },
      orderBy: { name: "asc" },
    });
    return c.json({ items });
  }
  const items = await prisma.seller.findMany({ orderBy: { name: "asc" } });
  return c.json({ items });
});
