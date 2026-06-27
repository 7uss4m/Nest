"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getWorkspaceId, getUserDisplayName } from "@/lib/auth";
import { Topbar } from "@/components/layout/Topbar";
import { NetWorthCard, NWHistoryEntry } from "@/components/dashboard/NetWorthCard";
import { StatCards } from "@/components/dashboard/StatCards";
import { BudgetHealth, BudgetItemData } from "@/components/dashboard/BudgetHealth";
import { SpendingDonut, SpendingCategoryData } from "@/components/dashboard/SpendingDonut";
import { UpcomingPayments, PaymentData } from "@/components/dashboard/UpcomingPayments";
import { AccountsList, AccountData } from "@/components/dashboard/AccountsList";
import { ActivityFeed, ActivityEvent } from "@/components/dashboard/ActivityFeed";

interface DashboardSummary {
  period: { year: number; month: number };
  income: number;
  expense: number;
  saved: number;
  baseCurrency: string | null;
  accounts: { id: string; name: string; type: number; currency: string; color: string; icon: string }[];
  upcomingPayments: { id: string; name: string; amount: number; currency: string; dueDate: string; icon: string }[];
}

interface CategorySpend {
  categoryId: string;
  total: number;
}

interface Category {
  id: string;
  name: string;
  type: number;
  icon: string;
  color: string;
  parentId: string | null;
}

interface Budget {
  id: string;
  period: string;
  amountLimit: number;
  rollover: boolean;
  categoryId: string;
}

interface AccountDto {
  id: string;
  name: string;
  type: number;
  currency: string;
  color: string;
  icon: string;
  balance: number;
}

interface DashboardData {
  summary: DashboardSummary;
  nwHistory: NWHistoryEntry[];
  spendByCategory: CategorySpend[];
  categories: Category[];
  budgets: Budget[];
  accounts: AccountDto[];
  activity: ActivityEvent[];
}

const PALETTE = ["#6366F1", "#2DD4BF", "#FBBF24", "#A78BFA", "#FB7185", "#38BDF8"];

function buildSpendingCategories(
  spends: CategorySpend[],
  categoriesMap: Map<string, Category>
): { items: SpendingCategoryData[]; total: number } {
  const sorted = [...spends].sort((a, b) => b.total - a.total);
  const top = sorted.slice(0, 6);
  const rest = sorted.slice(6);
  const total = sorted.reduce((s, c) => s + c.total, 0);

  const items: SpendingCategoryData[] = top.map((s, i) => {
    const cat = categoriesMap.get(s.categoryId);
    return {
      name: cat?.name ?? "Unknown",
      color: cat?.color ?? PALETTE[i % PALETTE.length],
      total: s.total,
    };
  });

  if (rest.length > 0) {
    items.push({
      name: "Other",
      color: "#5B6573",
      total: rest.reduce((sum, s) => sum + s.total, 0),
    });
  }

  return { items, total };
}

function buildBudgets(
  budgets: Budget[],
  categoriesMap: Map<string, Category>,
  spends: CategorySpend[]
): BudgetItemData[] {
  const spendMap = new Map(spends.map((s) => [s.categoryId, s.total]));
  return budgets
    .filter((b) => categoriesMap.has(b.categoryId))
    .slice(0, 4)
    .map((b) => {
      const cat = categoriesMap.get(b.categoryId)!;
      return {
        id: b.id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        spent: spendMap.get(b.categoryId) ?? 0,
        limit: b.amountLimit,
      };
    });
}

