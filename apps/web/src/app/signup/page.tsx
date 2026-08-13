"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, setSession, type SessionUser } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api<{ token: string; user: SessionUser }>("/auth/signup", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setSession(res.token, res.user);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-card" style={{ width: "min(520px, 100%)" }}>
        <div className="brand-sub" style={{ color: "var(--accent)", marginBottom: 8 }}>
          Seller registration
        </div>
        <h1>Create seller account</h1>
        <p className="lede">
          Sign up once — your escalations stay private to your seller login. Ops and KAM can
          follow up without Google Forms.
        </p>

        <form className="stack" onSubmit={onSubmit}>
          {error ? <div className="error">{error}</div> : null}
          <div className="field">
            <label>Your name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>Company / Brand</label>
            <input
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="field">
            <label>Phone</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Optional"
            />
          </div>
          <div className="field">
            <label>Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              minLength={6}
              required
            />
          </div>
          <button className="btn btn-primary" disabled={loading} type="submit">
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>

        <p style={{ marginTop: 18, color: "var(--muted)" }}>
          Already registered? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
