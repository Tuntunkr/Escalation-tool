"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import {
  clearSession,
  getStoredUser,
  mediaUrl,
  type SessionUser,
} from "@/lib/api";

function navFor(role: SessionUser["role"]) {
  const common = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/escalations", label: "Escalations" },
    { href: "/profile", label: "My Profile" },
  ];
  if (role === "SELLER") {
    return [
      ...common.slice(0, 2),
      { href: "/escalations/new", label: "New Escalation" },
      { href: "/notifications", label: "Notifications" },
      { href: "/profile", label: "My Profile" },
    ];
  }
  if (role === "ADMIN") {
    return [
      ...common.slice(0, 2),
      { href: "/admin", label: "Admin" },
      { href: "/notifications", label: "Notifications" },
      { href: "/profile", label: "My Profile" },
    ];
  }
  return [
    ...common.slice(0, 2),
    { href: "/notifications", label: "Notifications" },
    { href: "/profile", label: "My Profile" },
  ];
}

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    const u = getStoredUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    setUser(u);
  }, [router, pathname]);

  if (!user) {
    return (
      <main className="login-page">
        <p style={{ color: "var(--muted)" }}>Checking session…</p>
      </main>
    );
  }

  const links = navFor(user.role);
  const avatar = mediaUrl(user.avatarUrl);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">Escalation</div>
          <div className="brand-sub">Courier issue desk</div>
        </div>
        <nav className="nav">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={
                pathname === l.href || pathname.startsWith(l.href + "/")
                  ? "active"
                  : ""
              }
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-foot">
          <Link
            href="/profile"
            className="user-chip"
            style={{ display: "flex", flexDirection: "row", gap: 10, alignItems: "center" }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                overflow: "hidden",
                background: "rgba(255,255,255,0.12)",
                display: "grid",
                placeItems: "center",
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar}
                  alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                user.name.slice(0, 1).toUpperCase()
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <strong>{user.name}</strong>
              <span>
                {user.role} · {user.email}
              </span>
            </div>
          </Link>
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => {
              clearSession();
              router.replace("/login");
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <div className="main">{children}</div>
    </div>
  );
}
