"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, email, password }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const msg = Array.isArray(data) ? data[0] : data || "Registration failed.";
        setError(msg);
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

      // Create a default workspace for new users
      try {
        const wsRes = await fetch("/api/workspaces", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.accessToken}`,
          },
          body: JSON.stringify({ name: "My Finances" }),
        });
        if (wsRes.ok) {
          const ws = await wsRes.json();
          localStorage.setItem("workspaceId", ws.id);
          localStorage.setItem("workspaceName", ws.name);
        }
      } catch {
        // workspace creation failure shouldn't block registration
      }

      router.push("/dashboard");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    background: "#0B0E14",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#EEF1F6",
  };

  function onFocus(e: React.FocusEvent<HTMLInputElement>) {
    e.target.style.borderColor = "rgba(99,102,241,0.5)";
  }
  function onBlur(e: React.FocusEvent<HTMLInputElement>) {
    e.target.style.borderColor = "rgba(255,255,255,0.08)";
  }

  return (
    <div
      className="rounded-[22px] p-8"
      style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <h1 className="text-[22px] font-bold tracking-tight mb-1">Create your account</h1>
      <p className="text-[13.5px] text-[#5B6573] mb-7">Start tracking your finances with Nest.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-[6px]">
          <label className="text-[12.5px] font-semibold text-[#98A2B3]">Display name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            placeholder="Alex Morgan"
            className="rounded-[11px] px-4 py-[11px] text-[14px] outline-none"
            style={inputStyle}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        </div>

        <div className="flex flex-col gap-[6px]">
          <label className="text-[12.5px] font-semibold text-[#98A2B3]">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className="rounded-[11px] px-4 py-[11px] text-[14px] outline-none"
            style={inputStyle}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        </div>

        <div className="flex flex-col gap-[6px]">
          <label className="text-[12.5px] font-semibold text-[#98A2B3]">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            placeholder="Min. 8 characters"
            className="rounded-[11px] px-4 py-[11px] text-[14px] outline-none"
            style={inputStyle}
            onFocus={onFocus}
            onBlur={onBlur}
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
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-[13px] text-[#5B6573]">
        Already have an account?{" "}
        <Link href="/login" className="text-[#818CF8] font-medium hover:text-[#6366F1]">
          Sign in
        </Link>
      </p>
    </div>
  );
}
