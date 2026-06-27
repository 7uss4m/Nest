"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { getWorkspaceId } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { Topbar } from "@/components/layout/Topbar";
import { Drawer } from "@/components/ui/Drawer";
import { Icon } from "@/components/ui/Icon";

interface Budget {
  id: string;
  period: number;
  amountLimit: number;
  rollover: boolean;
  categoryId: string;
}

interface Category {
  id: string;
  name: string;
  type: number;
  icon: string;
  color: string;
}

interface CategorySpend {
  categoryId: string;
  total: number;
}

interface BudgetRowProps {
  budget: Budget;
  cat: Category;
  spent: number;
  onDelete: (id: string) => void;
}

function BudgetRow({ budget, cat, spent, onDelete }: BudgetRowProps) {
  const [confirming, setConfirming] = useState(false);
  const pct = Math.min((spent / budget.amountLimit) * 100, 100);
  const over = spent > budget.amountLimit;

  return (
    <div className="p-5 rounded-[16px]" style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: `${cat.color}22` }}>
          <Icon name={cat.icon} size={19} weight={400} style={{ color: cat.color }} />
        </div>
        <div className="flex-1">
          <div className="text-[14px] font-semibold">{cat.name}</div>
          <div className="text-[11.5px] text-[#5B6573]">Monthly{budget.rollover ? " · rollover ↻" : ""}</div>
        </div>
        <div className="flex items-center gap-2">
          {over && (
            <span className="text-[10px] font-bold px-[7px] py-[2px] rounded-full" style={{ color: "#FB7185", background: "rgba(251,113,133,0.14)" }}>OVER</span>
          )}
          <span className="text-[13px] tabular font-semibold" style={{ color: over ? "#FB7185" : "#EEF1F6" }}>
            {formatCurrency(spent)}
          </span>
          <span className="text-[13px] text-[#5B6573]">/ {formatCurrency(budget.amountLimit)}</span>
          {!confirming ? (
            <button onClick={() => setConfirming(true)} className="w-7 h-7 flex items-center justify-center rounded-[7px] ml-1 hover:bg-[rgba(251,113,133,0.14)] transition-colors" style={{ color: "#5B6573" }}>
              <Icon name="delete" size={15} />
            </button>
          ) : (
            <div className="flex items-center gap-1 ml-1">
              <button onClick={() => onDelete(budget.id)} className="px-2 py-1 rounded-[7px] text-[11px] font-semibold" style={{ background: "rgba(251,113,133,0.18)", color: "#FB7185" }}>Delete</button>
              <button onClick={() => setConfirming(false)} className="px-2 py-1 rounded-[7px] text-[11px] text-[#5B6573]">Cancel</button>
            </div>
          )}
        </div>
      </div>
      <div className="h-[7px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: over ? "#FB7185" : cat.color }} />
      </div>
    </div>
  );
}

interface FormState {
  categoryId: string;
  amountLimit: string;
  rollover: boolean;
}

