"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getAccessToken, setWorkspaceSession } from "@/lib/auth";

interface InviteInfo {
  workspaceName: string;
  invitedEmail: string;
  role: number;
  expiresAt: string;
}

const ROLE_LABEL: Record<number, string> = { 0: "Owner", 1: "Editor", 2: "Viewer" };

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "accepting" | "done" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    api.get<InviteInfo>(`/api/workspaces/invites/${token}`)
      .then((info) => { setInvite(info); setStatus("ready"); })
      .catch(() => { setStatus("error"); setErrorMsg("This invite link is invalid or has expired."); });
  }, [token]);

  async function accept() {
    if (!getAccessToken()) {
      // Not logged in — send to login with return URL
      router.push(`/login?redirect=/invite/${token}`);
      return;
    }
    setStatus("accepting");
    try {
      const res = await api.post<{ workspaceId: string; workspaceName: string }>(
        `/api/workspaces/invites/${token}/accept`, {}
      );
      setWorkspaceSession({ id: res.workspaceId, name: res.workspaceName });
      setStatus("done");
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (e: unknown) {
      setStatus("error");
      setErrorMsg(e instanceof Error ? e.message : "Failed to accept invite.");
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#0B0E14" }}
    >
      <div
        className="w-[400px] rounded-[20px] p-8 flex flex-col items-center gap-6 text-center"
        style={{ background: "#111520", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        {/* Logo */}
        <div
          className="w-[48px] h-[48px] rounded-[14px] flex items-center justify-center"
          style={{ background: "linear-gradient(135deg,#6366F1,#2DD4BF)" }}
        >
          <span className="font-[800] text-[24px]" style={{ fontFamily: "'Inter Tight'", color: "#0B0E14" }}>W</span>
        </div>

        {status === "loading" && (
          <div className="text-[#5B6573] text-[14px]">Loading invite…</div>
        )}

        {(status === "ready" || status === "accepting") && invite && (
          <>
            <div>
              <div className="text-[11px] uppercase tracking-widest text-[#5B6573] mb-1">You&apos;re invited to join</div>
              <div className="text-[22px] font-bold">{invite.workspaceName}</div>
              <div
                className="inline-block mt-2 px-3 py-1 rounded-full text-[12px] font-semibold"
                style={{ background: "rgba(99,102,241,0.14)", color: "#818CF8" }}
              >
                Role: {ROLE_LABEL[invite.role] ?? "Member"}
              </div>
            </div>

            <div className="text-[13px] text-[#5B6573]">
              Invite expires {new Date(invite.expiresAt).toLocaleDateString()}
            </div>

            <button
              onClick={accept}
              disabled={status === "accepting"}
              className="w-full py-[11px] rounded-[12px] font-semibold text-[14px] transition-colors hover:bg-[#818CF8] disabled:opacity-50"
              style={{ background: "#6366F1", color: "#0B0E14", border: "none", cursor: status === "accepting" ? "wait" : "pointer" }}
            >
              {status === "accepting" ? "Joining…" : "Accept Invite"}
            </button>

            {!getAccessToken() && (
              <div className="text-[12px] text-[#5B6573]">
                You&apos;ll need to sign in first — we&apos;ll bring you right back.
              </div>
            )}
          </>
        )}

        {status === "done" && (
          <div>
            <div className="text-[40px]">🎉</div>
            <div className="text-[16px] font-semibold mt-2">You&apos;re in!</div>
            <div className="text-[13px] text-[#5B6573] mt-1">Redirecting to dashboard…</div>
          </div>
        )}

        {status === "error" && (
          <div>
            <div className="text-[40px]">⚠️</div>
            <div className="text-[14px] text-[#FB7185] mt-2">{errorMsg}</div>
            <button
              onClick={() => router.push("/dashboard")}
              className="mt-4 text-[13px] text-[#818CF8] underline"
            >
              Go to dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
