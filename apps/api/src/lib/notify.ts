import { prisma } from "@escalation/db";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

export async function notifyUser(opts: {
  userId: string;
  title: string;
  body: string;
  href?: string;
}) {
  return prisma.notification.create({
    data: {
      userId: opts.userId,
      title: opts.title,
      body: opts.body,
      href: opts.href,
    },
  });
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}) {
  const key = process.env.RESEND_API_KEY;
  const from =
    process.env.EMAIL_FROM || "Escalation Portal <onboarding@resend.dev>";

  if (!key) {
    console.log("[email:skipped — set RESEND_API_KEY to send]", {
      to: opts.to,
      subject: opts.subject,
    });
    return { skipped: true as const };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[email:failed]", res.status, text);
    return { skipped: false as const, ok: false as const };
  }

  return { skipped: false as const, ok: true as const };
}

export async function notifySellerUsers(
  sellerId: string,
  title: string,
  body: string,
  href?: string
) {
  const users = await prisma.user.findMany({
    where: { sellerId, role: "SELLER", active: true },
  });

  const seller = await prisma.seller.findUnique({
    where: { id: sellerId },
    include: {
      kam: { include: { users: { where: { role: "KAM", active: true } } } },
    },
  });

  const link = href ? `${APP_URL}${href}` : APP_URL;
  const html = `
    <div style="font-family:sans-serif;line-height:1.5">
      <h2>${title}</h2>
      <p>${body}</p>
      <p><a href="${link}">Open ticket</a></p>
    </div>
  `;

  await Promise.all(
    users.map(async (u) => {
      await notifyUser({ userId: u.id, title, body, href });
      await sendEmail({ to: u.email, subject: title, html });
    })
  );

  // Also ping mapped KAM (in-app + email)
  const kamUsers = seller?.kam?.users || [];
  await Promise.all(
    kamUsers.map(async (u) => {
      await notifyUser({
        userId: u.id,
        title: `[KAM] ${title}`,
        body,
        href,
      });
      await sendEmail({
        to: u.email,
        subject: `[KAM] ${title}`,
        html,
      });
    })
  );
}