const DEFAULT_FORM: FormState = { categoryId: "", amountLimit: "", rollover: false };

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [spending, setSpending] = useState<CategorySpend[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const workspaceId = getWorkspaceId();

  const load = useCallback(() => {
    if (!workspaceId) return;
    setLoading(true);
    Promise.all([
      api.get<Budget[]>(`/api/workspaces/${workspaceId}/budgets`),
      api.get<Category[]>(`/api/workspaces/${workspaceId}/categories`),
      api.get<CategorySpend[]>(`/api/workspaces/${workspaceId}/dashboard/spending-by-category`),
    ])
      .then(([b, c, s]) => { setBudgets(b); setCategories(c); setSpending(s); })
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
      await api.post(`/api/workspaces/${workspaceId}/budgets`, {
        categoryId: form.categoryId,
        period: 0,
        amountLimit: parseFloat(form.amountLimit),
        rollover: form.rollover,
      });
      setDrawerOpen(false);
      setForm(DEFAULT_FORM);
      load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create budget.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!workspaceId) return;
    try {
      await api.delete(`/api/workspaces/${workspaceId}/budgets/${id}`);
      setBudgets((prev) => prev.filter((b) => b.id !== id));
    } catch { /* ignore */ }
  }

  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const spendMap = new Map(spending.map((s) => [s.categoryId, s.total]));
  const expenseCategories = categories.filter((c) => c.type === 1);
  const budgetCategoryIds = new Set(budgets.map((b) => b.categoryId));
  const availableCategories = expenseCategories.filter((c) => !budgetCategoryIds.has(c.id));

  const totalBudgeted = budgets.reduce((s, b) => s + b.amountLimit, 0);
  const totalSpent = budgets.reduce((s, b) => s + (spendMap.get(b.categoryId) ?? 0), 0);

  const actions = (
    <button
      onClick={() => { setForm(DEFAULT_FORM); setError(null); setDrawerOpen(true); }}
      className="flex items-center gap-[7px] px-[15px] py-[9px] rounded-[10px] text-[13px] font-semibold"
      style={{ background: "#6366F1", color: "#0B0E14", boxShadow: "0 6px 18px rgba(99,102,241,0.35)", border: "none", cursor: "pointer" }}
    >
      <Icon name="add" size={18} weight={500} />
      Add budget
    </button>
  );

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Budgets" subtitle="Monthly spending limits by category." actions={actions} />

      <div className="flex-1 overflow-auto p-7">
        {budgets.length > 0 && (
          <div className="grid grid-cols-3 gap-[18px] mb-6">
            {[
              { label: "Total budgeted", value: formatCurrency(totalBudgeted), icon: "account_balance_wallet", color: "#818CF8" },
              { label: "Spent this month", value: formatCurrency(totalSpent), icon: "north_east", color: "#FB7185" },
              { label: "Remaining", value: formatCurrency(Math.max(0, totalBudgeted - totalSpent)), icon: "savings", color: "#34D399" },
            ].map((s) => (
              <div key={s.label} className="p-4 rounded-[16px]" style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon name={s.icon} size={16} style={{ color: s.color }} />
                  <span className="text-[12px] text-[#5B6573]">{s.label}</span>
                </div>
                <div className="text-[22px] font-[700] tabular" style={{ fontFamily: "'Inter Tight'", color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-[#5B6573]">
              <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(99,102,241,0.4)", borderTopColor: "#6366F1" }} />
              <span className="text-[13px]">Loading budgets…</span>
            </div>
          </div>
        ) : budgets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-[18px] flex items-center justify-center mb-4" style={{ background: "rgba(99,102,241,0.12)" }}>
              <Icon name="donut_small" size={28} className="text-[#818CF8]" />
            </div>
            <div className="text-[15px] font-semibold text-[#C4CBD6]">No budgets yet</div>
            <div className="text-[13px] text-[#4B5462] mt-1 mb-5">Set monthly spending limits to stay on track.</div>
            <button onClick={() => setDrawerOpen(true)} className="flex items-center gap-2 px-4 py-[10px] rounded-[10px] text-[13px] font-semibold" style={{ background: "#6366F1", color: "#0B0E14", border: "none", cursor: "pointer" }}>
              <Icon name="add" size={17} weight={500} />
              Create first budget
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-[10px]">
            {budgets.map((b) => {
              const cat = categoryMap.get(b.categoryId);
              if (!cat) return null;
              return (
                <BudgetRow
                  key={b.id}
                  budget={b}
                  cat={cat}
                  spent={spendMap.get(b.categoryId) ?? 0}
                  onDelete={handleDelete}
                />
              );
            })}
          </div>
        )}
      </div>

      <Drawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setError(null); }}
        title="New budget"
        footer={
          <button form="budget-form" type="submit" disabled={saving} className="w-full py-[12px] rounded-[11px] text-[14px] font-semibold disabled:opacity-60" style={{ background: "#6366F1", color: "#0B0E14", border: "none", cursor: saving ? "not-allowed" : "pointer" }}>
            {saving ? "Creating…" : "Create budget"}
          </button>
        }
      >
        <form id="budget-form" onSubmit={handleCreate} className="flex flex-col gap-5">
          <div className="flex flex-col gap-[6px]">
            <label className="text-[12.5px] font-semibold text-[#98A2B3]">Category</label>
            {availableCategories.length === 0 ? (
              <div className="text-[13px] text-[#5B6573] py-2">All expense categories already have budgets.</div>
            ) : (
              <select
                value={form.categoryId}
                onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                required
                className="rounded-[11px] px-4 py-[10px] text-[14px] outline-none"
                style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6", appearance: "none" }}
              >
                <option value="" disabled>Select a category</option>
                {availableCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex flex-col gap-[6px]">
            <label className="text-[12.5px] font-semibold text-[#98A2B3]">Monthly limit</label>
            <input
              type="number" step="0.01" min="1"
              value={form.amountLimit}
              onChange={(e) => setForm((f) => ({ ...f, amountLimit: e.target.value }))}
              required placeholder="500.00"
              className="rounded-[11px] px-4 py-[10px] text-[14px] outline-none tabular"
              style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6" }}
              onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative w-10 h-6 rounded-full transition-colors flex-shrink-0" style={{ background: form.rollover ? "#6366F1" : "rgba(255,255,255,0.1)" }} onClick={() => setForm((f) => ({ ...f, rollover: !f.rollover }))}>
              <div className="absolute top-[3px] w-[18px] h-[18px] rounded-full transition-transform" style={{ background: "#EEF1F6", transform: form.rollover ? "translateX(18px)" : "translateX(3px)" }} />
            </div>
            <div>
              <div className="text-[13.5px] font-medium">Rollover unused budget</div>
              <div className="text-[11.5px] text-[#5B6573]">Carry remaining balance to next month</div>
            </div>
          </label>

          {error && <div className="text-[13px] text-[#FB7185] px-3 py-2 rounded-[9px]" style={{ background: "rgba(251,113,133,0.10)" }}>{error}</div>}
        </form>
      </Drawer>
    </div>
  );
}
