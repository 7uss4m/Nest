"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { getWorkspaceId, getUserEmail, setWorkspaceSession } from "@/lib/auth";
import { Topbar } from "@/components/layout/Topbar";
import { Icon } from "@/components/ui/Icon";

// ── Types ────────────────────────────────────────────────────────────────────

interface Member {
  userId: string;
  displayName: string;
  email: string;
  avatarUrl?: string;
  role: number; // 0=Owner, 1=Editor, 2=Viewer
  joinedAt: string;
}

interface Workspace {
  id: string;
  name: string;
  ownerId: string;
  createdAt: string;
  members: Member[];
}

const ROLE_LABELS = ["Owner", "Editor", "Viewer"];
const ROLE_COLORS = ["text-[#FBBF24]", "text-[#818CF8]", "text-[#98A2B3]"];
const ROLE_BG = ["bg-[rgba(251,191,36,0.12)]", "bg-[rgba(129,140,248,0.12)]", "bg-[rgba(152,162,179,0.08)]"];

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Page() {
  const [ws, setWs] = useState<Workspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const wsId = getWorkspaceId();
  const myEmail = getUserEmail();
  const myMember = ws?.members.find((m) => m.email === myEmail);
  const isOwner = myMember?.role === 0;

  const load = useCallback(async () => {
    if (!wsId) return;
    try {
      const data = await api.get<Workspace>(`/api/workspaces/${wsId}`);
      setWs(data);
    } catch (e: unknown) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [wsId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return (
    <div className="flex flex-col h-full">
      <Topbar title="Settings" actions={<span />} />
      <div className="flex-1 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );

  if (error || !ws) return (
    <div className="flex flex-col h-full">
      <Topbar title="Settings" actions={<span />} />
      <div className="flex-1 flex items-center justify-center text-[#98A2B3] text-sm">{error ?? "Workspace not found"}</div>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Settings" actions={<span />} />
      <div className="flex-1 overflow-y-auto p-6 max-w-2xl">
        <WorkspaceSection ws={ws} isOwner={isOwner} onRename={(name) => setWs((w) => w ? { ...w, name } : w)} />
        <MembersSection ws={ws} myEmail={myEmail} isOwner={isOwner} onReload={load} />
        <CurrenciesSection wsId={ws.id} isOwner={isOwner} />
        <ExchangeRatesSection />
        <ApiKeysSection />
        <AccountSection myMember={myMember} />
      </div>
    </div>
  );
}

// ── Workspace section ─────────────────────────────────────────────────────────

function WorkspaceSection({ ws, isOwner, onRename }: { ws: Workspace; isOwner: boolean; onRename: (n: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(ws.name);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim() || name === ws.name) { setEditing(false); return; }
    setSaving(true);
    try {
      await api.put(`/api/workspaces/${ws.id}`, { name });
      setWorkspaceSession({ id: ws.id, name });
      onRename(name);
      setEditing(false);
    } catch {
      /* keep editing open on error */
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-6">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#5B6573] mb-3">Workspace</h2>
      <div className="rounded-[18px] p-5" style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0" style={{ background: "rgba(99,102,241,0.14)" }}>
            <Icon name="workspaces" size={20} className="text-[#818CF8]" />
          </div>
          {editing ? (
            <div className="flex items-center gap-2 flex-1">
              <input
                className="flex-1 bg-[rgba(255,255,255,0.06)] text-[#EEF1F6] text-[15px] font-semibold rounded-[10px] px-3 py-1.5 outline-none border border-[rgba(99,102,241,0.4)] focus:border-[#6366F1]"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && save()}
                autoFocus
              />
              <button onClick={save} disabled={saving}
                className="px-3 py-1.5 rounded-[10px] bg-[#6366F1] text-white text-[13px] font-semibold disabled:opacity-50">
                {saving ? "…" : "Save"}
              </button>
              <button onClick={() => { setEditing(false); setName(ws.name); }}
                className="px-3 py-1.5 rounded-[10px] text-[#98A2B3] text-[13px]">
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1">
              <span className="text-[15px] font-semibold text-[#EEF1F6]">{ws.name}</span>
              {isOwner && (
                <button onClick={() => setEditing(true)} className="text-[#5B6573] hover:text-[#98A2B3] transition-colors">
                  <Icon name="edit" size={16} />
                </button>
              )}
            </div>
          )}
        </div>
        <p className="text-[11.5px] text-[#5B6573] pl-[52px]">
          Created {new Date(ws.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          {" · "}{ws.members.length} member{ws.members.length !== 1 ? "s" : ""}
        </p>
      </div>
    </section>
  );
}

// ── Members section ───────────────────────────────────────────────────────────

interface PendingInvite {
  id: string;
  invitedEmail: string;
  role: number;
  token: string;
  expiresAt: string;
}

function MembersSection({ ws, myEmail, isOwner, onReload }: { ws: Workspace; myEmail: string; isOwner: boolean; onReload: () => void }) {
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState(1); // Editor
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    if (!isOwner) return;
    api.get<PendingInvite[]>(`/api/workspaces/${ws.id}/invites`).then(setPendingInvites).catch(() => {});
  }, [ws.id, isOwner]);

  async function invite() {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteError(null);
    try {
      const res = await api.post<{ joined?: boolean; token?: string }>(
        `/api/workspaces/${ws.id}/members`, { email: inviteEmail.trim(), role: inviteRole }
      );
      setInviteEmail("");
      if (res.joined) {
        onReload();
      } else if (res.token) {
        // User not registered yet — show the invite link
        const link = `${window.location.origin}/invite/${res.token}`;
        await navigator.clipboard.writeText(link).catch(() => {});
        setCopiedToken(res.token);
        setTimeout(() => setCopiedToken(null), 3000);
        // Refresh pending invites
        api.get<PendingInvite[]>(`/api/workspaces/${ws.id}/invites`).then(setPendingInvites).catch(() => {});
      }
    } catch (e: unknown) {
      setInviteError(String(e));
    } finally {
      setInviting(false);
    }
  }

  function copyLink(token: string) {
    const link = `${window.location.origin}/invite/${token}`;
    navigator.clipboard.writeText(link).catch(() => {});
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 3000);
  }

  async function revokeInvite(id: string) {
    await api.delete(`/api/workspaces/${ws.id}/invites/${id}`).catch(() => {});
    setPendingInvites((prev) => prev.filter((i) => i.id !== id));
  }

  async function removeMember(userId: string) {
    setRemovingId(userId);
    try {
      await api.delete(`/api/workspaces/${ws.id}/members/${userId}`);
      onReload();
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <section className="mb-6">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#5B6573] mb-3">Members</h2>
      <div className="rounded-[18px] overflow-hidden" style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.06)" }}>
        {ws.members.map((m, i) => {
          const isMe = m.email === myEmail;
          const isOwnerMember = m.role === 0;
          const canRemove = isOwner && !isMe && !isOwnerMember;
          const initials = (m.displayName || m.email).slice(0, 2).toUpperCase();

          return (
            <div key={m.userId} className="flex items-center gap-3 px-5 py-4"
              style={{ borderBottom: i < ws.members.length - 1 ? "1px solid rgba(255,255,255,0.05)" : undefined }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[13px] font-bold text-white"
                style={{ background: "linear-gradient(135deg,#6366F1,#2DD4BF)" }}>
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-semibold text-[#EEF1F6] truncate">{m.displayName || m.email}</span>
                  {isMe && <span className="text-[10px] text-[#5B6573] shrink-0">(you)</span>}
                </div>
                <div className="text-[11.5px] text-[#5B6573] truncate">{m.email}</div>
              </div>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${ROLE_COLORS[m.role]} ${ROLE_BG[m.role]}`}>
                {ROLE_LABELS[m.role]}
              </span>
              {canRemove && (
                <button
                  onClick={() => removeMember(m.userId)}
                  disabled={removingId === m.userId}
                  className="ml-1 text-[#5B6573] hover:text-[#FB7185] transition-colors disabled:opacity-40"
                  title="Remove member">
                  <Icon name="person_remove" size={17} />
                </button>
              )}
            </div>
          );
        })}

        {/* Pending invites */}
        {isOwner && pendingInvites.length > 0 && (
          <div className="px-5 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[11px] font-semibold text-[#5B6573] uppercase tracking-wider mb-2">Pending Invites</p>
            {pendingInvites.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 py-2">
                <Icon name="mail" size={16} className="text-[#5B6573] shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-[13px] text-[#C4CBD6] truncate">{inv.invitedEmail}</span>
                  <span className="ml-2 text-[11px] text-[#5B6573]">· {ROLE_LABELS[inv.role]}</span>
                </div>
                <button
                  onClick={() => copyLink(inv.token)}
                  className="flex items-center gap-1 text-[12px] font-medium px-2 py-1 rounded-[8px] transition-colors hover:bg-[rgba(99,102,241,0.12)]"
                  style={{ color: copiedToken === inv.token ? "#2DD4BF" : "#818CF8" }}
                  title="Copy invite link">
                  <Icon name={copiedToken === inv.token ? "check" : "content_copy"} size={14} />
                  {copiedToken === inv.token ? "Copied!" : "Copy link"}
                </button>
                <button
                  onClick={() => revokeInvite(inv.id)}
                  className="text-[#5B6573] hover:text-[#FB7185] transition-colors"
                  title="Revoke invite">
                  <Icon name="close" size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {isOwner && (
          <div className="px-5 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-[11px] font-semibold text-[#5B6573] uppercase tracking-wider mb-3">Invite by email</p>
            <div className="flex gap-2 flex-wrap">
              <input
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && invite()}
                className="flex-1 min-w-[200px] bg-[rgba(255,255,255,0.05)] text-[#EEF1F6] text-[13px] rounded-[10px] px-3 py-2 outline-none border border-[rgba(255,255,255,0.08)] focus:border-[rgba(99,102,241,0.5)] placeholder:text-[#5B6573]"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(Number(e.target.value))}
                className="bg-[rgba(255,255,255,0.05)] text-[#EEF1F6] text-[13px] rounded-[10px] px-3 py-2 outline-none border border-[rgba(255,255,255,0.08)]">
                <option value={1}>Editor</option>
                <option value={2}>Viewer</option>
              </select>
              <button
                onClick={invite}
                disabled={inviting || !inviteEmail.trim()}
                className="px-4 py-2 rounded-[10px] bg-[#6366F1] text-white text-[13px] font-semibold disabled:opacity-50 hover:bg-[#5558E3] transition-colors">
                {inviting ? "Inviting…" : "Invite"}
              </button>
            </div>
            {copiedToken && !pendingInvites.find(i => i.token === copiedToken) && (
              <p className="text-[12px] text-[#2DD4BF] mt-2 flex items-center gap-1">
                <Icon name="check_circle" size={14} />
                User not registered — invite link copied to clipboard! Share it with them.
              </p>
            )}
            {inviteError && <p className="text-[12px] text-[#FB7185] mt-2">{inviteError}</p>}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Currencies section ────────────────────────────────────────────────────────

interface CurrencyDto {
  code: string;
  symbol: string;
  decimalPlaces: number;
  isDefault: boolean;
}

function CurrenciesSection({ wsId, isOwner }: { wsId: string; isOwner: boolean }) {
  const [currencies, setCurrencies] = useState<CurrencyDto[]>([]);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ symbol: "", decimalPlaces: 2, isDefault: false });
  const [addForm, setAddForm] = useState({ code: "", symbol: "", decimalPlaces: 2, isDefault: false });
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<CurrencyDto[]>(`/api/workspaces/${wsId}/currencies`).then(setCurrencies).catch(() => {});
  }, [wsId]);

  function startEdit(c: CurrencyDto) {
    setEditingCode(c.code);
    setEditForm({ symbol: c.symbol, decimalPlaces: c.decimalPlaces, isDefault: c.isDefault });
  }

  async function saveEdit() {
    if (!editingCode) return;
    setSaving(true);
    setError(null);
    try {
      await api.put(`/api/workspaces/${wsId}/currencies/${editingCode}`, editForm);
      setCurrencies((prev) => prev.map((c) => {
        if (c.code === editingCode) return { ...c, ...editForm };
        if (editForm.isDefault) return { ...c, isDefault: false };
        return c;
      }));
      setEditingCode(null);
    } catch (e: unknown) { setError(String(e)); } finally { setSaving(false); }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const created = await api.post<CurrencyDto>(`/api/workspaces/${wsId}/currencies`, addForm);
      setCurrencies((prev) => {
        const next = addForm.isDefault ? prev.map((c) => ({ ...c, isDefault: false })) : prev;
        return [...next, created];
      });
      setAdding(false);
      setAddForm({ code: "", symbol: "", decimalPlaces: 2, isDefault: false });
    } catch (e: unknown) { setError(String(e)); } finally { setSaving(false); }
  }

  async function handleDelete(code: string) {
    try {
      await api.delete(`/api/workspaces/${wsId}/currencies/${code}`);
      setCurrencies((prev) => prev.filter((c) => c.code !== code));
    } catch (e: unknown) { setError(String(e)); }
  }

  const inputCls = "bg-[rgba(255,255,255,0.05)] text-[#EEF1F6] text-[13px] rounded-[10px] px-3 py-2 outline-none border border-[rgba(255,255,255,0.08)] focus:border-[rgba(99,102,241,0.5)] placeholder:text-[#5B6573]";

  return (
    <section className="mb-6">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#5B6573] mb-3">Currencies</h2>
      <div className="rounded-[18px] overflow-hidden" style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.06)" }}>
        {error && (
          <div className="px-5 py-3 text-[12px] text-[#FB7185]" style={{ background: "rgba(251,113,133,0.08)" }}>{error}</div>
        )}
        {currencies.map((c, i) => (
          <div key={c.code} className="px-5 py-3.5 flex items-center gap-3"
            style={{ borderBottom: i < currencies.length - 1 || isOwner ? "1px solid rgba(255,255,255,0.04)" : undefined }}>
            {editingCode === c.code ? (
              <div className="flex-1 flex items-center gap-2 flex-wrap">
                <span className="text-[13px] font-bold text-[#EEF1F6] w-[45px]">{c.code}</span>
                <input className={inputCls + " w-[70px]"} placeholder="Symbol" value={editForm.symbol}
                  onChange={(e) => setEditForm((f) => ({ ...f, symbol: e.target.value }))} maxLength={6} />
                <input type="number" min="0" max="8" className={inputCls + " w-[70px]"} placeholder="Decimals"
                  value={editForm.decimalPlaces} onChange={(e) => setEditForm((f) => ({ ...f, decimalPlaces: parseInt(e.target.value) || 0 }))} />
                <label className="flex items-center gap-1.5 text-[12px] text-[#98A2B3] cursor-pointer">
                  <input type="checkbox" checked={editForm.isDefault} onChange={(e) => setEditForm((f) => ({ ...f, isDefault: e.target.checked }))} />
                  Default
                </label>
                <button onClick={saveEdit} disabled={saving} className="px-3 py-1.5 rounded-[9px] bg-[#6366F1] text-white text-[12px] font-semibold disabled:opacity-50">
                  {saving ? "…" : "Save"}
                </button>
                <button onClick={() => setEditingCode(null)} className="text-[#5B6573] text-[12px] hover:text-[#98A2B3]">Cancel</button>
              </div>
            ) : (
              <>
                <div className="flex-1 flex items-center gap-3">
                  <span className="text-[13.5px] font-bold text-[#EEF1F6] w-[45px]">{c.code}</span>
                  <span className="text-[13px] text-[#98A2B3]">{c.symbol}</span>
                  <span className="text-[12px] text-[#5B6573]">{c.decimalPlaces} decimal{c.decimalPlaces !== 1 ? "s" : ""}</span>
                  {c.isDefault && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(99,102,241,0.18)", color: "#818CF8" }}>DEFAULT</span>
                  )}
                </div>
                {isOwner && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => startEdit(c)} className="text-[#5B6573] hover:text-[#98A2B3] transition-colors" title="Edit">
                      <Icon name="edit" size={16} />
                    </button>
                    {!c.isDefault && currencies.length > 1 && (
                      <button onClick={() => handleDelete(c.code)} className="text-[#5B6573] hover:text-[#FB7185] transition-colors" title="Remove">
                        <Icon name="delete" size={16} />
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        ))}

        {isOwner && (
          <div className="px-5 py-4">
            {adding ? (
              <form onSubmit={handleAdd} className="flex flex-col gap-3">
                <p className="text-[11px] font-semibold text-[#5B6573] uppercase tracking-wider">Add currency</p>
                <div className="flex gap-2 flex-wrap items-center">
                  <input className={inputCls + " w-[80px] uppercase"} placeholder="Code (USD)" maxLength={10}
                    value={addForm.code} onChange={(e) => setAddForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} required />
                  <input className={inputCls + " w-[80px]"} placeholder="Symbol ($)"
                    value={addForm.symbol} onChange={(e) => setAddForm((f) => ({ ...f, symbol: e.target.value }))} maxLength={6} required />
                  <input type="number" min="0" max="8" className={inputCls + " w-[90px]"} placeholder="Decimals"
                    value={addForm.decimalPlaces} onChange={(e) => setAddForm((f) => ({ ...f, decimalPlaces: parseInt(e.target.value) || 0 }))} />
                  <label className="flex items-center gap-1.5 text-[12px] text-[#98A2B3] cursor-pointer">
                    <input type="checkbox" checked={addForm.isDefault} onChange={(e) => setAddForm((f) => ({ ...f, isDefault: e.target.checked }))} />
                    Default
                  </label>
                  <button type="submit" disabled={saving} className="px-4 py-2 rounded-[10px] bg-[#6366F1] text-white text-[13px] font-semibold disabled:opacity-50">
                    {saving ? "Adding…" : "Add"}
                  </button>
                  <button type="button" onClick={() => setAdding(false)} className="text-[#5B6573] text-[13px]">Cancel</button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="flex items-center gap-1.5 text-[13px] font-medium text-[#818CF8] hover:text-[#A5B4FC] transition-colors">
                <Icon name="add" size={16} />
                Add currency
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Exchange Rates section ────────────────────────────────────────────────────

interface ExchangeRate {
  baseCurrency: string;
  targetCurrency: string;
  rate: number;
  createdAt: string;
}

function ExchangeRatesSection() {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [base, setBase] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("baseCurrency") ?? "USD" : "USD"));
  const [target, setTarget] = useState("");
  const [rate, setRate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<ExchangeRate[]>("/api/exchange-rates").then(setRates).catch(() => {});
  }, []);

  async function save() {
    if (!base.trim() || !target.trim() || !rate) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await api.post<ExchangeRate>("/api/exchange-rates", {
        baseCurrency: base.trim().toUpperCase(),
        targetCurrency: target.trim().toUpperCase(),
        rate: parseFloat(rate),
      });
      setRates((prev) => {
        const filtered = prev.filter(
          (r) => !(r.baseCurrency === updated.baseCurrency && r.targetCurrency === updated.targetCurrency)
        );
        return [...filtered, updated];
      });
      // Store the base currency so the dashboard can convert rollups
      localStorage.setItem("baseCurrency", updated.baseCurrency);
      setTarget("");
      setRate("");
    } catch (e: unknown) {
      setError(String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mb-6">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#5B6573] mb-3">Exchange Rates</h2>
      <div className="rounded-[18px] overflow-hidden" style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.06)" }}>
        {rates.length > 0 && (
          <div className="px-5 pt-4 pb-2">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[11px] text-[#5B6573] uppercase tracking-wider">
                  <th className="pb-2 font-semibold">Pair</th>
                  <th className="pb-2 font-semibold text-right">Rate</th>
                  <th className="pb-2 font-semibold text-right">Updated</th>
                </tr>
              </thead>
              <tbody>
                {rates.map((r) => (
                  <tr key={`${r.baseCurrency}-${r.targetCurrency}`} style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                    <td className="py-2 font-semibold text-[#EEF1F6]">{r.baseCurrency} → {r.targetCurrency}</td>
                    <td className="py-2 text-right text-[#C4CBD6] tabular-nums">{r.rate.toFixed(6)}</td>
                    <td className="py-2 text-right text-[#5B6573] text-[11.5px]">
                      {new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-5 py-4" style={{ borderTop: rates.length > 0 ? "1px solid rgba(255,255,255,0.06)" : undefined }}>
          <p className="text-[11px] font-semibold text-[#5B6573] uppercase tracking-wider mb-3">Add / Update Rate</p>
          <div className="flex gap-2 flex-wrap items-center">
            <input
              placeholder="Base (e.g. USD)"
              value={base}
              onChange={(e) => setBase(e.target.value)}
              maxLength={5}
              className="w-[90px] bg-[rgba(255,255,255,0.05)] text-[#EEF1F6] text-[13px] rounded-[10px] px-3 py-2 outline-none border border-[rgba(255,255,255,0.08)] focus:border-[rgba(99,102,241,0.5)] placeholder:text-[#5B6573] uppercase"
            />
            <Icon name="arrow_forward" size={14} style={{ color: "#5B6573" }} />
            <input
              placeholder="Target (e.g. EUR)"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              maxLength={5}
              className="w-[100px] bg-[rgba(255,255,255,0.05)] text-[#EEF1F6] text-[13px] rounded-[10px] px-3 py-2 outline-none border border-[rgba(255,255,255,0.08)] focus:border-[rgba(99,102,241,0.5)] placeholder:text-[#5B6573] uppercase"
            />
            <span className="text-[#5B6573] text-[13px]">=</span>
            <input
              type="number"
              step="0.000001"
              min="0.000001"
              placeholder="Rate"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              className="w-[110px] bg-[rgba(255,255,255,0.05)] text-[#EEF1F6] text-[13px] rounded-[10px] px-3 py-2 outline-none border border-[rgba(255,255,255,0.08)] focus:border-[rgba(99,102,241,0.5)] placeholder:text-[#5B6573] tabular-nums"
            />
            <button
              onClick={save}
              disabled={saving || !base.trim() || !target.trim() || !rate}
              className="px-4 py-2 rounded-[10px] bg-[#6366F1] text-white text-[13px] font-semibold disabled:opacity-50 hover:bg-[#5558E3] transition-colors">
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
          <p className="text-[11.5px] text-[#4B5462] mt-2">
            1 {base || "BASE"} = {rate || "?"} {target || "TARGET"}. Dashboard totals convert to the base currency you specify.
          </p>
          {error && <p className="text-[12px] text-[#FB7185] mt-2">{error}</p>}
        </div>
      </div>
    </section>
  );
}

// ── API Keys section ──────────────────────────────────────────────────────────

interface ApiKeyDto {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt?: string;
}

function ApiKeysSection() {
  const [keys, setKeys] = useState<ApiKeyDto[]>([]);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<{ id: string; key: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<ApiKeyDto[]>("/api/user/api-keys").then(setKeys).catch(() => {});
  }, []);

  async function create() {
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await api.post<{ id: string; key: string; name: string; prefix: string; createdAt: string }>(
        "/api/user/api-keys", { name: name.trim() }
      );
      setNewKey({ id: res.id, key: res.key, name: res.name });
      setKeys((prev) => [{ id: res.id, name: res.name, prefix: res.prefix, createdAt: res.createdAt }, ...prev]);
      setName("");
    } catch (e: unknown) {
      setError(String(e));
    } finally {
      setCreating(false);
    }
  }

  async function revoke(id: string) {
    setRevoking(id);
    try {
      await api.delete(`/api/user/api-keys/${id}`);
      setKeys((prev) => prev.filter((k) => k.id !== id));
      if (newKey?.id === id) setNewKey(null);
    } finally {
      setRevoking(null);
    }
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <section className="mb-6">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#5B6573] mb-3">API Keys</h2>
      <div className="rounded-[18px] overflow-hidden" style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.06)" }}>

        {/* New key banner — shown once after creation */}
        {newKey && (
          <div className="px-5 py-4" style={{ background: "rgba(45,212,191,0.07)", borderBottom: "1px solid rgba(45,212,191,0.15)" }}>
            <p className="text-[11.5px] font-semibold text-[#2DD4BF] mb-2 flex items-center gap-1.5">
              <Icon name="check_circle" size={14} />
              Key created — copy it now. It won&apos;t be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-[12.5px] font-mono text-[#EEF1F6] bg-[rgba(0,0,0,0.3)] rounded-[9px] px-3 py-2 overflow-x-auto whitespace-nowrap">
                {newKey.key}
              </code>
              <button
                onClick={() => copyKey(newKey.key)}
                className="flex items-center gap-1 px-3 py-2 rounded-[9px] text-[12px] font-semibold shrink-0 transition-colors"
                style={{ background: copied ? "rgba(45,212,191,0.15)" : "rgba(99,102,241,0.15)", color: copied ? "#2DD4BF" : "#818CF8" }}>
                <Icon name={copied ? "check" : "content_copy"} size={14} />
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={() => setNewKey(null)}
                className="text-[#5B6573] hover:text-[#98A2B3] transition-colors"
                title="Dismiss">
                <Icon name="close" size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Existing keys */}
        {keys.length > 0 && keys.map((k, i) => (
          <div key={k.id} className="flex items-center gap-3 px-5 py-3.5"
            style={{ borderBottom: i < keys.length - 1 ? "1px solid rgba(255,255,255,0.04)" : undefined }}>
            <div className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0" style={{ background: "rgba(99,102,241,0.1)" }}>
              <Icon name="key" size={16} className="text-[#818CF8]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-semibold text-[#EEF1F6] truncate">{k.name}</div>
              <div className="text-[11.5px] text-[#5B6573] font-mono">
                {k.prefix}…
                {k.lastUsedAt && (
                  <span className="font-sans ml-2">
                    · last used {new Date(k.lastUsedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                )}
              </div>
            </div>
            <span className="text-[11px] text-[#5B6573] shrink-0">
              {new Date(k.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </span>
            <button
              onClick={() => revoke(k.id)}
              disabled={revoking === k.id}
              className="ml-1 text-[#5B6573] hover:text-[#FB7185] transition-colors disabled:opacity-40"
              title="Revoke key">
              <Icon name="delete" size={16} />
            </button>
          </div>
        ))}

        {keys.length === 0 && !newKey && (
          <div className="px-5 py-4 text-[13px] text-[#5B6573]">No API keys yet.</div>
        )}

        {/* Create form */}
        <div className="px-5 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[11px] font-semibold text-[#5B6573] uppercase tracking-wider mb-3">Generate new key</p>
          <div className="flex gap-2">
            <input
              placeholder="Key name (e.g. Home server)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && create()}
              className="flex-1 bg-[rgba(255,255,255,0.05)] text-[#EEF1F6] text-[13px] rounded-[10px] px-3 py-2 outline-none border border-[rgba(255,255,255,0.08)] focus:border-[rgba(99,102,241,0.5)] placeholder:text-[#5B6573]"
            />
            <button
              onClick={create}
              disabled={creating || !name.trim()}
              className="px-4 py-2 rounded-[10px] bg-[#6366F1] text-white text-[13px] font-semibold disabled:opacity-50 hover:bg-[#5558E3] transition-colors shrink-0">
              {creating ? "Creating…" : "Generate"}
            </button>
          </div>
          <p className="text-[11.5px] text-[#4B5462] mt-2">
            API keys authenticate requests and can access Swagger docs when enabled.
          </p>
          {error && <p className="text-[12px] text-[#FB7185] mt-2">{error}</p>}
        </div>
      </div>
    </section>
  );
}

// ── Account section ───────────────────────────────────────────────────────────

function AccountSection({ myMember }: { myMember?: Member }) {
  if (!myMember) return null;
  const initials = (myMember.displayName || myMember.email).slice(0, 2).toUpperCase();

  function signOut() {
    import("@/lib/auth").then(({ clearAuth }) => {
      clearAuth();
      window.location.replace("/login");
    });
  }

  return (
    <section className="mb-6">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#5B6573] mb-3">Your Account</h2>
      <div className="rounded-[18px] p-5" style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 text-[15px] font-bold text-white"
            style={{ background: "linear-gradient(135deg,#6366F1,#2DD4BF)" }}>
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[15px] font-semibold text-[#EEF1F6] truncate">{myMember.displayName}</div>
            <div className="text-[12px] text-[#5B6573] truncate">{myMember.email}</div>
          </div>
        </div>
        <div className="mt-5 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <button
            onClick={signOut}
            className="flex items-center gap-2 text-[13px] font-semibold text-[#FB7185] hover:text-[#F87185] transition-colors">
            <Icon name="logout" size={17} />
            Sign out
          </button>
        </div>
      </div>
    </section>
  );
}
