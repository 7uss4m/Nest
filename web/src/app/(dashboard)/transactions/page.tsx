"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { getWorkspaceId } from "@/lib/auth";
import { formatMoney, MoneyDto } from "@/lib/utils";
import { Topbar } from "@/components/layout/Topbar";
import { Drawer } from "@/components/ui/Drawer";
import { Icon } from "@/components/ui/Icon";

// 0=Income 1=Expense 2=Transfer
const TX_TYPE_LABELS = ["Income", "Expense", "Transfer"];
const TX_TYPE_ICONS = ["south_west", "north_east", "swap_horiz"];
const TX_TYPE_COLORS = ["#34D399", "#FB7185", "#818CF8"];
const TX_TYPE_BG = ["rgba(52,211,153,0.14)", "rgba(251,113,133,0.14)", "rgba(99,102,241,0.14)"];

interface Transaction {
  id: string;
  type: number;
  amount: MoneyDto;
  date: string;
  note: string | null;
  payee: string | null;
  accountId: string;
  categoryId: string | null;
  createdAt: string;
}

interface Account {
  id: string;
  name: string;
  type: number;
  currency: string;
  color: string;
  icon: string;
}

interface Category {
  id: string;
  name: string;
  type: number;
  icon: string;
  color: string;
}

interface Template {
  id: string;
  name: string;
  type: number;
  amount: number | null;
  accountId: string | null;
  categoryId: string | null;
  payee: string | null;
  note: string | null;
}

