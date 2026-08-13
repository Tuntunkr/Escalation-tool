"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { AgeBadge } from "@/components/AgeBadge";
import { api, getStoredUser } from "@/lib/api";
import { STATUSES, STATUS_LABELS, type EscalationStatus } from "@escalation/shared";

type Row = {
  id: string;
  awb: string;
  status: EscalationStatus;
  createdAt: string;
  updatedAt: string;
  category: { name: string };
  poc: { name: string };
  seller: { name: string; code: string };
  remarks?: string | null;
  _count?: { files: number; comments: number };
};

type Option = { id: string; name: string };

function EscalationsInner() {
  const searchParams = useSearchParams();
  const user = typeof window !== "undefined" ? getStoredUser() : null;
  const [items, setItems] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [pocId, setPocId] = useState("");
  const [aging, setAging] = useState(searchParams.get("aging") || "");
  const [pocs, setPocs] = useState<Option[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(nextAging = aging) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (status) params.set("status", status);
      if (pocId) params.set("pocId", pocId);
      if (nextAging) params.set("aging", nextAging);
      const res = await api<{ items: Row[] }>(`/escalations?${params}`);
      setItems(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    api<{ items: Option[] }>("/meta/pocs").then((r) => setPocs(r.items)).catch(() => {});
    const initialAging = searchParams.get("aging") || "";
    setAging(initialAging);
    load(initialAging);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppShell>
      <div className="topbar">
        <div>
          <h1>Escalations</h1>
          <p>Search AWB, filter by status / POC / SLA aging, and follow up.</p>
        </div>
        {user?.role === "SELLER" || user?.role === "KAM" || user?.role === "ADMIN" ? (
          <Link className="btn btn-primary" href="/escalations/new">
            New Escalation
          </Link>
        ) : null}
      </div>

      <section className="panel">
        <div className="filters">
          <div className="field">
            <label>Search</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="AWB or seller"
            />
          </div>
          <div className="field">
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>POC</label>
            <select value={pocId} onChange={(e) => setPocId(e.target.value)}>
              <option value="">All</option>
              {pocs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>SLA aging</label>
            <select value={aging} onChange={(e) => setAging(e.target.value)}>
              <option value="">Any age</option>
              <option value="24">Open &gt; 24h</option>
              <option value="48">Open &gt; 48h</option>
            </select>
          </div>
          <div className="field" style={{ justifyContent: "flex-end" }}>
            <label>&nbsp;</label>
            <button className="btn btn-secondary" type="button" onClick={() => load()}>
              Apply
            </button>
          </div>
        </div>

        {error ? <div className="error" style={{ margin: 16 }}>{error}</div> : null}

        {loading ? (
          <div className="empty">Loading…</div>
        ) : items.length === 0 ? (
          <div className="empty">No escalations match these filters.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>AWB</th>
                <th>Seller</th>
                <th>Issue</th>
                <th>POC</th>
                <th>Age</th>
                <th>Files</th>
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
                  <td>{item.seller.name}</td>
                  <td>{item.category.name}</td>
                  <td>{item.poc.name}</td>
                  <td>
                    <AgeBadge createdAt={item.createdAt} status={item.status} />
                  </td>
                  <td>{item._count?.files ?? 0}</td>
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

export default function EscalationsPage() {
  return (
    <Suspense
      fallback={
        <main className="login-page">
          <p style={{ color: "var(--muted)" }}>Loading escalations…</p>
        </main>
      }
    >
      <EscalationsInner />
    </Suspense>
  );
}
