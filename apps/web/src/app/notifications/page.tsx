"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { api } from "@/lib/api";

type Notification = {
  id: string;
  title: string;
  body: string;
  href?: string | null;
  read: boolean;
  createdAt: string;
};

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);

  async function load() {
    const res = await api<{ items: Notification[]; unread: number }>(
      "/notifications"
    );
    setItems(res.items);
    setUnread(res.unread);
  }

  useEffect(() => {
    load().catch(() => {});
  }, []);

  return (
    <AppShell>
      <div className="topbar">
        <div>
          <h1>Notifications</h1>
          <p>{unread} unread · status updates and ticket replies.</p>
        </div>
        <button
          className="btn btn-outline"
          type="button"
          onClick={() =>
            api("/notifications/read-all", { method: "POST" }).then(load)
          }
        >
          Mark all read
        </button>
      </div>

      <section className="panel">
        {items.length === 0 ? (
          <div className="empty">No notifications yet.</div>
        ) : (
          <ul className="timeline" style={{ padding: "8px 18px" }}>
            {items.map((n) => (
              <li key={n.id} style={{ opacity: n.read ? 0.7 : 1 }}>
                <strong>{n.title}</strong>
                <div>{n.body}</div>
                <div className="meta">
                  {new Date(n.createdAt).toLocaleString()}
                  {n.href ? (
                    <>
                      {" · "}
                      <Link href={n.href}>Open</Link>
                    </>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
