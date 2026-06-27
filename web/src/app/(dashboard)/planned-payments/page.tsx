"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { getWorkspaceId } from "@/lib/auth";
import { formatMoney, MoneyDto } from "@/lib/utils";
import { Topbar } from "@/components/layout/Topbar";
import { Drawer } from "@/components/ui/Drawer";
import { Icon } from "@/components/ui/Icon";

const PAYMENT_ICONS = [
  "event_repeat", "bolt", "home", "movie", "fitness_center",
  "local_hospital", "school", "directions_car", "wifi", "phone",
  "restaurant", "shopping_bag", "subscriptions", "credit_card", "water_drop",
];

interface PlannedPayment {
  id: string;
  name: string;
  amount: MoneyDto;
  dueDate: string;
  categoryId: string | null;
  isPaid: boolean;
  skippedUntil: string | null;
  note: string | null;
  icon: string;
}

interface Category {
  id: string;
  name: string;
  type: number;
  icon: string;
  color: string;
}

type Filter = "all" | "upcoming" | "overdue" | "paid";

function formatDue(dueDate: string): { text: string; color: string; isOverdue: boolean } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + "T00:00:00");
  const days = Math.round((due.getTime() - today.getTime()) / 86400000);

  if (days < 0) return { text: `Overdue by ${-days} day${-days !== 1 ? "s" : ""}`, color: "#FB7185", isOverdue: true };
  if (days === 0) return { text: "Due today", color: "#FBBF24", isOverdue: false };
  const formatted = due.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return { text: `Due ${formatted} · ${days} day${days !== 1 ? "s" : ""}`, color: "#5B6573", isOverdue: false };
}

interface PaymentRowProps {
  payment: PlannedPayment;
  onMarkPaid: (id: string) => void;
  onSkip: (id: string) => void;
  onDelete: (id: string) => void;
}

