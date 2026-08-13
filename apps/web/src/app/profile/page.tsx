"use client";

import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  api,
  getStoredUser,
  mediaUrl,
  setSession,
  type SessionUser,
} from "@/lib/api";

type Profile = SessionUser & {
  phone?: string | null;
  seller?: { code: string; name: string } | null;
  kam?: { name: string } | null;
  ops?: { name: string } | null;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await api<Profile>("/profile");
    setProfile(data);
    setName(data.name);
    setPhone(data.phone || "");
    const stored = getStoredUser();
    if (stored) {
      setSession(localStorage.getItem("escalation_token") || "", {
        ...stored,
        name: data.name,
        phone: data.phone,
        avatarUrl: data.avatarUrl,
      });
    }
  }

  useEffect(() => {
    load().catch((e) =>
      setError(e instanceof Error ? e.message : "Failed to load profile")
    );
  }, []);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await api<{ token: string; user: SessionUser }>("/profile", {
        method: "PATCH",
        body: JSON.stringify({ name, phone }),
      });
      setSession(res.token, res.user);
      setProfile((p) => (p ? { ...p, ...res.user } : res.user));
      setMessage("Profile saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await api("/profile/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password change failed");
    } finally {
      setBusy(false);
    }
  }

  async function onAvatar(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const res = await api<{ token: string; user: SessionUser; avatarUrl: string }>(
        "/profile/avatar",
        { method: "POST", body: fd }
      );
      setSession(res.token, res.user);
      setProfile((p) => (p ? { ...p, ...res.user } : res.user));
      setMessage("Photo updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  const avatar = mediaUrl(profile?.avatarUrl);

  return (
    <AppShell>
      <div className="topbar">
        <div>
          <h1>My profile</h1>
          <p>Update your name, photo, and password — works for Seller, KAM, and Ops.</p>
        </div>
      </div>

      {error ? <div className="error" style={{ marginBottom: 16 }}>{error}</div> : null}
      {message ? (
        <div
          style={{
            marginBottom: 16,
            padding: "10px 12px",
            borderRadius: 10,
            background: "#ecfdf5",
            border: "1px solid #a7f3d0",
            color: "#047857",
          }}
        >
          {message}
        </div>
      ) : null}

      <div className="detail-layout">
        <section className="panel">
          <div className="panel-head">
            <h2>Profile details</h2>
          </div>
          <form className="form-grid" onSubmit={saveProfile}>
            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
              <div
                style={{
                  width: 88,
                  height: 88,
                  borderRadius: "50%",
                  overflow: "hidden",
                  background: "var(--ink)",
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  fontFamily: "var(--font-display)",
                  fontSize: "1.6rem",
                  flexShrink: 0,
                }}
              >
                {avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatar}
                    alt={profile?.name || "Avatar"}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  (profile?.name || "?").slice(0, 1).toUpperCase()
                )}
              </div>
              <div className="field" style={{ flex: 1 }}>
                <label>Profile photo</label>
                <input
                  type="file"
                  accept="image/*"
                  disabled={busy}
                  onChange={(e) => onAvatar(e.target.files?.[0] || null)}
                />
                <span style={{ color: "var(--muted)", fontSize: "0.8rem" }}>
                  JPG/PNG/WebP, max 2 MB
                </span>
              </div>
            </div>

            <div className="field">
              <label>Email (login)</label>
              <input value={profile?.email || ""} disabled />
            </div>
            <div className="field">
              <label>Role</label>
              <input value={profile?.role || ""} disabled />
            </div>
            <div className="field">
              <label>Display name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>Phone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Optional"
              />
            </div>
            {profile?.seller ? (
              <div className="field">
                <label>Seller code</label>
                <input value={`${profile.seller.code} · ${profile.seller.name}`} disabled />
              </div>
            ) : null}
            <button className="btn btn-primary" disabled={busy} type="submit">
              Save profile
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>Change password</h2>
          </div>
          <form className="form-grid" onSubmit={changePassword}>
            <div className="field">
              <label>Current password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label>New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <div className="field">
              <label>Confirm new password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
            <button className="btn btn-secondary" disabled={busy} type="submit">
              Update password
            </button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
