"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { api, getStoredUser } from "@/lib/api";

type Option = { id: string; name: string; code?: string };

export default function NewEscalationPage() {
  const router = useRouter();
  const user = typeof window !== "undefined" ? getStoredUser() : null;
  const [categories, setCategories] = useState<Option[]>([]);
  const [pocs, setPocs] = useState<Option[]>([]);
  const [sellers, setSellers] = useState<Option[]>([]);
  const [awb, setAwb] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [pocId, setPocId] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      api<{ items: Option[] }>("/meta/categories"),
      api<{ items: Option[] }>("/meta/pocs"),
      api<{ items: Option[] }>("/meta/sellers"),
    ]).then(([c, p, s]) => {
      setCategories(c.items);
      setPocs(p.items);
      setSellers(s.items);
      if (c.items[0]) setCategoryId(c.items[0].id);
      if (p.items[0]) setPocId(p.items[0].id);
      if (s.items[0]) setSellerId(s.items[0].id);
    });
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("awb", awb);
      fd.append("categoryId", categoryId);
      fd.append("pocId", pocId);
      if (remarks) fd.append("remarks", remarks);
      if (user?.role !== "SELLER" && sellerId) {
        fd.append("sellerId", sellerId);
      }
      if (files) {
        Array.from(files).slice(0, 10).forEach((f) => fd.append("files", f));
      }

      const created = await api<{ id: string }>("/escalations", {
        method: "POST",
        body: fd,
      });
      router.replace(`/escalations/${created.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell>
      <div className="topbar">
        <div>
          <h1>New Escalation</h1>
          <p>Same fields as the Google Form — submitted straight to Ops.</p>
        </div>
      </div>

      <section className="panel" style={{ maxWidth: 820 }}>
        <div className="panel-head">
          <h2>Escalation Form</h2>
        </div>
        <form className="form-grid" onSubmit={onSubmit}>
          {error ? <div className="error">{error}</div> : null}

          {(user?.role === "KAM" || user?.role === "ADMIN") && (
            <div className="field">
              <label>Seller *</label>
              <select
                value={sellerId}
                onChange={(e) => setSellerId(e.target.value)}
                required
              >
                {sellers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.code ? `(${s.code})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-grid two" style={{ padding: 0 }}>
            <div className="field">
              <label>AWB / Tracking Id *</label>
              <input
                value={awb}
                onChange={(e) => setAwb(e.target.value)}
                placeholder="e.g. AWB987654321"
                required
              />
            </div>
            <div className="field">
              <label>Issue Category *</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="field">
            <label>POC *</label>
            <select
              value={pocId}
              onChange={(e) => setPocId(e.target.value)}
              required
            >
              {pocs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Remarks</label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Extra context for ops (optional)"
            />
          </div>

          <div className="field">
            <label>VOC / proof files</label>
            <input
              type="file"
              multiple
              accept="image/*,application/pdf,audio/*,video/mp4,.doc,.docx,.xls,.xlsx"
              onChange={(e) => setFiles(e.target.files)}
            />
            <span style={{ color: "var(--muted)", fontSize: "0.82rem" }}>
              Up to 10 files, 10 MB each (images, PDF, audio, docs).
              {files?.length ? ` Selected: ${files.length}` : ""}
            </span>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-primary" disabled={loading} type="submit">
              {loading ? "Submitting…" : "Submit escalation"}
            </button>
            <button
              className="btn btn-outline"
              type="button"
              onClick={() => router.back()}
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    </AppShell>
  );
}
