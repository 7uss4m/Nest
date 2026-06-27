"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getWorkspaceId } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { Topbar } from "@/components/layout/Topbar";
import { Drawer } from "@/components/ui/Drawer";
import { Icon } from "@/components/ui/Icon";

const LIABILITY_TYPE_LABELS = [
  "Mortgage", "Vehicle Loan", "Personal Loan", "Credit Card",
  "Student Loan", "Business Loan", "Owed to Person", "Other",
];
const LIABILITY_TYPE_ICONS = [
  "home", "directions_car", "person", "credit_card",
  "school", "business_center", "handshake", "category",
];
const LIABILITY_TYPE_COLORS = [
  "#6366F1", "#FBBF24", "#FB7185", "#F97316",
  "#38BDF8", "#818CF8", "#A78BFA", "#98A2B3",
];

interface Liability {
  id: string;
  name: string;
  type: number;
  lenderName?: string;
  originalAmount: number;
  currentBalance: number;
  currency: string;
  interestRate?: number;
  monthlyPayment?: number;
  startDate?: string;
  dueDate?: string;
  isShared: boolean;
  notes?: string;
  createdAt: string;
}

interface LiabilityRowProps {
  liability: Liability;
  onDelete: (id: string) => void;
  onUpdateBalance: (liability: Liability) => void;
}

