"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { api, getStoredUser } from "@/lib/api";
import { useRouter } from "next/navigation";

type Seller = {
  id: string;
  code: string;
  name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  kam?: { id: string; name: string } | null;
  _count: { escalations: number };
};

type Kam = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  _count: { sellers: number };
};

type Ops = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  pocs: Array<{ id: string; name: string }>;
};

export default function AdminPage() {
  const router = useRouter();
  const user = typeof window !== "undefined" ? getStoredUser() : null;
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [kams, setKams] = useState<Kam[]>([]);
  const [ops, setOps] = useState<Ops[]>([]);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"sellers" | "kams" | "ops">("sellers");

  const [sellerForm, setSellerForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    kamId: "",
    password: "password123",
  });
  const [kamForm, setKamForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "password123",
  });
  const [opsForm, setOpsForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "password123",
  });

  async function load() {
    const [s, k, o] = await Promise.all([
      api<{ items: Seller[] }>("/admin/sellers"),
      api<{ items: Kam[] }>("/admin/kams"),
      api<{ items: Ops[] }>("/admin/ops"),
    ]);
    setSellers(s.items);
    setKams(k.items);
    setOps(o.items);
  }

  useEffect(() => {
    if (user && user.role !== "ADMIN") {
      router.replace("/dashboard");
      return;
    }
    load().catch((e) => setError(e instanceof Error ? e.message : "Failed"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createSeller(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/admin/sellers", {
        method: "POST",
        body: JSON.stringify({
          ...sellerForm,
          kamId: sellerForm.kamId || null,
        }),
      });
      setSellerForm({
        name: "",
        email: "",
        phone: "",
        company: "",
        kamId: "",
        password: "password123",
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }

  async function createKam(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/admin/kams", {
        method: "POST",
        body: JSON.stringify(kamForm),
      });
      setKamForm({ name: "", email: "", phone: "", password: "password123" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }

  async function createOps(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/admin/ops", {
        method: "POST",
        body: JSON.stringify({ ...opsForm, createPoc: true }),
      });
      setOpsForm({ name: "", email: "", phone: "", password: "password123" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }

  return (
    <AppShell>
      <div className="topbar">
        <div>
          <h1>People & accounts</h1>
          <p>Seller list, KAM list, and Operations team — all saved in PostgreSQL.</p>
        </div>
      </div>

      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-head">
          <h2>How accounts are created</h2>
        </div>
        <div className="form-grid" style={{ color: "var(--muted)", fontSize: "0.95rem" }}>
          <p style={{ margin: 0 }}>
            <strong style={{ color: "var(--ink)" }}>Seller</strong> — self signup at{" "}
            <code>/signup</code>, OR Admin creates here (Sellers tab) and shares password.
          </p>
          <p style={{ margin: 0 }}>
            <strong style={{ color: "var(--ink)" }}>KAM</strong> — only Admin creates (KAM tab).
            Then assign sellers to that KAM so they see those tickets.
          </p>
          <p style={{ margin: 0 }}>
            <strong style={{ color: "var(--ink)" }}>Operations</strong> — only Admin creates (Operations tab).
            Creating ops also adds their name as a POC on the escalation form.
          </p>
          <p style={{ margin: 0 }}>
            After login, everyone manages name / photo / password from{" "}
            <strong style={{ color: "var(--ink)" }}>My Profile</strong>.
          </p>
        </div>
      </section>

      {error ? (
        <div className="error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(
          [
            ["sellers", "Sellers"],
            ["kams", "KAM"],
            ["ops", "Operations"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={tab === key ? "btn btn-primary" : "btn btn-outline"}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "sellers" ? (
        <div className="detail-layout">
          <section className="panel">
            <div className="panel-head">
              <h2>Add seller</h2>
            </div>
            <form className="form-grid" onSubmit={createSeller}>
              <div className="field">
                <label>Owner name</label>
                <input
                  value={sellerForm.name}
                  onChange={(e) =>
                    setSellerForm({ ...sellerForm, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="field">
                <label>Company</label>
                <input
                  value={sellerForm.company}
                  onChange={(e) =>
                    setSellerForm({ ...sellerForm, company: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  value={sellerForm.email}
                  onChange={(e) =>
                    setSellerForm({ ...sellerForm, email: e.target.value })
                  }
                  required
                />
              </div>
              <div className="field">
                <label>Phone</label>
                <input
                  value={sellerForm.phone}
                  onChange={(e) =>
                    setSellerForm({ ...sellerForm, phone: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label>Assign KAM</label>
                <select
                  value={sellerForm.kamId}
                  onChange={(e) =>
                    setSellerForm({ ...sellerForm, kamId: e.target.value })
                  }
                >
                  <option value="">Unassigned</option>
                  {kams.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.name}
                    </option>
                  ))}
                </select>
              </div>
              <button className="btn btn-primary" type="submit">
                Save seller
              </button>
            </form>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Seller list ({sellers.length})</h2>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Name</th>
                  <th>KAM</th>
                  <th>Tickets</th>
                </tr>
              </thead>
              <tbody>
                {sellers.map((s) => (
                  <tr key={s.id}>
                    <td>{s.code}</td>
                    <td>
                      {s.name}
                      <div style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                        {s.email}
                        {s.phone ? ` · ${s.phone}` : ""}
                      </div>
                    </td>
                    <td>{s.kam?.name || "—"}</td>
                    <td>{s._count.escalations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      ) : null}

      {tab === "kams" ? (
        <div className="detail-layout">
          <section className="panel">
            <div className="panel-head">
              <h2>Add KAM</h2>
            </div>
            <form className="form-grid" onSubmit={createKam}>
              <div className="field">
                <label>Name</label>
                <input
                  value={kamForm.name}
                  onChange={(e) => setKamForm({ ...kamForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  value={kamForm.email}
                  onChange={(e) =>
                    setKamForm({ ...kamForm, email: e.target.value })
                  }
                  required
                />
              </div>
              <div className="field">
                <label>Phone</label>
                <input
                  value={kamForm.phone}
                  onChange={(e) =>
                    setKamForm({ ...kamForm, phone: e.target.value })
                  }
                />
              </div>
              <button className="btn btn-primary" type="submit">
                Save KAM
              </button>
            </form>
          </section>
          <section className="panel">
            <div className="panel-head">
              <h2>KAM list ({kams.length})</h2>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Sellers</th>
                </tr>
              </thead>
              <tbody>
                {kams.map((k) => (
                  <tr key={k.id}>
                    <td>{k.name}</td>
                    <td>
                      {k.email}
                      {k.phone ? ` · ${k.phone}` : ""}
                    </td>
                    <td>{k._count.sellers}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      ) : null}

      {tab === "ops" ? (
        <div className="detail-layout">
          <section className="panel">
            <div className="panel-head">
              <h2>Add operations member</h2>
            </div>
            <form className="form-grid" onSubmit={createOps}>
              <div className="field">
                <label>Name (also becomes POC)</label>
                <input
                  value={opsForm.name}
                  onChange={(e) => setOpsForm({ ...opsForm, name: e.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  value={opsForm.email}
                  onChange={(e) =>
                    setOpsForm({ ...opsForm, email: e.target.value })
                  }
                  required
                />
              </div>
              <div className="field">
                <label>Phone</label>
                <input
                  value={opsForm.phone}
                  onChange={(e) =>
                    setOpsForm({ ...opsForm, phone: e.target.value })
                  }
                />
              </div>
              <button className="btn btn-primary" type="submit">
                Save ops user
              </button>
            </form>
          </section>
          <section className="panel">
            <div className="panel-head">
              <h2>Operations list ({ops.length})</h2>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>POC link</th>
                </tr>
              </thead>
              <tbody>
                {ops.map((o) => (
                  <tr key={o.id}>
                    <td>{o.name}</td>
                    <td>
                      {o.email}
                      {o.phone ? ` · ${o.phone}` : ""}
                    </td>
                    <td>{o.pocs.map((p) => p.name).join(", ") || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}