export function DashboardClient() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");

  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-based

  const monthLabel = new Date(selectedYear, selectedMonth - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const isCurrentMonth = selectedYear === now.getFullYear() && selectedMonth === (now.getMonth() + 1);

  function prevMonth() {
    if (selectedMonth === 1) { setSelectedYear((y) => y - 1); setSelectedMonth(12); }
    else setSelectedMonth((m) => m - 1);
  }

  function nextMonth() {
    if (isCurrentMonth) return; // don't go into the future
    if (selectedMonth === 12) { setSelectedYear((y) => y + 1); setSelectedMonth(1); }
    else setSelectedMonth((m) => m + 1);
  }

  const loadData = useCallback(() => {
    const workspaceId = getWorkspaceId();
    if (!workspaceId) {
      setError("No workspace found. Please create a workspace to get started.");
      return;
    }

    const base = `/api/workspaces/${workspaceId}`;
    const storedCurrency = typeof window !== "undefined" ? localStorage.getItem("baseCurrency") : null;
    const monthParams = `year=${selectedYear}&month=${selectedMonth}`;
    const summaryParams = storedCurrency ? `${monthParams}&baseCurrency=${encodeURIComponent(storedCurrency)}` : monthParams;

    setData(null);
    Promise.all([
      api.get<DashboardSummary>(`${base}/dashboard/summary?${summaryParams}`),
      api.get<NWHistoryEntry[]>(`${base}/dashboard/net-worth-history`),
      api.get<CategorySpend[]>(`${base}/dashboard/spending-by-category?${monthParams}`),
      api.get<Category[]>(`${base}/categories`),
      api.get<Budget[]>(`${base}/budgets`),
      api.get<AccountDto[]>(`${base}/accounts`),
      api.get<ActivityEvent[]>(`${base}/dashboard/activity`),
    ])
      .then(([summary, nwHistory, spendByCategory, categories, budgets, accounts, activity]) => {
        setData({ summary, nwHistory, spendByCategory, categories, budgets, accounts, activity });
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load dashboard data.");
      });
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    setDisplayName(getUserDisplayName());
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <Topbar title="Dashboard" subtitle="Dashboard" month={monthLabel} onPrevMonth={prevMonth} onNextMonth={isCurrentMonth ? undefined : nextMonth} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-[14px] text-[#FB7185]">{error}</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col h-full">
        <Topbar title="Dashboard" subtitle={`Welcome back, ${displayName || "you"} — here's your money today.`} month={monthLabel} onPrevMonth={prevMonth} onNextMonth={isCurrentMonth ? undefined : nextMonth} />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-3 text-[#5B6573]">
            <div
              className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: "rgba(99,102,241,0.4)", borderTopColor: "#6366F1" }}
            />
            <span className="text-[13px]">Loading dashboard…</span>
          </div>
        </div>
      </div>
    );
  }

  const { summary, nwHistory, spendByCategory, categories, budgets, accounts, activity } = data;
  const categoriesMap = new Map(categories.map((c) => [c.id, c]));
  const { items: spendingCategories, total: spendingTotal } = buildSpendingCategories(spendByCategory, categoriesMap);
  const budgetItems = buildBudgets(budgets, categoriesMap, spendByCategory);

  const accountData: AccountData[] = accounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    currency: a.currency,
    color: a.color,
    icon: a.icon,
    balance: a.balance,
  }));

  const paymentData: PaymentData[] = summary.upcomingPayments.map((p) => ({
    id: p.id,
    name: p.name,
    amount: p.amount,
    currency: p.currency,
    dueDate: p.dueDate,
    icon: p.icon,
  }));

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Dashboard"
        subtitle={`Welcome back, ${displayName || "you"} — here's your money today.`}
        month={monthLabel}
        onPrevMonth={prevMonth}
        onNextMonth={isCurrentMonth ? undefined : nextMonth}
      />
      <div className="flex-1 overflow-auto p-7">
        <div className="grid grid-cols-12 gap-[18px]">
          <NetWorthCard history={nwHistory} />
          <StatCards income={summary.income} expense={summary.expense} saved={summary.saved} currency={summary.baseCurrency ?? undefined} />
          <BudgetHealth budgets={budgetItems} />
          <SpendingDonut categories={spendingCategories} total={spendingTotal} />
          <UpcomingPayments payments={paymentData} />
          <AccountsList accounts={accountData} />
          <ActivityFeed events={activity} />
        </div>
      </div>
    </div>
  );
}
