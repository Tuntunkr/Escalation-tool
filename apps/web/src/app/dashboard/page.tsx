"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { AgeBadge } from "@/components/AgeBadge";
import { api, getStoredUser } from "@/lib/api";
import type { EscalationStatus } from "@escalation/shared";

type Stats = {
  byStatus: Record<string, number>;
  openAging: number;
  openAging24?: number;
  openAging48?: number;
  waitingOnSeller?: number;
};

type EscalationRow = {
  id: string;
  awb: string;
  status: EscalationStatus;
  createdAt: string;
  category: { name: string };
  poc: { name: string };
  seller: { name: string; code: string };
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [items, setItems] = useState<EscalationRow[]>([]);
  const [agingItems, setAgingItems] = useState<EscalationRow[]>([]);
  const [error, setError] = useState("");
  const user = typeof window !== "undefined" ? getStoredUser() : null;

  useEffect(() => {
    Promise.all([
      api<Stats>("/escalations/stats"),
      api<{ items: EscalationRow[] }>("/escalations"),
      api<{ items: EscalationRow[] }>("/escalations?aging=24"),
    ])
      .then(([s, list, aging]) => {
        setStats(s);
        setItems(list.items.slice(0, 8));
        setAgingItems(aging.items.slice(0, 8));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, []);

  const open =
    (stats?.byStatus.OPEN || 0) +
    (stats?.byStatus.IN_PROGRESS || 0) +
    (stats?.byStatus.WAITING_ON_SELLER || 0);

  const showSla = user?.role === "KAM" || user?.role === "OPS" || user?.role === "ADMIN";

  return (
    <AppShell>
      <div className="topbar">
        <div>
          <h1>Dashboard</h1>
          <p>
            {user?.role === "SELLER"
              ? "Track your AWB escalations and status updates."
              : user?.role === "KAM"
                ? "Follow up aging tickets across your sellers."
                : "Resolve courier issues assigned to the ops desk."}
          </p>
        </div>
        {user?.role === "SELLER" || user?.role === "KAM" || user?.role === "ADMIN" ? (
          <Link className="btn btn-primary" href="/escalations/new">
            New Escalation
          </Link>
        ) : null}
      </div>

      {error ? <div className="error">{error}</div> : null}

      <div className="grid-stats">
        <div className="stat">
          <div className="label">Active</div>
          <div className="value">{open}</div>
        </div>
        <div className="stat">
          <div className="label">Open</div>
          <div className="value">{stats?.byStatus.OPEN || 0}</div>
        </div>
        <div className="stat">
          <div className="label">Resolved</div>
          <div className="value">{stats?.byStatus.RESOLVED || 0}</div>
        </div>
        <div className="stat">
          <div className="label">Aging &gt; 48h</div>
          <div className="value">{stats?.openAging48 || stats?.openAging || 0}</div>
        </div>
      </div>

      {showSla ? (
        <section className="panel" style={{ marginBottom: 16 }}>
          <div className="panel-head">
            <h2>SLA follow-up (open &gt; 24h)</h2>
            <Link href="/escalations?aging=24">View all aging</Link>
          </div>
          {agingItems.length === 0 ? (
            <div className="empty">No aging tickets — nice.</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>AWB</th>
                  <th>Seller</th>
                  <th>Age</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {agingItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link href={`/escalations/${item.id}`}>
                        <strong>{item.awb}</strong>
                      </Link>
                    </td>
                    <td>{item.seller.name}</td>
                    <td>
                      <AgeBadge createdAt={item.createdAt} status={item.status} />
                    </td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ) : null}

      <section className="panel">
        <div className="panel-head">
          <h2>Recent escalations</h2>
          <Link href="/escalations">View all</Link>
        </div>
        {items.length === 0 ? (
          <div className="empty">No escalations yet.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>AWB</th>
                <th>Seller</th>
                <th>Category</th>
                <th>POC</th>
                <th>Age</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link href={`/escalations/${item.id}`}>
                      <strong>{item.awb}</strong>
                    </Link>
                  </td>
                  <td>
                    {item.seller.name}
                    <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                      {item.seller.code}
                    </div>
                  </td>
                  <td>{item.category.name}</td>
                  <td>{item.poc.name}</td>
                  <td>
                    <AgeBadge createdAt={item.createdAt} status={item.status} />
                  </td>
                  <td>
                    <StatusBadge status={item.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