function LiabilityRow({ liability, onDelete, onUpdateBalance }: LiabilityRowProps) {
  const [confirming, setConfirming] = useState(false);
  const color = LIABILITY_TYPE_COLORS[liability.type] ?? "#98A2B3";
  const icon = LIABILITY_TYPE_ICONS[liability.type] ?? "category";
  const paidOff = liability.originalAmount > 0
    ? Math.min(((liability.originalAmount - liability.currentBalance) / liability.originalAmount) * 100, 100)
    : 0;

  return (
    <div
      className="p-5 rounded-[16px]"
      style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: `${color}22` }}
        >
          <Icon name={icon} size={20} weight={400} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[14px] font-semibold text-[#EEF1F6] truncate">{liability.name}</div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => onUpdateBalance(liability)}
                className="flex items-center gap-1 px-2 py-1 rounded-[8px] text-[11px] font-semibold transition-colors"
                style={{ background: `${color}18`, color }}
              >
                <Icon name="edit" size={13} />
                Update
              </button>
              <Link
                href={`/liabilities/${liability.id}`}
                className="flex items-center gap-1 px-2 py-1 rounded-[8px] text-[11px] font-semibold transition-colors"
                style={{ background: "rgba(255,255,255,0.05)", color: "#98A2B3", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                <Icon name="open_in_new" size={12} />
                Details
              </Link>
              {!confirming ? (
                <button
                  onClick={() => setConfirming(true)}
                  className="w-7 h-7 flex items-center justify-center rounded-[8px] hover:bg-[rgba(251,113,133,0.14)] transition-colors"
                  style={{ color: "#5B6573" }}
                >
                  <Icon name="delete" size={15} />
                </button>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onDelete(liability.id)}
                    className="px-2 py-1 rounded-[7px] text-[11px] font-semibold"
                    style={{ background: "rgba(251,113,133,0.18)", color: "#FB7185" }}
                  >
                    Delete
                  </button>
                  <button onClick={() => setConfirming(false)} className="px-2 py-1 rounded-[7px] text-[11px] text-[#5B6573]">
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="text-[11.5px] text-[#5B6573] mt-0.5">
            {LIABILITY_TYPE_LABELS[liability.type]}
            {liability.lenderName && ` · ${liability.lenderName}`}
            {liability.interestRate && ` · ${liability.interestRate}% APR`}
            {liability.isShared && " · Shared"}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-[20px] font-[700] tabular" style={{ fontFamily: "'Inter Tight'", color: "#FB7185" }}>
            {formatCurrency(liability.currentBalance, liability.currency)}
          </div>
          <div className="text-[11.5px] text-[#5B6573]">
            of {formatCurrency(liability.originalAmount, liability.currency)} original
            {liability.monthlyPayment && ` · ${formatCurrency(liability.monthlyPayment)}/mo`}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[13px] font-semibold" style={{ color: "#34D399" }}>
            {paidOff.toFixed(0)}% paid
          </div>
          <div className="text-[11.5px] text-[#5B6573]">
            {formatCurrency(liability.originalAmount - liability.currentBalance, liability.currency)} paid off
          </div>
        </div>
      </div>

      <div className="h-[6px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${paidOff}%`, background: "#34D399" }}
        />
      </div>
    </div>
  );
}

interface FormState {
  name: string;
  type: string;
  lenderName: string;
  originalAmount: string;
  currentBalance: string;
  currency: string;
  interestRate: string;
  monthlyPayment: string;
  startDate: string;
  dueDate: string;
  isShared: boolean;
  notes: string;
  linkedAssetId: string;
}

const DEFAULT_FORM: FormState = {
  name: "", type: "0", lenderName: "", originalAmount: "", currentBalance: "",
  currency: "USD", interestRate: "", monthlyPayment: "", startDate: "", dueDate: "",
  isShared: false, notes: "", linkedAssetId: "",
};

export default function LiabilitiesPage() {
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [assets, setAssets] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [balanceDrawerLiability, setBalanceDrawerLiability] = useState<Liability | null>(null);
  const [newBalance, setNewBalance] = useState("");
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const workspaceId = getWorkspaceId();
  const base = `/api/workspaces/${workspaceId}`;

  const load = useCallback(() => {
    if (!workspaceId) return;
    setLoading(true);
    Promise.all([
      api.get<Liability[]>(`${base}/liabilities`),
      api.get<{ id: string; name: string }[]>(`${base}/assets`),
    ])
      .then(([l, a]) => { setLiabilities(l); setAssets(a); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId, base]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!workspaceId) return;
    setError(null);
    setSaving(true);
    try {
      await api.post(`${base}/liabilities`, {
        name: form.name,
        type: parseInt(form.type),
        lenderName: form.lenderName || undefined,
        originalAmount: parseFloat(form.originalAmount),
        currentBalance: parseFloat(form.currentBalance || form.originalAmount),
        currency: form.currency,
        interestRate: form.interestRate ? parseFloat(form.interestRate) : undefined,
        monthlyPayment: form.monthlyPayment ? parseFloat(form.monthlyPayment) : undefined,
        startDate: form.startDate || undefined,
        dueDate: form.dueDate || undefined,
        isShared: form.isShared,
        notes: form.notes || undefined,
        linkedAssetId: form.linkedAssetId || undefined,
      });
      setDrawerOpen(false);
      setForm(DEFAULT_FORM);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create liability.");
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateBalance(e: React.FormEvent) {
    e.preventDefault();
    if (!workspaceId || !balanceDrawerLiability) return;
    setSaving(true);
    try {
      await api.post(`${base}/liabilities/${balanceDrawerLiability.id}/balance`, { balance: parseFloat(newBalance) });
      setBalanceDrawerLiability(null);
      setNewBalance("");
      load();
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!workspaceId) return;
    try {
      await api.delete(`${base}/liabilities/${id}`);
      setLiabilities((prev) => prev.filter((l) => l.id !== id));
    } catch { /* ignore */ }
  }

  const totalDebt = liabilities.reduce((s, l) => s + l.currentBalance, 0);
  const totalOriginal = liabilities.reduce((s, l) => s + l.originalAmount, 0);

  const byType = LIABILITY_TYPE_LABELS.map((label, i) => ({
    label, count: liabilities.filter((l) => l.type === i).length,
    value: liabilities.filter((l) => l.type === i).reduce((s, l) => s + l.currentBalance, 0),
    color: LIABILITY_TYPE_COLORS[i],
  })).filter((t) => t.count > 0);

  const actions = (
    <button
      onClick={() => { setForm(DEFAULT_FORM); setError(null); setDrawerOpen(true); }}
      className="flex items-center gap-[7px] px-[15px] py-[9px] rounded-[10px] text-[13px] font-semibold"
      style={{ background: "#6366F1", color: "#0B0E14", boxShadow: "0 6px 18px rgba(99,102,241,0.35)", border: "none", cursor: "pointer" }}
    >
      <Icon name="add" size={18} weight={500} />
      Add liability
    </button>
  );

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Liabilities" subtitle="Track what you owe." actions={actions} />

      <div className="flex-1 overflow-auto p-7">
        {liabilities.length > 0 && (
          <div
            className="rounded-[20px] p-5 mb-7 flex items-center gap-6"
            style={{ background: "linear-gradient(135deg,rgba(251,113,133,0.14),rgba(251,113,133,0.06))", border: "1px solid rgba(251,113,133,0.18)" }}
          >
            <div className="flex-1">
              <div className="text-[12px] text-[#98A2B3] mb-1">Total Debt</div>
              <div className="text-[32px] font-[800] tabular" style={{ fontFamily: "'Inter Tight'", color: "#FB7185" }}>
                {formatCurrency(totalDebt)}
              </div>
              <div className="text-[12px] mt-1" style={{ color: "#34D399" }}>
                {formatCurrency(totalOriginal - totalDebt)} paid off overall
              </div>
            </div>
            {byType.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {byType.map((t) => (
                  <div key={t.label} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.color }} />
                    <span className="text-[11.5px] text-[#98A2B3]">{t.label}</span>
                    <span className="text-[11.5px] font-semibold tabular ml-auto" style={{ color: t.color }}>{formatCurrency(t.value)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-[#5B6573]">
              <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(99,102,241,0.4)", borderTopColor: "#6366F1" }} />
              <span className="text-[13px]">Loading liabilities…</span>
            </div>
          </div>
        ) : liabilities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-[18px] flex items-center justify-center mb-4" style={{ background: "rgba(251,113,133,0.10)" }}>
              <Icon name="trending_down" size={28} style={{ color: "#FB7185" }} />
            </div>
            <div className="text-[15px] font-semibold text-[#C4CBD6]">No liabilities yet</div>
            <div className="text-[13px] text-[#4B5462] mt-1 mb-5">Track loans, mortgages, and other debts.</div>
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-2 px-4 py-[10px] rounded-[10px] text-[13px] font-semibold"
              style={{ background: "#6366F1", color: "#0B0E14", border: "none", cursor: "pointer" }}
            >
              <Icon name="add" size={17} weight={500} />
              Add first liability
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {liabilities.map((l) => (
              <LiabilityRow
                key={l.id}
                liability={l}
                onDelete={handleDelete}
                onUpdateBalance={(liability) => { setBalanceDrawerLiability(liability); setNewBalance(String(liability.currentBalance)); }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Liability Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setError(null); }}
        title="Add liability"
        footer={
          <button
            form="liability-form"
            type="submit"
            disabled={saving}
            className="w-full py-[12px] rounded-[11px] text-[14px] font-semibold disabled:opacity-60"
            style={{ background: "#6366F1", color: "#0B0E14", border: "none", cursor: saving ? "not-allowed" : "pointer" }}
          >
            {saving ? "Adding…" : "Add liability"}
          </button>
        }
      >
        <form id="liability-form" onSubmit={handleCreate} className="flex flex-col gap-5">
          <div className="flex flex-col gap-[6px]">
            <label className="text-[12.5px] font-semibold text-[#98A2B3]">Name</label>
            <input
              value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required placeholder="e.g. Home Mortgage"
              className="rounded-[11px] px-4 py-[10px] text-[14px] outline-none"
              style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6" }}
              onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-[6px]">
              <label className="text-[12.5px] font-semibold text-[#98A2B3]">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="rounded-[11px] px-4 py-[10px] text-[14px] outline-none"
                style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6", appearance: "none" }}
              >
                {LIABILITY_TYPE_LABELS.map((label, i) => (
                  <option key={i} value={i}>{label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-[6px]">
              <label className="text-[12.5px] font-semibold text-[#98A2B3]">Currency</label>
              <input
                value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase().slice(0, 3) }))}
                placeholder="USD"
                className="rounded-[11px] px-4 py-[10px] text-[14px] outline-none tabular"
                style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6" }}
                onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-[6px]">
              <label className="text-[12.5px] font-semibold text-[#98A2B3]">Original amount</label>
              <input
                type="number" step="0.01" min="0"
                value={form.originalAmount} onChange={(e) => setForm((f) => ({ ...f, originalAmount: e.target.value }))}
                required placeholder="0.00"
                className="rounded-[11px] px-4 py-[10px] text-[14px] outline-none tabular"
                style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6" }}
                onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
              />
            </div>
            <div className="flex flex-col gap-[6px]">
              <label className="text-[12.5px] font-semibold text-[#98A2B3]">Current balance</label>
              <input
                type="number" step="0.01" min="0"
                value={form.currentBalance} onChange={(e) => setForm((f) => ({ ...f, currentBalance: e.target.value }))}
                placeholder="Same as original"
                className="rounded-[11px] px-4 py-[10px] text-[14px] outline-none tabular"
                style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6" }}
                onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-[6px]">
            <label className="text-[12.5px] font-semibold text-[#98A2B3]">Lender / Institution</label>
            <input
              value={form.lenderName} onChange={(e) => setForm((f) => ({ ...f, lenderName: e.target.value }))}
              placeholder="Optional"
              className="rounded-[11px] px-4 py-[10px] text-[14px] outline-none"
              style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6" }}
              onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-[6px]">
              <label className="text-[12.5px] font-semibold text-[#98A2B3]">Interest rate (%)</label>
              <input
                type="number" step="0.01" min="0" max="100"
                value={form.interestRate} onChange={(e) => setForm((f) => ({ ...f, interestRate: e.target.value }))}
                placeholder="Optional"
                className="rounded-[11px] px-4 py-[10px] text-[14px] outline-none tabular"
                style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6" }}
                onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
              />
            </div>
            <div className="flex flex-col gap-[6px]">
              <label className="text-[12.5px] font-semibold text-[#98A2B3]">Monthly payment</label>
              <input
                type="number" step="0.01" min="0"
                value={form.monthlyPayment} onChange={(e) => setForm((f) => ({ ...f, monthlyPayment: e.target.value }))}
                placeholder="Optional"
                className="rounded-[11px] px-4 py-[10px] text-[14px] outline-none tabular"
                style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6" }}
                onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-[6px]">
              <label className="text-[12.5px] font-semibold text-[#98A2B3]">Start date</label>
              <input
                type="date"
                value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                className="rounded-[11px] px-4 py-[10px] text-[14px] outline-none"
                style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6", colorScheme: "dark" }}
                onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
              />
            </div>
            <div className="flex flex-col gap-[6px]">
              <label className="text-[12.5px] font-semibold text-[#98A2B3]">Payoff date</label>
              <input
                type="date"
                value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="rounded-[11px] px-4 py-[10px] text-[14px] outline-none"
                style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6", colorScheme: "dark" }}
                onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
              />
            </div>
          </div>

          {assets.length > 0 && (
            <div className="flex flex-col gap-[6px]">
              <label className="text-[12.5px] font-semibold text-[#98A2B3]">Linked asset <span className="text-[#5B6573] font-normal">(optional)</span></label>
              <select
                value={form.linkedAssetId}
                onChange={(e) => setForm((f) => ({ ...f, linkedAssetId: e.target.value }))}
                className="rounded-[11px] px-4 py-[10px] text-[14px] outline-none"
                style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6", appearance: "none" }}
              >
                <option value="">None</option>
                {assets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}

          <label className="flex items-center gap-3 cursor-pointer">
            <div
              className="relative w-10 h-6 rounded-full transition-colors flex-shrink-0"
              style={{ background: form.isShared ? "#6366F1" : "rgba(255,255,255,0.1)" }}
              onClick={() => setForm((f) => ({ ...f, isShared: !f.isShared }))}
            >
              <div
                className="absolute top-[3px] w-[18px] h-[18px] rounded-full transition-transform"
                style={{ background: "#EEF1F6", transform: form.isShared ? "translateX(18px)" : "translateX(3px)" }}
              />
            </div>
            <span className="text-[13.5px] font-medium">Shared liability</span>
          </label>

          {error && (
            <div className="text-[13px] text-[#FB7185] px-3 py-2 rounded-[9px]" style={{ background: "rgba(251,113,133,0.10)" }}>
              {error}
            </div>
          )}
        </form>
      </Drawer>

      {/* Update Balance Drawer */}
      <Drawer
        open={balanceDrawerLiability !== null}
        onClose={() => { setBalanceDrawerLiability(null); setNewBalance(""); }}
        title={`Update balance — ${balanceDrawerLiability?.name ?? ""}`}
        footer={
          <button
            form="balance-form"
            type="submit"
            disabled={saving}
            className="w-full py-[12px] rounded-[11px] text-[14px] font-semibold disabled:opacity-60"
            style={{ background: "#6366F1", color: "#0B0E14", border: "none", cursor: saving ? "not-allowed" : "pointer" }}
          >
            {saving ? "Saving…" : "Save new balance"}
          </button>
        }
      >
        <form id="balance-form" onSubmit={handleUpdateBalance} className="flex flex-col gap-5">
          {balanceDrawerLiability && (
            <div className="text-[12.5px] text-[#5B6573]">
              Current balance: <span className="text-[#EEF1F6] font-semibold tabular">{formatCurrency(balanceDrawerLiability.currentBalance, balanceDrawerLiability.currency)}</span>
            </div>
          )}
          <div className="flex flex-col gap-[6px]">
            <label className="text-[12.5px] font-semibold text-[#98A2B3]">New balance</label>
            <input
              type="number" step="0.01" min="0"
              value={newBalance} onChange={(e) => setNewBalance(e.target.value)}
              required placeholder="0.00"
              className="rounded-[11px] px-4 py-[10px] text-[14px] outline-none tabular"
              style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6" }}
              onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
            />
          </div>
        </form>
      </Drawer>
    </div>
  );
}
