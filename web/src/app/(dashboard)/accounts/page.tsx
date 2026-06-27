"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { getWorkspaceId } from "@/lib/auth";
import { formatMoney, MoneyDto } from "@/lib/utils";
import { Topbar } from "@/components/layout/Topbar";
import { Drawer } from "@/components/ui/Drawer";
import { Icon } from "@/components/ui/Icon";

const ACCOUNT_TYPE_LABELS = ["Cash", "Bank", "Credit Card", "Savings", "Investment", "Other"];

const ACCOUNT_ICONS = [
  "account_balance", "savings", "credit_card", "payments",
  "trending_up", "wallet", "home", "diamond",
];

const ACCOUNT_COLORS = [
  "#6366F1", "#2DD4BF", "#34D399", "#FB7185",
  "#FBBF24", "#A78BFA", "#38BDF8", "#818CF8",
];

interface Account {
  id: string;
  name: string;
  type: number;
  currency: string;
  color: string;
  icon: string;
  isShared: boolean;
  balance: MoneyDto;
}

interface FormState {
  name: string;
  type: number;
  currency: string;
  color: string;
  icon: string;
  isShared: boolean;
}

const DEFAULT_FORM: FormState = {
  name: "",
  type: 1,
  currency: "USD",
  color: "#6366F1",
  icon: "account_balance",
  isShared: false,
};

