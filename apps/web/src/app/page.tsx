"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getStoredUser } from "@/lib/api";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const user = getStoredUser();
    router.replace(user ? "/dashboard" : "/login");
  }, [router]);

  return (
    <main className="login-page">
      <p style={{ color: "var(--muted)" }}>Loading Escalation Portal…</p>
    </main>
  );
}
