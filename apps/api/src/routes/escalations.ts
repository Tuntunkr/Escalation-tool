import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "@escalation/db";
import { STATUSES } from "@escalation/shared";
import { requireAuth, requireRoles, type AppEnv } from "../lib/middleware.js";
import {
  canAccessEscalation,
  escalationAccessWhere,
} from "../lib/access.js";
import { notifySellerUsers } from "../lib/notify.js";
import { collectFilesFromBody, saveVocFiles } from "../lib/files.js";

const createSchema = z.object({
  awb: z.string().min(3).max(64),
  categoryId: z.string().min(1),
  pocId: z.string().min(1),
  remarks: z.string().max(2000).optional(),
});

const statusSchema = z.object({
  status: z.enum(STATUSES),
  note: z.string().max(1000).optional(),
});

const commentSchema = z.object({
  body: z.string().min(1).max(2000),
  internal: z.boolean().optional(),
});

const escalationInclude = {
  category: true,
  poc: true,
  seller: { include: { kam: true } },
  files: true,
  comments: {
    include: { author: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "asc" as const },
  },
  events: {
    include: { actor: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "desc" as const },
  },
};

const OPEN_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING_ON_SELLER"] as const;

function hoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

export const escalationRoutes = new Hono<AppEnv>();

escalationRoutes.use("*", requireAuth);

