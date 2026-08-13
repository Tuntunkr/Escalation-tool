"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { api, setSession, type SessionUser } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("seller1@escalation.local");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api<{ token: string; user: SessionUser }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setSession(res.token, res.user);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="brand-sub" style={{ color: "var(--accent)", marginBottom: 8 }}>
          Operations Desk
        </div>
        <h1>Escalation Portal</h1>
        <p className="lede">
          Sellers raise AWB issues. Ops resolves. KAM tracks follow-ups — no Google Form middleman.
        </p>

        <form className="stack" onSubmit={onSubmit}>
          {error ? <div className="error">{error}</div> : null}
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button className="btn btn-primary" disabled={loading} type="submit">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="demo-box">
          Demo: seller1@ / seller2@ / kam@ / ops@ / admin@escalation.local
          <br />
          Password: <strong>password123</strong>
          <br />
          New seller? <a href="/signup">Create account</a>
        </div>
      </div>
    </main>
  );
}