interface FormState {
  type: number;
  amount: string;
  date: string;
  accountId: string;
  categoryId: string;
  payee: string;
  note: string;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function DEFAULT_FORM(accounts: Account[]): FormState {
  return {
    type: 1,
    amount: "",
    date: todayIso(),
    accountId: accounts[0]?.id ?? "",
    categoryId: "",
    payee: "",
    note: "",
  };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Templates
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templateDrawerOpen, setTemplateDrawerOpen] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Filters
  const [typeFilter, setTypeFilter] = useState<number | null>(null);
  const [accountFilter, setAccountFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const workspaceId = getWorkspaceId();
  const pageSize = 50;

  // Load accounts + categories + templates once
  useEffect(() => {
    if (!workspaceId) return;
    Promise.all([
      api.get<Account[]>(`/api/workspaces/${workspaceId}/accounts`),
      api.get<Category[]>(`/api/workspaces/${workspaceId}/categories`),
      api.get<Template[]>(`/api/workspaces/${workspaceId}/transaction-templates`),
    ]).then(([accs, cats, tmpl]) => {
      setAccounts(accs);
      setCategories(cats);
      setTemplates(tmpl);
      setForm(DEFAULT_FORM(accs));
    }).catch(() => {});
  }, [workspaceId]);

  function loadTemplates() {
    if (!workspaceId) return;
    api.get<Template[]>(`/api/workspaces/${workspaceId}/transaction-templates`)
      .then(setTemplates).catch(() => {});
  }

  const loadTransactions = useCallback(() => {
    if (!workspaceId) return;
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    if (typeFilter !== null) params.set("type", String(typeFilter));
    if (accountFilter) params.set("accountId", accountFilter);
    if (searchQuery.trim()) params.set("search", searchQuery.trim());

    api.get<{ total: number; items: Transaction[] }>(`/api/workspaces/${workspaceId}/transactions?${params}`)
      .then((res) => {
        setTransactions(res.items);
        setTotal(res.total);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId, page, typeFilter, accountFilter, searchQuery]);

  useEffect(() => { loadTransactions(); }, [loadTransactions]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [typeFilter, accountFilter, searchQuery]);

  function openDrawer(prefill?: Partial<FormState>) {
    setForm({ ...DEFAULT_FORM(accounts), ...prefill });
    setFormError(null);
    setSaveTemplateName("");
    setDrawerOpen(true);
  }

  function applyTemplate(t: Template) {
    setTemplateDrawerOpen(false);
    openDrawer({
      type: t.type,
      amount: t.amount != null ? String(t.amount) : "",
      accountId: t.accountId ?? accounts[0]?.id ?? "",
      categoryId: t.categoryId ?? "",
      payee: t.payee ?? "",
      note: t.note ?? "",
    });
  }

  async function handleSaveTemplate() {
    if (!workspaceId || !form || !saveTemplateName.trim()) return;
    setSavingTemplate(true);
    try {
      await api.post(`/api/workspaces/${workspaceId}/transaction-templates`, {
        name: saveTemplateName.trim(),
        type: form.type,
        amount: form.amount ? parseFloat(form.amount) : null,
        accountId: form.accountId || null,
        categoryId: form.categoryId || null,
        payee: form.payee || null,
        note: form.note || null,
      });
      setSaveTemplateName("");
      loadTemplates();
    } catch {
      // ignore
    } finally {
      setSavingTemplate(false);
    }
  }

  async function handleDeleteTemplate(id: string) {
    if (!workspaceId) return;
    try {
      await api.delete(`/api/workspaces/${workspaceId}/transaction-templates/${id}`);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    } catch {
      // ignore
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!workspaceId || !form) return;
    setSaving(true);
    setFormError(null);
    try {
      await api.post(`/api/workspaces/${workspaceId}/transactions`, {
        type: form.type,
        amount: parseFloat(form.amount),
        date: form.date,
        accountId: form.accountId,
        categoryId: form.categoryId || null,
        payee: form.payee || null,
        note: form.note || null,
      });
      setDrawerOpen(false);
      loadTransactions();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : "Failed to create transaction.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!workspaceId) return;
    try {
      await api.delete(`/api/workspaces/${workspaceId}/transactions/${id}`);
      setTransactions((prev) => prev.filter((t) => t.id !== id));
      setTotal((t) => t - 1);
    } catch {
      // ignore
    }
  }

  const accountMap = new Map(accounts.map((a) => [a.id, a]));
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const expenseCategories = categories.filter((c) => c.type === 1);
  const incomeCategories = categories.filter((c) => c.type === 0);

  async function exportCsv() {
    if (!workspaceId) return;
    // Fetch all transactions (up to 5000) with current filters for export
    const params = new URLSearchParams({ page: "1", pageSize: "5000" });
    if (typeFilter !== null) params.append("type", String(typeFilter));
    if (accountFilter) params.append("accountId", accountFilter);
    const res = await api.get<{ total: number; items: Transaction[] }>(
      `/api/workspaces/${workspaceId}/transactions?${params}`
    );
    const rows = [
      ["Date", "Type", "Amount", "Account", "Category", "Payee", "Note"],
      ...res.items.map((t) => [
        t.date,
        t.type === 0 ? "Income" : t.type === 1 ? "Expense" : "Transfer",
        t.amount.amount.toFixed(t.amount.decimalPlaces),
        accountMap.get(t.accountId)?.name ?? t.accountId,
        t.categoryId ? (categoryMap.get(t.categoryId)?.name ?? t.categoryId) : "",
        t.payee ?? "",
        t.note ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nest-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const actions = (
    <div className="flex items-center gap-2">
      <button
        onClick={exportCsv}
        className="flex items-center gap-[7px] px-[13px] py-[9px] rounded-[10px] text-[13px] font-semibold transition-colors hover:bg-[rgba(255,255,255,0.08)]"
        style={{ color: "#98A2B3", border: "1px solid rgba(255,255,255,0.08)" }}
        title="Export CSV"
      >
        <Icon name="download" size={16} />
        CSV
      </button>
      <button
        onClick={() => setTemplateDrawerOpen(true)}
        className="flex items-center gap-[7px] px-[13px] py-[9px] rounded-[10px] text-[13px] font-semibold transition-colors hover:bg-[rgba(255,255,255,0.08)]"
        style={{ color: "#98A2B3", border: "1px solid rgba(255,255,255,0.08)" }}
        title="Transaction templates"
      >
        <Icon name="bookmark" size={16} />
        Templates
        {templates.length > 0 && (
          <span className="text-[11px] font-semibold px-[6px] py-[1px] rounded-full" style={{ background: "rgba(99,102,241,0.18)", color: "#818CF8" }}>
            {templates.length}
          </span>
        )}
      </button>
      <button
        onClick={() => openDrawer()}
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
        Add transaction
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Transactions" subtitle={`${total} transaction${total !== 1 ? "s" : ""} in total`} actions={actions} />

      {/* Filter bar */}
      <div
        className="flex items-center gap-3 px-7 py-3 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Type filter pills */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setTypeFilter(null)}
            className="px-[12px] py-[6px] rounded-full text-[12.5px] font-medium transition-colors"
            style={{
              background: typeFilter === null ? "rgba(99,102,241,0.18)" : "rgba(255,255,255,0.05)",
              color: typeFilter === null ? "#818CF8" : "#98A2B3",
            }}
          >
            All
          </button>
          {TX_TYPE_LABELS.map((label, i) => (
            <button
              key={i}
              onClick={() => setTypeFilter(typeFilter === i ? null : i)}
              className="px-[12px] py-[6px] rounded-full text-[12.5px] font-medium transition-colors"
              style={{
                background: typeFilter === i ? `${TX_TYPE_BG[i]}` : "rgba(255,255,255,0.05)",
                color: typeFilter === i ? TX_TYPE_COLORS[i] : "#98A2B3",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Account filter */}
        {accounts.length > 1 && (
          <select
            value={accountFilter}
            onChange={(e) => setAccountFilter(e.target.value)}
            className="rounded-[9px] px-3 py-[6px] text-[12.5px] outline-none ml-2"
            style={{
              background: accountFilter ? "rgba(99,102,241,0.12)" : "rgba(255,255,255,0.05)",
              color: accountFilter ? "#818CF8" : "#98A2B3",
              border: "1px solid rgba(255,255,255,0.06)",
              appearance: "none",
            }}
          >
            <option value="">All accounts</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        )}

        {/* Search input */}
        <div className="relative ml-2">
          <Icon name="search" size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#5B6573", pointerEvents: "none" }} />
          <input
            type="text"
            placeholder="Search payee or note…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-[9px] pl-8 pr-3 py-[6px] text-[12.5px] outline-none"
            style={{
              background: searchQuery ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.05)",
              color: "#EEF1F6",
              border: `1px solid ${searchQuery ? "rgba(99,102,241,0.3)" : "rgba(255,255,255,0.06)"}`,
              width: 180,
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#5B6573] hover:text-[#98A2B3]"
            >
              <Icon name="close" size={12} />
            </button>
          )}
        </div>

        <div className="ml-auto text-[12px] text-[#4B5462]">
          {transactions.length} of {total}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-[#5B6573]">
              <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(99,102,241,0.4)", borderTopColor: "#6366F1" }} />
              <span className="text-[13px]">Loading…</span>
            </div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 rounded-[18px] flex items-center justify-center mb-4" style={{ background: "rgba(99,102,241,0.12)" }}>
              <Icon name="receipt_long" size={28} className="text-[#818CF8]" />
            </div>
            <div className="text-[15px] font-semibold text-[#C4CBD6]">No transactions</div>
            <div className="text-[13px] text-[#4B5462] mt-1 mb-5">
              {typeFilter !== null || accountFilter ? "No transactions match the current filters." : "Add your first transaction to get started."}
            </div>
            {!typeFilter && !accountFilter && (
              <button
                onClick={() => openDrawer()}
                className="flex items-center gap-2 px-4 py-[10px] rounded-[10px] text-[13px] font-semibold"
                style={{ background: "#6366F1", color: "#0B0E14", border: "none", cursor: "pointer" }}
              >
                <Icon name="add" size={17} weight={500} />
                Add transaction
              </button>
            )}
          </div>
        ) : (
          <div className="px-7 py-4 flex flex-col gap-[6px]">
            {transactions.map((tx) => {
              const account = accountMap.get(tx.accountId);
              const category = tx.categoryId ? categoryMap.get(tx.categoryId) : null;
              const isExpense = tx.type === 1;
              const isIncome = tx.type === 0;

              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-4 px-4 py-3 rounded-[13px] group transition-colors hover:bg-[#141925]"
                >
                  {/* Type icon */}
                  <div
                    className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
                    style={{ background: TX_TYPE_BG[tx.type] }}
                  >
                    <Icon name={TX_TYPE_ICONS[tx.type]} size={18} weight={400} style={{ color: TX_TYPE_COLORS[tx.type] }} />
                  </div>

                  {/* Description */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-semibold truncate">
                      {tx.payee || tx.note || TX_TYPE_LABELS[tx.type]}
                    </div>
                    <div className="flex items-center gap-2 mt-[2px]">
                      {category && (
                        <span
                          className="text-[11px] font-medium px-[7px] py-[2px] rounded-full"
                          style={{ background: `${category.color}22`, color: category.color }}
                        >
                          {category.name}
                        </span>
                      )}
                      {account && (
                        <span className="text-[11.5px] text-[#5B6573]">{account.name}</span>
                      )}
                    </div>
                  </div>

                  {/* Date */}
                  <div className="text-[12px] text-[#5B6573] flex-shrink-0 hidden xl:block">
                    {formatDate(tx.date)}
                  </div>

                  {/* Amount */}
                  <div
                    className="text-[14px] font-semibold tabular flex-shrink-0 w-[100px] text-right"
                    style={{
                      color: isIncome ? "#34D399" : isExpense ? "#FB7185" : "#818CF8",
                    }}
                  >
                    {isExpense ? "−" : isIncome ? "+" : ""}{formatMoney(tx.amount)}
                  </div>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(tx.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-[7px] opacity-0 group-hover:opacity-100 transition-all hover:bg-[rgba(251,113,133,0.14)]"
                    style={{ color: "#5B6573" }}
                  >
                    <Icon name="delete" size={15} />
                  </button>
                </div>
              );
            })}

            {/* Load more */}
            {page * pageSize < total && (
              <button
                onClick={() => setPage((p) => p + 1)}
                className="mt-2 w-full py-3 rounded-[12px] text-[13px] text-[#818CF8] font-medium transition-colors hover:bg-[#141925]"
              >
                Load more ({total - page * pageSize} remaining)
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add Transaction Drawer */}
      {form && (
        <Drawer
          open={drawerOpen}
          onClose={() => { setDrawerOpen(false); setFormError(null); }}
          title="New transaction"
          footer={
            <button
              form="tx-form"
              type="submit"
              disabled={saving}
              className="w-full py-[12px] rounded-[11px] text-[14px] font-semibold disabled:opacity-60"
              style={{ background: "#6366F1", color: "#0B0E14", border: "none", cursor: saving ? "not-allowed" : "pointer" }}
            >
              {saving ? "Saving…" : "Save transaction"}
            </button>
          }
        >
          <form id="tx-form" onSubmit={handleCreate} className="flex flex-col gap-5">
            {/* Type selector */}
            <div className="flex flex-col gap-[6px]">
              <label className="text-[12.5px] font-semibold text-[#98A2B3]">Type</label>
              <div className="grid grid-cols-3 gap-2">
                {TX_TYPE_LABELS.map((label, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setForm((f) => f ? { ...f, type: i, categoryId: "" } : f)}
                    className="py-[10px] rounded-[10px] text-[13px] font-semibold transition-colors"
                    style={{
                      background: form.type === i ? TX_TYPE_BG[i] : "rgba(255,255,255,0.05)",
                      color: form.type === i ? TX_TYPE_COLORS[i] : "#98A2B3",
                      border: form.type === i ? `1.5px solid ${TX_TYPE_COLORS[i]}44` : "1.5px solid transparent",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div className="flex flex-col gap-[6px]">
              <label className="text-[12.5px] font-semibold text-[#98A2B3]">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => f ? { ...f, amount: e.target.value } : f)}
                required
                placeholder="0.00"
                className="rounded-[11px] px-4 py-[10px] text-[14px] outline-none tabular"
                style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6" }}
                onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
              />
            </div>

            {/* Date */}
            <div className="flex flex-col gap-[6px]">
              <label className="text-[12.5px] font-semibold text-[#98A2B3]">Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => f ? { ...f, date: e.target.value } : f)}
                required
                className="rounded-[11px] px-4 py-[10px] text-[14px] outline-none"
                style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6", colorScheme: "dark" }}
                onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
              />
            </div>

            {/* Account */}
            <div className="flex flex-col gap-[6px]">
              <label className="text-[12.5px] font-semibold text-[#98A2B3]">Account</label>
              <select
                value={form.accountId}
                onChange={(e) => setForm((f) => f ? { ...f, accountId: e.target.value } : f)}
                required
                className="rounded-[11px] px-4 py-[10px] text-[14px] outline-none"
                style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6", appearance: "none" }}
              >
                <option value="" disabled>Select account</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>
                ))}
              </select>
            </div>

            {/* Category (income/expense only) */}
            {form.type !== 2 && (
              <div className="flex flex-col gap-[6px]">
                <label className="text-[12.5px] font-semibold text-[#98A2B3]">Category <span className="text-[#5B6573] font-normal">(optional)</span></label>
                <select
                  value={form.categoryId}
                  onChange={(e) => setForm((f) => f ? { ...f, categoryId: e.target.value } : f)}
                  className="rounded-[11px] px-4 py-[10px] text-[14px] outline-none"
                  style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6", appearance: "none" }}
                >
                  <option value="">No category</option>
                  {(form.type === 0 ? incomeCategories : expenseCategories).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Payee */}
            <div className="flex flex-col gap-[6px]">
              <label className="text-[12.5px] font-semibold text-[#98A2B3]">Payee <span className="text-[#5B6573] font-normal">(optional)</span></label>
              <input
                value={form.payee}
                onChange={(e) => setForm((f) => f ? { ...f, payee: e.target.value } : f)}
                placeholder="e.g. Whole Foods"
                className="rounded-[11px] px-4 py-[10px] text-[14px] outline-none"
                style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6" }}
                onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
              />
            </div>

            {/* Note */}
            <div className="flex flex-col gap-[6px]">
              <label className="text-[12.5px] font-semibold text-[#98A2B3]">Note <span className="text-[#5B6573] font-normal">(optional)</span></label>
              <textarea
                value={form.note}
                onChange={(e) => setForm((f) => f ? { ...f, note: e.target.value } : f)}
                placeholder="Any additional notes…"
                rows={2}
                className="rounded-[11px] px-4 py-[10px] text-[14px] outline-none resize-none"
                style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6" }}
                onFocus={(e) => { e.target.style.borderColor = "rgba(99,102,241,0.5)"; }}
                onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.08)"; }}
              />
            </div>

            {/* Save as template */}
            <div className="flex flex-col gap-[6px] pt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <label className="text-[12px] font-semibold text-[#5B6573]">Save as template</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Template name…"
                  value={saveTemplateName}
                  onChange={(e) => setSaveTemplateName(e.target.value)}
                  className="flex-1 rounded-[9px] px-3 py-[7px] text-[13px] outline-none"
                  style={{ background: "#0B0E14", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6" }}
                />
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  disabled={!saveTemplateName.trim() || savingTemplate}
                  className="px-3 py-[7px] rounded-[9px] text-[12.5px] font-semibold disabled:opacity-40 transition-colors"
                  style={{ background: "rgba(99,102,241,0.15)", color: "#818CF8", border: "none", cursor: "pointer" }}
                >
                  {savingTemplate ? "Saving…" : "Save"}
                </button>
              </div>
            </div>

            {formError && (
              <div className="text-[13px] text-[#FB7185] px-3 py-2 rounded-[9px]" style={{ background: "rgba(251,113,133,0.10)" }}>
                {formError}
              </div>
            )}
          </form>
        </Drawer>
      )}
      {/* Templates Drawer */}
      <Drawer
        open={templateDrawerOpen}
        onClose={() => setTemplateDrawerOpen(false)}
        title="Transaction templates"
      >
        {templates.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="w-12 h-12 rounded-[14px] flex items-center justify-center" style={{ background: "rgba(99,102,241,0.12)" }}>
              <Icon name="bookmark" size={24} className="text-[#818CF8]" />
            </div>
            <div className="text-[14px] font-semibold text-[#C4CBD6]">No templates yet</div>
            <div className="text-[12.5px] text-[#5B6573]">
              Fill in a transaction and use the "Save as template" option to create one.
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {templates.map((t) => {
              const acc = t.accountId ? accountMap.get(t.accountId) : null;
              const cat = t.categoryId ? categoryMap.get(t.categoryId) : null;
              return (
                <div
                  key={t.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-[12px] cursor-pointer group transition-colors hover:bg-[#141925]"
                  onClick={() => applyTemplate(t)}
                >
                  <div
                    className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
                    style={{ background: TX_TYPE_BG[t.type] }}
                  >
                    <Icon name={TX_TYPE_ICONS[t.type]} size={18} style={{ color: TX_TYPE_COLORS[t.type] }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13.5px] font-semibold text-[#EEF1F6]">{t.name}</div>
                    <div className="flex items-center gap-2 mt-[2px]">
                      {t.payee && <span className="text-[11.5px] text-[#5B6573]">{t.payee}</span>}
                      {cat && (
                        <span className="text-[11px] font-medium px-[6px] py-[1px] rounded-full" style={{ background: `${cat.color}22`, color: cat.color }}>
                          {cat.name}
                        </span>
                      )}
                      {acc && <span className="text-[11.5px] text-[#5B6573]">{acc.name}</span>}
                    </div>
                  </div>
                  {t.amount != null && (
                    <div className="text-[13px] font-semibold tabular" style={{ color: TX_TYPE_COLORS[t.type] }}>
                      {acc ? formatMoney({ amount: t.amount, currencyCode: acc.currency, decimalPlaces: 2 }) : t.amount.toFixed(2)}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(t.id); }}
                    className="w-7 h-7 flex items-center justify-center rounded-[7px] opacity-0 group-hover:opacity-100 transition-all hover:bg-[rgba(251,113,133,0.14)]"
                    style={{ color: "#5B6573" }}
                  >
                    <Icon name="delete" size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Drawer>
    </div>
  );
}
