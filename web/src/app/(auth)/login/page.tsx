"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const msg = await res.text();
        setError(msg || "Invalid credentials.");
        return;
      }

      const data = await res.json();
      localStorage.setItem("accessToken", data.accessToken);
      localStorage.setItem("refreshToken", data.refreshToken);

      if (data.user) {
        localStorage.setItem("userDisplayName", data.user.displayName ?? "");
        localStorage.setItem("userEmail", data.user.email ?? "");
        localStorage.setItem("userId", data.user.id ?? "");
      }

      // Fetch and store first workspace
      try {
        const wsRes = await fetch("/api/workspaces", {
          headers: { Authorization: `Bearer ${data.accessToken}` },
        });
        if (wsRes.ok) {
          const workspaces = await wsRes.json();
          if (workspaces.length > 0) {
            localStorage.setItem("workspaceId", workspaces[0].id);
            localStorage.setItem("workspaceName", workspaces[0].name);
          }
        }
      } catch {
        // workspace fetch failure shouldn't block login
      }

      router.push(redirectTo ?? "/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="rounded-[22px] p-8"
      style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <h1 className="text-[22px] font-bold tracking-tight mb-1">Welcome back</h1>
      <p className="text-[13.5px] text-[#5B6573] mb-7">Sign in to your Nest account.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-[6px]">
          <label className="text-[12.5px] font-semibold text-[#98A2B3]">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className="rounded-[11px] px-4 py-[11px] text-[14px] outline-none transition-colors"
            style={{
              background: "#0B0E14",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#EEF1F6",
            }}
            onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; }}
            onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
          />
        </div>

        <div className="flex flex-col gap-[6px]">
          <div className="flex items-center justify-between">
            <label className="text-[12.5px] font-semibold text-[#98A2B3]">Password</label>
            <span className="text-[12px] text-[#818CF8] cursor-pointer">Forgot password?</span>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            className="rounded-[11px] px-4 py-[11px] text-[14px] outline-none"
            style={{
              background: "#0B0E14",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#EEF1F6",
            }}
            onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; }}
            onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
          />
        </div>

        {error && (
          <div className="text-[13px] text-[#FB7185] px-3 py-2 rounded-[9px]" style={{ background: "rgba(251,113,133,0.10)" }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-1 rounded-[11px] py-[12px] text-[14px] font-semibold transition-colors disabled:opacity-60"
          style={{
            background: "#6366F1",
            color: "#0B0E14",
            boxShadow: "0 6px 18px rgba(99,102,241,0.35)",
            border: "none",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-[13px] text-[#5B6573]">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-[#818CF8] font-medium hover:text-[#6366F1]">
          Create one
        </Link>
      </p>
    </div>
  );
}