escalationRoutes.get("/", async (c) => {
  const user = c.get("user");
  const status = c.req.query("status");
  const q = c.req.query("q")?.trim();
  const pocId = c.req.query("pocId");
  const categoryId = c.req.query("categoryId");
  const aging = c.req.query("aging"); // 24 | 48

  const agingFilter =
    aging === "24"
      ? {
          status: { in: [...OPEN_STATUSES] },
          createdAt: { lt: hoursAgo(24) },
        }
      : aging === "48"
        ? {
            status: { in: [...OPEN_STATUSES] },
            createdAt: { lt: hoursAgo(48) },
          }
        : {};

  const where = {
    AND: [
      escalationAccessWhere(user),
      status ? { status: status as (typeof STATUSES)[number] } : {},
      pocId ? { pocId } : {},
      categoryId ? { categoryId } : {},
      agingFilter,
      q
        ? {
            OR: [
              { awb: { contains: q, mode: "insensitive" as const } },
              { remarks: { contains: q, mode: "insensitive" as const } },
              { seller: { name: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {},
    ],
  };

  const items = await prisma.escalation.findMany({
    where,
    include: {
      category: true,
      poc: true,
      seller: true,
      _count: { select: { comments: true, files: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
  });

  return c.json({ items });
});

escalationRoutes.get("/stats", async (c) => {
  const user = c.get("user");
  const base = escalationAccessWhere(user);
  const groups = await prisma.escalation.groupBy({
    by: ["status"],
    where: base,
    _count: { _all: true },
  });
  const byStatus = Object.fromEntries(
    groups.map((g) => [g.status, g._count._all])
  );

  const [openAging24, openAging48, waitingOnSeller] = await Promise.all([
    prisma.escalation.count({
      where: {
        AND: [
          base,
          { status: { in: [...OPEN_STATUSES] } },
          { createdAt: { lt: hoursAgo(24) } },
        ],
      },
    }),
    prisma.escalation.count({
      where: {
        AND: [
          base,
          { status: { in: [...OPEN_STATUSES] } },
          { createdAt: { lt: hoursAgo(48) } },
        ],
      },
    }),
    prisma.escalation.count({
      where: {
        AND: [base, { status: "WAITING_ON_SELLER" }],
      },
    }),
  ]);

  return c.json({
    byStatus,
    openAging: openAging48,
    openAging24,
    openAging48,
    waitingOnSeller,
  });
});

escalationRoutes.get("/:id", async (c) => {
  const user = c.get("user");
  const item = await prisma.escalation.findUnique({
    where: { id: c.req.param("id") },
    include: escalationInclude,
  });
  if (!item) return c.json({ error: "Not found" }, 404);
  if (!canAccessEscalation(user, item)) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const comments =
    user.role === "SELLER"
      ? item.comments.filter((x) => !x.internal)
      : item.comments;

  return c.json({ ...item, comments });
});

async function resolveSellerId(
  user: AppEnv["Variables"]["user"],
  sellerIdParam?: string | null
) {
  let sellerId = user.sellerId;
  if (user.role === "KAM" || user.role === "ADMIN") {
    if (sellerIdParam) sellerId = sellerIdParam;
  }
  return sellerId;
}

escalationRoutes.post("/", requireRoles("SELLER", "KAM", "ADMIN"), async (c) => {
  const user = c.get("user");
  const contentType = c.req.header("content-type") || "";

  let awb = "";
  let categoryId = "";
  let pocId = "";
  let remarks: string | undefined;
  let sellerIdParam: string | null = c.req.query("sellerId") || null;
  let files: File[] = [];

  if (contentType.includes("multipart/form-data")) {
    const body = await c.req.parseBody({ all: true });
    awb = String(body.awb || "");
    categoryId = String(body.categoryId || "");
    pocId = String(body.pocId || "");
    remarks = body.remarks ? String(body.remarks) : undefined;
    if (body.sellerId) sellerIdParam = String(body.sellerId);
    files = collectFilesFromBody(body as Record<string, unknown>);
  } else {
    const json = createSchema.parse(await c.req.json());
    awb = json.awb;
    categoryId = json.categoryId;
    pocId = json.pocId;
    remarks = json.remarks;
  }

  const sellerId = await resolveSellerId(user, sellerIdParam);
  if (!sellerId) {
    return c.json({ error: "Seller account required to create escalation" }, 400);
  }
  if (user.role === "SELLER" && user.sellerId !== sellerId) {
    return c.json({ error: "Forbidden" }, 403);
  }

  const normalizedAwb = awb.trim().toUpperCase();
  if (normalizedAwb.length < 3) {
    return c.json({ error: "AWB is required" }, 400);
  }

  const [category, poc, seller] = await Promise.all([
    prisma.issueCategory.findFirst({
      where: { id: categoryId, active: true },
    }),
    prisma.poc.findFirst({ where: { id: pocId, active: true } }),
    prisma.seller.findUnique({ where: { id: sellerId } }),
  ]);

  if (!category) return c.json({ error: "Invalid category" }, 400);
  if (!poc) return c.json({ error: "Invalid POC" }, 400);
  if (!seller) return c.json({ error: "Seller not found" }, 400);
  if (user.role === "KAM" && seller.kamId !== user.kamId) {
    return c.json({ error: "Seller not in your book" }, 403);
  }

  const duplicate = await prisma.escalation.findFirst({
    where: {
      sellerId,
      awb: normalizedAwb,
      categoryId: category.id,
      status: { in: [...OPEN_STATUSES] },
    },
  });
  if (duplicate) {
    return c.json(
      {
        error: `Open escalation already exists for AWB ${normalizedAwb} (${duplicate.id})`,
        duplicateId: duplicate.id,
      },
      409
    );
  }

  const esc = await prisma.escalation.create({
    data: {
      awb: normalizedAwb,
      remarks: remarks?.trim() || null,
      sellerId,
      categoryId: category.id,
      pocId: poc.id,
      status: "OPEN",
      events: {
        create: {
          actorId: user.sub,
          type: "CREATED",
          message: `Escalation created for AWB ${normalizedAwb}`,
        },
      },
    },
  });

  if (files.length) {
    try {
      const saved = await saveVocFiles(esc.id, files);
      await prisma.escalationFile.createMany({
        data: saved.map((f) => ({
          escalationId: esc.id,
          ...f,
        })),
      });
      await prisma.escalationEvent.create({
        data: {
          escalationId: esc.id,
          actorId: user.sub,
          type: "FILES",
          message: `${saved.length} VOC file(s) uploaded`,
        },
      });
    } catch (err) {
      return c.json(
        {
          error: err instanceof Error ? err.message : "File upload failed",
          id: esc.id,
        },
        400
      );
    }
  }

  const full = await prisma.escalation.findUnique({
    where: { id: esc.id },
    include: escalationInclude,
  });

  return c.json(full, 201);
});

escalationRoutes.post(
  "/:id/files",
  requireRoles("SELLER", "KAM", "OPS", "ADMIN"),
  async (c) => {
    const user = c.get("user");
    const existing = await prisma.escalation.findUnique({
      where: { id: c.req.param("id") },
      include: { seller: true, files: true },
    });
    if (!existing) return c.json({ error: "Not found" }, 404);
    if (!canAccessEscalation(user, existing)) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const body = await c.req.parseBody({ all: true });
    const files = collectFilesFromBody(body as Record<string, unknown>);
    if (!files.length) return c.json({ error: "No files uploaded" }, 400);
    if (existing.files.length + files.length > 10) {
      return c.json({ error: "Max 10 files per escalation" }, 400);
    }

    try {
      const saved = await saveVocFiles(existing.id, files);
      await prisma.escalationFile.createMany({
        data: saved.map((f) => ({
          escalationId: existing.id,
          ...f,
        })),
      });
      await prisma.escalationEvent.create({
        data: {
          escalationId: existing.id,
          actorId: user.sub,
          type: "FILES",
          message: `${saved.length} VOC file(s) uploaded`,
        },
      });
    } catch (err) {
      return c.json(
        { error: err instanceof Error ? err.message : "Upload failed" },
        400
      );
    }

    const full = await prisma.escalation.findUnique({
      where: { id: existing.id },
      include: escalationInclude,
    });
    return c.json(full, 201);
  }
);

escalationRoutes.patch(
  "/:id/status",
  requireRoles("OPS", "ADMIN", "KAM"),
  zValidator("json", statusSchema),
  async (c) => {
    const user = c.get("user");
    const { status, note } = c.req.valid("json");
    const existing = await prisma.escalation.findUnique({
      where: { id: c.req.param("id") },
      include: { seller: true },
    });
    if (!existing) return c.json({ error: "Not found" }, 404);
    if (!canAccessEscalation(user, existing)) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const updated = await prisma.escalation.update({
      where: { id: existing.id },
      data: {
        status,
        resolvedAt:
          status === "RESOLVED" || status === "CLOSED"
            ? new Date()
            : existing.resolvedAt,
        events: {
          create: {
            actorId: user.sub,
            type: "STATUS_CHANGE",
            message: note?.trim()
              ? `Status → ${status}. ${note.trim()}`
              : `Status → ${status}`,
            meta: JSON.stringify({ from: existing.status, to: status }),
          },
        },
      },
      include: escalationInclude,
    });

    const label = status.replaceAll("_", " ");
    await notifySellerUsers(
      existing.sellerId,
      `Escalation ${updated.awb} → ${label}`,
      note?.trim()
        ? `Status changed to ${label}. Note: ${note.trim()}`
        : `Status changed to ${label}.`,
      `/escalations/${updated.id}`
    );

    return c.json(updated);
  }
);

escalationRoutes.post(
  "/:id/comments",
  zValidator("json", commentSchema),
  async (c) => {
    const user = c.get("user");
    const { body, internal } = c.req.valid("json");
    const existing = await prisma.escalation.findUnique({
      where: { id: c.req.param("id") },
      include: { seller: true },
    });
    if (!existing) return c.json({ error: "Not found" }, 404);
    if (!canAccessEscalation(user, existing)) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const isInternal = Boolean(internal) && user.role !== "SELLER";

    const comment = await prisma.comment.create({
      data: {
        escalationId: existing.id,
        authorId: user.sub,
        body: body.trim(),
        internal: isInternal,
      },
      include: {
        author: { select: { id: true, name: true, role: true } },
      },
    });

    await prisma.escalationEvent.create({
      data: {
        escalationId: existing.id,
        actorId: user.sub,
        type: "COMMENT",
        message: isInternal ? "Internal note added" : "Comment added",
      },
    });

    if (user.role !== "SELLER" && !isInternal) {
      await notifySellerUsers(
        existing.sellerId,
        `Update on ${existing.awb}`,
        body.trim().slice(0, 140),
        `/escalations/${existing.id}`
      );
    }

    return c.json(comment, 201);
  }
);