function PaymentRow({ payment, onMarkPaid, onSkip, onDelete }: PaymentRowProps) {
  const [confirming, setConfirming] = useState(false);
  const effectiveDue = payment.skippedUntil ?? payment.dueDate;
  const { text: dueText, color: dueColor, isOverdue } = formatDue(effectiveDue);

  return (
    <div
      className="flex items-center gap-4 px-5 py-4 rounded-[14px] group"
      style={{
        background: "#141925",
        border: isOverdue && !payment.isPaid ? "1px solid rgba(251,113,133,0.20)" : "1px solid rgba(255,255,255,0.06)",
        opacity: payment.isPaid ? 0.55 : 1,
      }}
    >
      <div className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0" style={{ background: isOverdue && !payment.isPaid ? "rgba(251,113,133,0.14)" : "rgba(99,102,241,0.14)" }}>
        <Icon name={payment.icon || "event_repeat"} size={20} weight={400} style={{ color: isOverdue && !payment.isPaid ? "#FB7185" : "#818CF8" }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-[13.5px] font-semibold truncate" style={{ textDecoration: payment.isPaid ? "line-through" : undefined }}>{payment.name}</div>
          {payment.isPaid && <span className="text-[10px] font-bold px-[6px] py-[2px] rounded-full flex-shrink-0" style={{ color: "#34D399", background: "rgba(52,211,153,0.14)" }}>PAID</span>}
          {payment.skippedUntil && !payment.isPaid && <span className="text-[10px] font-bold px-[6px] py-[2px] rounded-full flex-shrink-0" style={{ color: "#FBBF24", background: "rgba(251,191,36,0.14)" }}>DEFERRED</span>}
        </div>
        <div className="text-[11.5px] mt-[1px]" style={{ color: payment.isPaid ? "#5B6573" : dueColor }}>{dueText}</div>
      </div>

      <div className="text-[14px] font-semibold tabular flex-shrink-0">{formatMoney(payment.amount)}</div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!payment.isPaid && (
          <>
            <button
              onClick={() => onMarkPaid(payment.id)}
              className="w-7 h-7 flex items-center justify-center rounded-[7px] hover:bg-[rgba(52,211,153,0.14)] transition-colors"
              title="Mark as paid"
              style={{ color: "#5B6573" }}
            >
              <Icon name="check_circle" size={16} />
            </button>
            <button
              onClick={() => onSkip(payment.id)}
              className="w-7 h-7 flex items-center justify-center rounded-[7px] hover:bg-[rgba(251,191,36,0.14)] transition-colors"
              title="Defer 30 days"
              style={{ color: "#5B6573" }}
            >
              <Icon name="skip_next" size={16} />
            </button>
          </>
        )}
        {!confirming ? (
          <button onClick={() => setConfirming(true)} className="w-7 h-7 flex items-center justify-center rounded-[7px] hover:bg-[rgba(251,113,133,0.14)] transition-colors" style={{ color: "#5B6573" }}>
            <Icon name="delete" size={15} />
          </button>
        ) : (
          <div className="flex items-center gap-1">
            <button onClick={() => onDelete(payment.id)} className="px-2 py-1 rounded-[7px] text-[11px] font-semibold" style={{ background: "rgba(251,113,133,0.18)", color: "#FB7185" }}>Delete</button>
            <button onClick={() => setConfirming(false)} className="px-2 py-1 rounded-[7px] text-[11px] text-[#5B6573]">Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}

interface FormState {
  name: string;
  amount: string;
  currency: string;
  dueDate: string;
  categoryId: string;
  icon: string;
  note: string;
}

function defaultForm(): FormState {
  return {
    name: "",
    amount: "",
    currency: "USD",
    dueDate: new Date().toISOString().slice(0, 10),
    categoryId: "",
    icon: "event_repeat",
    note: "",
  };
}

export default function PlannedPaymentsPage() {
  const [payments, setPayments] = useState<PlannedPayment[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("upcoming");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(defaultForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const workspaceId = getWorkspaceId();

  const load = useCallback(() => {
    if (!workspaceId) return;
    setLoading(true);
    Promise.all([
      api.get<PlannedPayment[]>(`/api/workspaces/${workspaceId}/planned-payments`),
      api.get<Category[]>(`/api/workspaces/${workspaceId}/categories`),
    ])
      .then(([p, c]) => { setPayments(p); setCategories(c); })
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
      await api.post(`/api/workspaces/${workspaceId}/planned-payments`, {
        name: form.name,
        amount: parseFloat(form.amount),
        currency: form.currency,
        dueDate: form.dueDate,
        categoryId: form.categoryId || null,
        icon: form.icon,
      });
      setDrawerOpen(false);
      setForm(defaultForm());
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create payment.");
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkPaid(id: string) {
    if (!workspaceId) return;
    try {
      await api.patch(`/api/workspaces/${workspaceId}/planned-payments/${id}/mark-paid`);
      setPayments((prev) => prev.map((p) => p.id === id ? { ...p, isPaid: true } : p));
    } catch { /* ignore */ }
  }

  async function handleSkip(id: string) {
    if (!workspaceId) return;
    try {
      const res = await api.patch<{ id: string; skippedUntil: string }>(
        `/api/workspaces/${workspaceId}/planned-payments/${id}/skip`
      );
      setPayments((prev) => prev.map((p) => p.id === id ? { ...p, skippedUntil: res.skippedUntil, isPaid: false } : p));
    } catch { /* ignore */ }
  }

  async function handleDelete(id: string) {
    if (!workspaceId) return;
    try {
      await api.delete(`/api/workspaces/${workspaceId}/planned-payments/${id}`);
      setPayments((prev) => prev.filter((p) => p.id !== id));
    } catch { /* ignore */ }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const filtered = payments.filter((p) => {
    const effectiveDue = new Date((p.skippedUntil ?? p.dueDate) + "T00:00:00");
    if (filter === "upcoming") return !p.isPaid && effectiveDue >= today;
    if (filter === "overdue") return !p.isPaid && effectiveDue < today;
    if (filter === "paid") return p.isPaid;
    return true;
  });

  const overdueCount = payments.filter((p) => !p.isPaid && new Date((p.skippedUntil ?? p.dueDate) + "T00:00:00") < today).length;
  const upcomingCount = payments.filter((p) => !p.isPaid && new Date((p.skippedUntil ?? p.dueDate) + "T00:00:00") >= today).length;

  const actions = (
    <button
      onClick={() => { setForm(defaultForm()); setError(null); setDrawerOpen(true); }}
      className="flex items-center gap-[7px] px-[15px] py-[9px] rounded-[10px] text-[13px] font-semibold"
      style={{ background: "#6366F1", color: "#0B0E14", boxShadow: "0 6px 18px rgba(99,102,241,0.35)", border: "none", cursor: "pointer" }}
    >
      <Icon name="add" size={18} weight={500} />
      Add payment
    </button>
  );

  const FILTERS: { key: Filter; label: string; count?: number }[] = [
    { key: "upcoming", label: "Upcoming", count: upcomingCount },
    { key: "overdue", label: "Overdue", count: overdueCount },
    { key: "paid", label: "Paid" },
    { key: "all", label: "All" },
  ];

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Planned Payments" subtitle="Recurring bills and scheduled expenses." actions={actions} />

      {/* Filter bar */}
      <div className="flex items-center gap-2 px-7 py-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {FILTERS.map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className="flex items-center gap-[5px] px-[13px] py-[6px] rounded-full text-[12.5px] font-medium transition-colors"
            style={{
              background: filter === key ? "rgba(99,102,241,0.18)" : "rgba(255,255,255,0.05)",
              color: filter === key ? "#818CF8" : "#98A2B3",
            }}
          >
            {label}
            {count !== undefined && count > 0 && (
              <span className="text-[10.5px] font-bold px-[5px] py-[1px] rounded-full" style={{ background: key === "overdue" ? "rgba(251,113,133,0.2)" : "rgba(99,102,241,0.2)", color: key === "overdue" ? "#FB7185" : "#818CF8" }}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-[#5B6573]">
              <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(99,102,241,0.4)", borderTopColor: "#6366F1" }} />
              <span className="text-[13px]">Loading…</span>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-[18px] flex items-center justify-center mb-4" style={{ background: "rgba(99,102,241,0.12)" }}>
              <Icon name="event_repeat" size={28} className="text-[#818CF8]" />
            </div>
            <div className="text-[15px] font-semibold text-[#C4CBD6]">{payments.length === 0 ? "No planned payments" : "Nothing here"}</div>
            <div className="text-[13px] text-[#4B5462] mt-1 mb-5">
              {payments.length === 0 ? "Track recurring bills and scheduled expenses." : `No ${filter} payments.`}
            </div>
            {payments.length === 0 && (
              <button onClick={() => setDrawerOpen(true)} className="flex items-center gap-2 px-4 py-[10px] rounded-[10px] text-[13px] font-semibold" style={{ background: "#6366F1", color: "#0B0E14", border: "none", cursor: "pointer" }}>
                <Icon name="add" size={17} weight={500} />
                Add first payment
              </button>
            )}
          </div>
        ) : (
          <div className="px-7 py-4 flex flex-col gap-[8px]">
            {filtered.map((p) => (
              <PaymentRow key={p.id} payment={p} onMarkPaid={handleMarkPaid} onSkip={handleSkip} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setError(null); }}
        title="New planned payment"
        footer={
          <button form="payment-form" type="submit" disabled={saving} className="w-full py-[12px] rounded-[11px] text-[14px] font-semibold disabled:opacity-60" style={{ background: "#6366F1", color: "#0B0E14", border: "none", cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Saving…" : "Save payment"}
          </button>
        }
      >
        <form id="payment-form" onSubmit={handleCreate} className="flex flex-col gap-5">
          <div className="flex flex-col gap-[6px]">
            <label className="text-[12.5px] font-semibold text-[#98A2B3]">Name</label>
            <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required placeholder="e.g. Netflix" className="rounded-[11px] px-4 py-[10px] text-[14px] outline-none" style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6" }} onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; }} onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-[6px]">
              <label className="text-[12.5px] font-semibold text-[#98A2B3]">Amount</label>
              <input type="number" step="0.01" min="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required placeholder="0.00" className="rounded-[11px] px-4 py-[10px] text-[14px] outline-none tabular" style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6" }} onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; }} onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }} />
            </div>
            <div className="flex flex-col gap-[6px]">
              <label className="text-[12.5px] font-semibold text-[#98A2B3]">Currency</label>
              <input value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))} required maxLength={3} placeholder="USD" className="rounded-[11px] px-4 py-[10px] text-[14px] outline-none uppercase" style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6" }} onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; }} onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }} />
            </div>
          </div>

          <div className="flex flex-col gap-[6px]">
            <label className="text-[12.5px] font-semibold text-[#98A2B3]">Due date</label>
            <input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} required className="rounded-[11px] px-4 py-[10px] text-[14px] outline-none" style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6", colorScheme: "dark" }} onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; }} onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }} />
          </div>

          <div className="flex flex-col gap-[8px]">
            <label className="text-[12.5px] font-semibold text-[#98A2B3]">Icon</label>
            <div className="grid grid-cols-8 gap-2">
              {PAYMENT_ICONS.map((icon) => (
                <button key={icon} type="button" onClick={() => setForm((f) => ({ ...f, icon }))} className="w-9 h-9 rounded-[9px] flex items-center justify-center transition-colors" style={{ background: form.icon === icon ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.05)", border: form.icon === icon ? "1.5px solid rgba(99,102,241,0.5)" : "1.5px solid transparent", color: form.icon === icon ? "#818CF8" : "#98A2B3" }}>
                  <Icon name={icon} size={17} weight={400} />
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-[6px]">
            <label className="text-[12.5px] font-semibold text-[#98A2B3]">Category <span className="text-[#5B6573] font-normal">(optional)</span></label>
            <select value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))} className="rounded-[11px] px-4 py-[10px] text-[14px] outline-none" style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6", appearance: "none" }}>
              <option value="">No category</option>
              {categories.filter((c) => c.type === 1).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-[6px]">
            <label className="text-[12.5px] font-semibold text-[#98A2B3]">Note <span className="text-[#5B6573] font-normal">(optional)</span></label>
            <textarea value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="Any details…" rows={2} className="rounded-[11px] px-4 py-[10px] text-[14px] outline-none resize-none" style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6" }} onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; }} onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }} />
          </div>

          {error && <div className="text-[13px] text-[#FB7185] px-3 py-2 rounded-[9px]" style={{ background: "rgba(251,113,133,0.10)" }}>{error}</div>}
        </form>
      </Drawer>
    </div>
  );
}