function AccountCard({ account, onDelete, onToggleShared }: { account: Account; onDelete: (id: string) => void; onToggleShared: (id: string, shared: boolean) => void }) {
  const [confirming, setConfirming] = useState(false);
  const typeLabel = ACCOUNT_TYPE_LABELS[account.type] ?? "Account";
  const isNegative = account.balance.amount < 0;

  return (
    <div
      className="flex flex-col p-5 rounded-[18px] relative"
      style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      {/* Icon + name row */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0"
          style={{ background: `${account.color}22` }}
        >
          <Icon name={account.icon} size={22} weight={400} style={{ color: account.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold truncate">{account.name}</div>
          <div className="text-[11.5px] text-[#5B6573]">{typeLabel} · {account.currency}</div>
        </div>
        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            className="w-7 h-7 flex items-center justify-center rounded-[7px] opacity-0 group-hover:opacity-100 transition-colors hover:bg-[rgba(251,113,133,0.14)]"
            style={{ color: "#5B6573" }}
          >
            <Icon name="delete" size={16} />
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onDelete(account.id)}
              className="px-2 py-1 rounded-[7px] text-[11px] font-semibold"
              style={{ background: "rgba(251,113,133,0.18)", color: "#FB7185" }}
            >
              Delete
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="px-2 py-1 rounded-[7px] text-[11px] text-[#5B6573]"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Balance */}
      <div
        className="font-[700] text-[28px] tracking-[-0.02em] tabular"
        style={{ fontFamily: "'Inter Tight'", color: isNegative ? "#FB7185" : undefined }}
      >
        {isNegative ? "−" : ""}{formatMoney({ ...account.balance, amount: Math.abs(account.balance.amount) })}
      </div>

      {/* Shared toggle */}
      <button
        onClick={() => onToggleShared(account.id, !account.isShared)}
        className="mt-3 flex items-center gap-[6px] text-[11.5px] font-semibold px-3 py-[5px] rounded-full self-start transition-colors"
        style={{
          background: account.isShared ? "rgba(45,212,191,0.14)" : "rgba(255,255,255,0.05)",
          color: account.isShared ? "#2DD4BF" : "#5B6573",
          border: `1px solid ${account.isShared ? "rgba(45,212,191,0.3)" : "transparent"}`,
        }}
        title={account.isShared ? "Click to make personal" : "Click to share with workspace"}
      >
        <Icon name={account.isShared ? "group" : "person"} size={13} />
        {account.isShared ? "Shared" : "Personal"}
      </button>
    </div>
  );
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const workspaceId = getWorkspaceId();

  const load = useCallback(() => {
    if (!workspaceId) return;
    api.get<Account[]>(`/api/workspaces/${workspaceId}/accounts`)
      .then(setAccounts)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!workspaceId) return;
    setError(null);
    setSaving(true);
    try {
      await api.post(`/api/workspaces/${workspaceId}/accounts`, form);
      setDrawerOpen(false);
      setForm(DEFAULT_FORM);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create account.");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleShared(id: string, isShared: boolean) {
    if (!workspaceId) return;
    try {
      await api.put(`/api/workspaces/${workspaceId}/accounts/${id}`, { isShared });
      setAccounts((prev) => prev.map((a) => a.id === id ? { ...a, isShared } : a));
    } catch { /* ignore */ }
  }

  async function handleDelete(id: string) {
    if (!workspaceId) return;
    try {
      await api.delete(`/api/workspaces/${workspaceId}/accounts/${id}`);
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // ignore
    }
  }

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance.amount, 0);

  const actions = (
    <button
      onClick={() => setDrawerOpen(true)}
      className="flex items-center gap-[7px] px-[15px] py-[9px] rounded-[10px] text-[13px] font-semibold transition-colors"
      style={{
        background: "#6366F1",
        color: "#0B0E14",
        boxShadow: "0 6px 18px rgba(99,102,241,0.35)",
        border: "none",
        cursor: "pointer",
      }}
    >
      <Icon name="add" size={18} weight={500} />
      Add account
    </button>
  );

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Accounts" subtitle="Manage your bank accounts and wallets." actions={actions} />

      <div className="flex-1 overflow-auto p-7">
        {/* Summary */}
        {accounts.length > 0 && (
          <div className="mb-6 p-5 rounded-[18px]" style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.12),rgba(45,212,191,0.08))", border: "1px solid rgba(99,102,241,0.18)" }}>
            <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#5B6573]">Total balance</div>
            <div
              className="font-[800] text-[38px] tracking-[-0.03em] mt-1 tabular"
              style={{ fontFamily: "'Inter Tight'", color: totalBalance < 0 ? "#FB7185" : "#EEF1F6" }}
            >
              {totalBalance < 0 ? "−" : ""}{accounts[0] ? formatMoney({ ...accounts[0].balance, amount: Math.abs(totalBalance) }) : "0"}
            </div>
            <div className="text-[12px] text-[#5B6573] mt-1">{accounts.length} account{accounts.length !== 1 ? "s" : ""}</div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-[#5B6573]">
              <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(99,102,241,0.4)", borderTopColor: "#6366F1" }} />
              <span className="text-[13px]">Loading accounts…</span>
            </div>
          </div>
        ) : accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-[18px] flex items-center justify-center mb-4" style={{ background: "rgba(99,102,241,0.12)" }}>
              <Icon name="account_balance_wallet" size={28} className="text-[#818CF8]" />
            </div>
            <div className="text-[15px] font-semibold text-[#C4CBD6]">No accounts yet</div>
            <div className="text-[13px] text-[#4B5462] mt-1 mb-5">Add your first account to start tracking your finances.</div>
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-2 px-4 py-[10px] rounded-[10px] text-[13px] font-semibold"
              style={{ background: "#6366F1", color: "#0B0E14", border: "none", cursor: "pointer" }}
            >
              <Icon name="add" size={17} weight={500} />
              Add first account
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-[18px]">
            {accounts.map((a) => (
              <div key={a.id} className="group">
                <AccountCard account={a} onDelete={handleDelete} onToggleShared={handleToggleShared} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Account Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setForm(DEFAULT_FORM); setError(null); }}
        title="New account"
        footer={
          <button
            form="account-form"
            type="submit"
            disabled={saving}
            className="w-full py-[12px] rounded-[11px] text-[14px] font-semibold disabled:opacity-60"
            style={{ background: "#6366F1", color: "#0B0E14", border: "none", cursor: saving ? "not-allowed" : "pointer" }}
          >
            {saving ? "Creating…" : "Create account"}
          </button>
        }
      >
        <form id="account-form" onSubmit={handleCreate} className="flex flex-col gap-5">
          {/* Name */}
          <div className="flex flex-col gap-[6px]">
            <label className="text-[12.5px] font-semibold text-[#98A2B3]">Account name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              placeholder="e.g. Chase Checking"
              className="rounded-[11px] px-4 py-[10px] text-[14px] outline-none"
              style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6" }}
              onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
            />
          </div>

          {/* Type */}
          <div className="flex flex-col gap-[6px]">
            <label className="text-[12.5px] font-semibold text-[#98A2B3]">Account type</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: Number(e.target.value) }))}
              className="rounded-[11px] px-4 py-[10px] text-[14px] outline-none"
              style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6", appearance: "none" }}
            >
              {ACCOUNT_TYPE_LABELS.map((label, i) => (
                <option key={i} value={i}>{label}</option>
              ))}
            </select>
          </div>

          {/* Currency */}
          <div className="flex flex-col gap-[6px]">
            <label className="text-[12.5px] font-semibold text-[#98A2B3]">Currency</label>
            <input
              value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
              required
              placeholder="USD"
              maxLength={3}
              className="rounded-[11px] px-4 py-[10px] text-[14px] outline-none uppercase"
              style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6" }}
              onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
            />
          </div>

          {/* Color */}
          <div className="flex flex-col gap-[8px]">
            <label className="text-[12.5px] font-semibold text-[#98A2B3]">Color</label>
            <div className="flex gap-2 flex-wrap">
              {ACCOUNT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, color }))}
                  className="w-8 h-8 rounded-full transition-transform"
                  style={{
                    background: color,
                    outline: form.color === color ? `2px solid ${color}` : "none",
                    outlineOffset: "2px",
                    transform: form.color === color ? "scale(1.15)" : "scale(1)",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Icon */}
          <div className="flex flex-col gap-[8px]">
            <label className="text-[12.5px] font-semibold text-[#98A2B3]">Icon</label>
            <div className="grid grid-cols-8 gap-2">
              {ACCOUNT_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, icon }))}
                  className="w-9 h-9 rounded-[9px] flex items-center justify-center transition-colors"
                  style={{
                    background: form.icon === icon ? `${form.color}30` : "rgba(255,255,255,0.05)",
                    border: form.icon === icon ? `1.5px solid ${form.color}` : "1.5px solid transparent",
                    color: form.icon === icon ? form.color : "#98A2B3",
                  }}
                >
                  <Icon name={icon} size={18} weight={400} />
                </button>
              ))}
            </div>
          </div>

          {/* Shared toggle */}
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              className="relative w-10 h-6 rounded-full transition-colors flex-shrink-0"
              style={{ background: form.isShared ? "#6366F1" : "rgba(255,255,255,0.1)" }}
              onClick={() => setForm((f) => ({ ...f, isShared: !f.isShared }))}
            >
              <div
                className="absolute top-[3px] w-[18px] h-[18px] rounded-full transition-transform"
                style={{
                  background: "#EEF1F6",
                  transform: form.isShared ? "translateX(18px)" : "translateX(3px)",
                }}
              />
            </div>
            <span className="text-[13.5px] font-medium">Shared with workspace</span>
          </label>

          {error && (
            <div className="text-[13px] text-[#FB7185] px-3 py-2 rounded-[9px]" style={{ background: "rgba(251,113,133,0.10)" }}>
              {error}
            </div>
          )}
        </form>
      </Drawer>
    </div>
  );
}
