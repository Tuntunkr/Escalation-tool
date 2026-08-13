import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@escalation/db";
import { signToken } from "../lib/auth.js";
import { requireAuth, type AppEnv } from "../lib/middleware.js";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const signupSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().min(8).max(20).optional(),
  company: z.string().min(2).max(120),
  password: z.string().min(6).max(72),
});

export const authRoutes = new Hono<AppEnv>();

authRoutes.post("/login", zValidator("json", loginSchema), async (c) => {
  const { email, password } = c.req.valid("json");
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  if (!user || !user.active) {
    return c.json({ error: "Invalid email or password" }, 401);
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return c.json({ error: "Invalid email or password" }, 401);

  const token = await signToken({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    sellerId: user.sellerId,
    kamId: user.kamId,
    opsId: user.opsId,
  });

  return c.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      role: user.role,
      sellerId: user.sellerId,
      kamId: user.kamId,
      opsId: user.opsId,
    },
  });
});

/** Public seller self-signup — creates Seller + login User */
authRoutes.post("/signup", zValidator("json", signupSchema), async (c) => {
  const body = c.req.valid("json");
  const email = body.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return c.json({ error: "Email already registered" }, 409);
  }

  const sellerExists = await prisma.seller.findUnique({ where: { email } });
  if (sellerExists) {
    return c.json({ error: "Seller email already exists" }, 409);
  }

  const count = await prisma.seller.count();
  const code = `SEL-${String(count + 1).padStart(3, "0")}`;
  const passwordHash = await bcrypt.hash(body.password, 10);

  const seller = await prisma.seller.create({
    data: {
      code,
      name: body.company,
      company: body.company,
      email,
      phone: body.phone || null,
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
    include: { users: true },
  });

  const user = seller.users[0];
  const token = await signToken({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    sellerId: seller.id,
    kamId: null,
    opsId: null,
  });

  return c.json(
    {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        role: user.role,
        sellerId: seller.id,
        kamId: null,
        opsId: null,
      },
      seller: {
        id: seller.id,
        code: seller.code,
        name: seller.name,
      },
    },
    201
  );
});

authRoutes.get("/me", requireAuth, async (c) => {
  const payload = c.get("user");
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: {
      seller: true,
      kam: true,
      ops: true,
    },
  });
  if (!user) return c.json({ error: "User not found" }, 404);
  return c.json({
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    role: user.role,
    sellerId: user.sellerId,
    kamId: user.kamId,
    opsId: user.opsId,
    seller: user.seller,
    kam: user.kam,
    ops: user.ops,
  });
});
