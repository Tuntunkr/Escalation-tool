import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@escalation/db";
import { requireAuth, requireRoles, type AppEnv } from "../lib/middleware.js";

export const adminRoutes = new Hono<AppEnv>();

adminRoutes.use("*", requireAuth, requireRoles("ADMIN"));

adminRoutes.get("/sellers", async (c) => {
  const items = await prisma.seller.findMany({
    include: {
      kam: true,
      users: { select: { id: true, name: true, email: true, active: true } },
      _count: { select: { escalations: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return c.json({ items });
});

const sellerSchema = z.object({
  code: z.string().min(2).max(32).optional(),
  name: z.string().min(2).max(120),
  company: z.string().min(2).max(120).optional(),
  email: z.string().email(),
  phone: z.string().min(8).max(20).optional(),
  kamId: z.string().optional().nullable(),
  password: z.string().min(6).default("password123"),
});

adminRoutes.post("/sellers", zValidator("json", sellerSchema), async (c) => {
  const body = c.req.valid("json");
  const email = body.email.toLowerCase();
  const passwordHash = await bcrypt.hash(body.password, 10);
  const count = await prisma.seller.count();
  const code = (body.code || `SEL-${String(count + 1).padStart(3, "0")}`).toUpperCase();

  const seller = await prisma.seller.create({
    data: {
      code,
      name: body.name,
      company: body.company || body.name,
      email,
      phone: body.phone || null,
      kamId: body.kamId || null,
      active: true,
      users: {
        create: {
          email,
          name: body.name,
          phone: body.phone || null,
          role: "SELLER",
          passwordHash,
          active: true,
        },
      },
    },
    include: { kam: true, _count: { select: { escalations: true } } },
  });

  return c.json(seller, 201);
});

adminRoutes.get("/kams", async (c) => {
  const items = await prisma.kam.findMany({
    include: {
      users: { select: { id: true, email: true, active: true } },
      _count: { select: { sellers: true } },
    },
    orderBy: { name: "asc" },
  });
  return c.json({ items });
});

const kamSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(8).max(20).optional(),
  password: z.string().min(6).default("password123"),
});

adminRoutes.post("/kams", zValidator("json", kamSchema), async (c) => {
  const body = c.req.valid("json");
  const email = body.email.toLowerCase();
  const passwordHash = await bcrypt.hash(body.password, 10);

  const kam = await prisma.kam.create({
    data: {
      name: body.name,
      email,
      phone: body.phone || null,
      active: true,
      users: {
        create: {
          email,
          name: body.name,
          phone: body.phone || null,
          role: "KAM",
          passwordHash,
          active: true,
        },
      },
    },
    include: { _count: { select: { sellers: true } } },
  });

  // link user.kamId
  await prisma.user.updateMany({
    where: { email, role: "KAM" },
    data: { kamId: kam.id },
  });

  return c.json(kam, 201);
});

adminRoutes.get("/ops", async (c) => {
  const items = await prisma.opsUser.findMany({
    include: {
      users: { select: { id: true, email: true, active: true } },
      pocs: true,
      _count: { select: { users: true, pocs: true } },
    },
    orderBy: { name: "asc" },
  });
  return c.json({ items });
});

const opsSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(8).max(20).optional(),
  password: z.string().min(6).default("password123"),
  createPoc: z.boolean().optional().default(true),
});

adminRoutes.post("/ops", zValidator("json", opsSchema), async (c) => {
  const body = c.req.valid("json");
  const email = body.email.toLowerCase();
  const passwordHash = await bcrypt.hash(body.password, 10);

  const ops = await prisma.opsUser.create({
    data: {
      name: body.name,
      email,
      phone: body.phone || null,
      active: true,
      users: {
        create: {
          email,
          name: body.name,
          phone: body.phone || null,
          role: "OPS",
          passwordHash,
          active: true,
        },
      },
      pocs: body.createPoc
        ? {
            create: {
              name: body.name,
              active: true,
            },
          }
        : undefined,
    },
    include: { pocs: true },
  });

  await prisma.user.updateMany({
    where: { email, role: "OPS" },
    data: { opsId: ops.id },
  });

  return c.json(ops, 201);
});

adminRoutes.patch(
  "/sellers/:id/kam",
  zValidator("json", z.object({ kamId: z.string().nullable() })),
  async (c) => {
    const { kamId } = c.req.valid("json");
    const seller = await prisma.seller.update({
      where: { id: c.req.param("id") },
      data: { kamId },
      include: { kam: true },
    });
    return c.json(seller);
  }
);
