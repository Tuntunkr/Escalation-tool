import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { prisma } from "@escalation/db";
import { signToken } from "../lib/auth.js";
import { requireAuth, type AppEnv } from "../lib/middleware.js";
import { UPLOAD_ROOT } from "../lib/paths.js";

const profileSchema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().min(8).max(20).optional().or(z.literal("")),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6).max(72),
});

export const profileRoutes = new Hono<AppEnv>();

profileRoutes.use("*", requireAuth);

profileRoutes.get("/", async (c) => {
  const payload = c.get("user");
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    include: { seller: true, kam: true, ops: true },
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

profileRoutes.patch("/", zValidator("json", profileSchema), async (c) => {
  const payload = c.get("user");
  const body = c.req.valid("json");
  const phone = body.phone?.trim() ? body.phone.trim() : null;

  const user = await prisma.user.update({
    where: { id: payload.sub },
    data: {
      name: body.name.trim(),
      phone,
    },
  });

  // Keep directory records in sync
  if (user.sellerId) {
    await prisma.seller.update({
      where: { id: user.sellerId },
      data: { phone },
    });
  }
  if (user.kamId) {
    await prisma.kam.update({
      where: { id: user.kamId },
      data: { name: body.name.trim(), phone },
    });
  }
  if (user.opsId) {
    await prisma.opsUser.update({
      where: { id: user.opsId },
      data: { name: body.name.trim(), phone },
    });
  }

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

profileRoutes.post("/password", zValidator("json", passwordSchema), async (c) => {
  const payload = c.get("user");
  const body = c.req.valid("json");
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) return c.json({ error: "User not found" }, 404);

  const ok = await bcrypt.compare(body.currentPassword, user.passwordHash);
  if (!ok) return c.json({ error: "Current password is incorrect" }, 400);

  const passwordHash = await bcrypt.hash(body.newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  return c.json({ ok: true, message: "Password updated" });
});

profileRoutes.post("/avatar", async (c) => {
  const payload = c.get("user");
  const body = await c.req.parseBody();
  const file = body.avatar;

  if (!file || !(file instanceof File)) {
    return c.json({ error: "Avatar file required" }, 400);
  }

  if (!file.type.startsWith("image/")) {
    return c.json({ error: "Only image files allowed" }, 400);
  }

  if (file.size > 2 * 1024 * 1024) {
    return c.json({ error: "Image must be under 2 MB" }, 400);
  }

  const ext = extname(file.name).toLowerCase() || ".jpg";
  const safeExt = [".jpg", ".jpeg", ".png", ".webp", ".gif"].includes(ext)
    ? ext
    : ".jpg";

  await mkdir(join(UPLOAD_ROOT, "avatars"), { recursive: true });
  const fileName = `${payload.sub}${safeExt}`;
  const diskPath = join(UPLOAD_ROOT, "avatars", fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(diskPath, buffer);

  const avatarUrl = `/uploads/avatars/${fileName}?v=${Date.now()}`;
  const user = await prisma.user.update({
    where: { id: payload.sub },
    data: { avatarUrl },
  });

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
    avatarUrl: user.avatarUrl,
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
