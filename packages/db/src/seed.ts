import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ISSUE_CATEGORIES = [
  "Urgent Delivery",
  "Reattempt Required",
  "Delayed Pickup",
  "POD Issue",
  "Picked Up Scan Not Updated",
  "Address/Contact Number Update",
  "RTO Request",
  "RTO Reason",
  "EDD Breached",
  "Hub Address Required",
  "RTO Delivery Required",
];

const DEFAULT_POCS = [
  "Khushboo",
  "Ritesh",
  "Amar",
  "Sunita",
  "Harman",
  "Nitesh",
  "Ishita",
  "Akshita",
  "Suhani",
  "Kashish",
];

async function main() {
  for (const [index, name] of ISSUE_CATEGORIES.entries()) {
    await prisma.issueCategory.upsert({
      where: { name },
      update: { sortOrder: index, active: true },
      create: { name, sortOrder: index, active: true },
    });
  }

  for (const name of DEFAULT_POCS) {
    await prisma.poc.upsert({
      where: { name },
      update: { active: true },
      create: { name, active: true },
    });
  }

  const passwordHash = await bcrypt.hash("password123", 10);

  const kam = await prisma.kam.upsert({
    where: { email: "kam@escalation.local" },
    update: { name: "Priya KAM", phone: "9876543210", active: true },
    create: {
      name: "Priya KAM",
      email: "kam@escalation.local",
      phone: "9876543210",
      active: true,
    },
  });

  const opsDesk = await prisma.opsUser.upsert({
    where: { email: "ops@escalation.local" },
    update: { name: "Ops Desk", phone: "9876500001", active: true },
    create: {
      name: "Ops Desk",
      email: "ops@escalation.local",
      phone: "9876500001",
      active: true,
    },
  });

  // Link POC names to ops where useful
  await prisma.poc.updateMany({
    where: { name: "Nitesh" },
    data: { opsId: opsDesk.id },
  });

  const sellerA = await prisma.seller.upsert({
    where: { email: "seller1@escalation.local" },
    update: {
      kamId: kam.id,
      phone: "9000000001",
      company: "BrightCart Traders",
      active: true,
    },
    create: {
      code: "SEL-001",
      name: "BrightCart Traders",
      company: "BrightCart Traders",
      email: "seller1@escalation.local",
      phone: "9000000001",
      kamId: kam.id,
      active: true,
    },
  });

  const sellerB = await prisma.seller.upsert({
    where: { email: "seller2@escalation.local" },
    update: {
      kamId: kam.id,
      phone: "9000000002",
      company: "Nova Apparel Hub",
      active: true,
    },
    create: {
      code: "SEL-002",
      name: "Nova Apparel Hub",
      company: "Nova Apparel Hub",
      email: "seller2@escalation.local",
      phone: "9000000002",
      kamId: kam.id,
      active: true,
    },
  });

  const users = [
    {
      email: "admin@escalation.local",
      name: "Admin",
      role: "ADMIN" as const,
      phone: "9000000099",
    },
    {
      email: "ops@escalation.local",
      name: "Ops Desk",
      role: "OPS" as const,
      phone: "9876500001",
      opsId: opsDesk.id,
    },
    {
      email: "kam@escalation.local",
      name: "Priya KAM",
      role: "KAM" as const,
      phone: "9876543210",
      kamId: kam.id,
    },
    {
      email: "seller1@escalation.local",
      name: "BrightCart Owner",
      role: "SELLER" as const,
      phone: "9000000001",
      sellerId: sellerA.id,
    },
    {
      email: "seller2@escalation.local",
      name: "Nova Apparel Owner",
      role: "SELLER" as const,
      phone: "9000000002",
      sellerId: sellerB.id,
    },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        passwordHash,
        phone: u.phone,
        active: true,
        sellerId: "sellerId" in u ? u.sellerId ?? null : null,
        kamId: "kamId" in u ? u.kamId ?? null : null,
        opsId: "opsId" in u ? u.opsId ?? null : null,
      },
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        passwordHash,
        phone: u.phone,
        active: true,
        sellerId: "sellerId" in u ? u.sellerId ?? null : null,
        kamId: "kamId" in u ? u.kamId ?? null : null,
        opsId: "opsId" in u ? u.opsId ?? null : null,
      },
    });
  }

  const nitesh = await prisma.poc.findUnique({ where: { name: "Nitesh" } });
  const category = await prisma.issueCategory.findFirst({
    where: { name: "EDD Breached" },
  });

  if (nitesh && category) {
    const existing = await prisma.escalation.findFirst({
      where: { awb: "AWB100DEMO01" },
    });
    if (!existing) {
      const esc = await prisma.escalation.create({
        data: {
          awb: "AWB100DEMO01",
          remarks: "Customer asking for delivery by tomorrow evening.",
          status: "OPEN",
          sellerId: sellerA.id,
          categoryId: category.id,
          pocId: nitesh.id,
        },
      });
      await prisma.escalationEvent.create({
        data: {
          escalationId: esc.id,
          type: "CREATED",
          message: "Escalation created (seed)",
        },
      });
    }
  }

  console.log("PostgreSQL seed complete.");
  console.log("DB: escalation @ localhost:5433");
  console.log("Demo password for all users: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
