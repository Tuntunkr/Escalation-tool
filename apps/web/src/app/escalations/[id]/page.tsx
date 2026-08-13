"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { StatusBadge } from "@/components/StatusBadge";
import { AgeBadge } from "@/components/AgeBadge";
import { api, getStoredUser, mediaUrl } from "@/lib/api";
import {
  STATUSES,
  STATUS_LABELS,
  type EscalationStatus,
} from "@escalation/shared";

type Detail = {
  id: string;
  awb: string;
  remarks?: string | null;
  status: EscalationStatus;
  createdAt: string;
  updatedAt: string;
  category: { name: string };
  poc: { name: string };
  seller: { name: string; code: string; email: string };
  files: Array<{
    id: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    storagePath: string;
  }>;
  comments: Array<{
    id: string;
    body: string;
    internal: boolean;
    createdAt: string;
    author: { name: string; role: string };
  }>;
  events: Array<{
    id: string;
    type: string;
    message: string;
    createdAt: string;
    actor?: { name: string; role: string } | null;
  }>;
};

export default function EscalationDetailPage() {
  const params = useParams<{ id: string }>();
  const user = typeof window !== "undefined" ? getStoredUser() : null;
  const [item, setItem] = useState<Detail | null>(null);
  const [status, setStatus] = useState<EscalationStatus>("OPEN");
  const [note, setNote] = useState("");
  const [comment, setComment] = useState("");
  const [internal, setInternal] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await api<Detail>(`/escalations/${params.id}`);
    setItem(data);
    setStatus(data.status);
  }

  useEffect(() => {
    load().catch((e) =>
      setError(e instanceof Error ? e.message : "Failed to load")
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function updateStatus(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/escalations/${params.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status, note }),
      });
      setNote("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function addComment(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/escalations/${params.id}/comments`, {
        method: "POST",
        body: JSON.stringify({ body: comment, internal }),
      });
      setComment("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Comment failed");
    } finally {
      setBusy(false);
    }
  }

  async function uploadFiles(list: FileList | null) {
    if (!list?.length) return;
    setBusy(true);
    setError("");
    try {
      const fd = new FormData();
      Array.from(list).forEach((f) => fd.append("files", f));
      await api(`/escalations/${params.id}/files`, {
        method: "POST",
        body: fd,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  const canUpdateStatus =
    user?.role === "OPS" || user?.role === "ADMIN" || user?.role === "KAM";

  return (
    <AppShell>
      {!item ? (
        <div className="empty">{error || "Loading ticket…"}</div>
      ) : (
        <>
          <div className="topbar">
            <div>
              <h1>{item.awb}</h1>
              <p>
                {item.seller.name} · {item.category.name} · POC {item.poc.name}
              </p>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <AgeBadge createdAt={item.createdAt} status={item.status} />
              <StatusBadge status={item.status} />
            </div>
          </div>

          {error ? (
            <div className="error" style={{ marginBottom: 16 }}>
              {error}
            </div>
          ) : null}

          <div className="detail-layout">
            <section className="panel">
              <div className="panel-head">
                <h2>Ticket details</h2>
              </div>
              <div className="form-grid">
                <div className="field">
                  <label>Seller</label>
                  <div>
                    <strong>{item.seller.name}</strong> ({item.seller.code})
                    <div style={{ color: "var(--muted)" }}>{item.seller.email}</div>
                  </div>
                </div>
                <div className="field">
                  <label>Remarks</label>
                  <div>{item.remarks || "—"}</div>
                </div>
                <div className="field">
                  <label>Created</label>
                  <div>{new Date(item.createdAt).toLocaleString()}</div>
                </div>

                <div className="field">
                  <label>VOC / proof files</label>
                  {item.files.length === 0 ? (
                    <div style={{ color: "var(--muted)" }}>No files yet.</div>
                  ) : (
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {item.files.map((f) => (
                        <li key={f.id} style={{ marginBottom: 6 }}>
                          <a
                            href={mediaUrl(f.storagePath) || "#"}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {f.fileName}
                          </a>{" "}
                          <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                            ({Math.round(f.sizeBytes / 1024)} KB)
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <input
                    type="file"
                    multiple
                    disabled={busy}
                    style={{ marginTop: 8 }}
                    onChange={(e) => {
                      uploadFiles(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </div>
              </div>

              {canUpdateStatus ? (
                <form
                  onSubmit={updateStatus}
                  className="form-grid"
                  style={{ borderTop: "1px solid var(--line)" }}
                >
                  <h2 style={{ margin: 0, fontFamily: "var(--font-display)" }}>
                    Update status
                  </h2>
                  <p style={{ margin: 0, color: "var(--muted)", fontSize: "0.9rem" }}>
                    Seller (+ mapped KAM) get in-app notification and email when status changes.
                  </p>
                  <div className="form-grid two" style={{ padding: 0 }}>
                    <div className="field">
                      <label>Status</label>
                      <select
                        value={status}
                        onChange={(e) =>
                          setStatus(e.target.value as EscalationStatus)
                        }
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label>Note to seller</label>
                      <input
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Optional update message"
                      />
                    </div>
                  </div>
                  <button className="btn btn-primary" disabled={busy} type="submit">
                    Save status
                  </button>
                </form>
              ) : null}

              <form
                onSubmit={addComment}
                className="form-grid"
                style={{ borderTop: "1px solid var(--line)" }}
              >
                <h2 style={{ margin: 0, fontFamily: "var(--font-display)" }}>
                  Conversation
                </h2>
                <div className="stack">
                  {item.comments.length === 0 ? (
                    <div className="empty" style={{ padding: 8 }}>
                      No comments yet.
                    </div>
                  ) : (
                    item.comments.map((c) => (
                      <div
                        key={c.id}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 10,
                          background: c.internal ? "#fff7ed" : "#f8faf8",
                          border: "1px solid var(--line)",
                        }}
                      >
                        <div style={{ fontSize: "0.8rem", color: "var(--muted)" }}>
                          {c.author.name} · {c.author.role}
                          {c.internal ? " · internal" : ""} ·{" "}
                          {new Date(c.createdAt).toLocaleString()}
                        </div>
                        <div style={{ marginTop: 6 }}>{c.body}</div>
                      </div>
                    ))
                  )}
                </div>
                <div className="field">
                  <label>Add comment</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    required
                  />
                </div>
                {user?.role !== "SELLER" ? (
                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input
                      type="checkbox"
                      checked={internal}
                      onChange={(e) => setInternal(e.target.checked)}
                    />
                    Internal note (hidden from seller)
                  </label>
                ) : null}
                <button className="btn btn-secondary" disabled={busy} type="submit">
                  Post comment
                </button>
              </form>
            </section>

            <section className="panel">
              <div className="panel-head">
                <h2>Activity</h2>
              </div>
              <ul className="timeline" style={{ padding: "8px 18px" }}>
                {item.events.map((ev) => (
                  <li key={ev.id}>
                    <div>{ev.message}</div>
                    <div className="meta">
                      {ev.actor?.name || "System"} · {ev.type} ·{" "}
                      {new Date(ev.createdAt).toLocaleString()}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </AppShell>
  );
}
