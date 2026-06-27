"use client";

import { useEffect, useState, useCallback } from "react";
import { api } from "@/lib/api";
import { getWorkspaceId } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { Topbar } from "@/components/layout/Topbar";
import { Icon } from "@/components/ui/Icon";

// ── Types ─────────────────────────────────────────────────────────────────────

interface MonthEntry {
  month: string;
  year: number;
  monthNum: number;
  income: number;
  expense: number;
  saved: number;
}

interface CategorySpend {
  categoryId: string;
  total: number;
}

interface Account {
  id: string;
  name: string;
  type: number;
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

// ── Bar Chart (12-month income vs expense) ────────────────────────────────────

function MonthlyBarChart({ data }: { data: MonthEntry[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (data.length === 0) return null;

  const maxVal = Math.max(...data.flatMap((d) => [d.income, d.expense]), 1);
  const W = 100, H = 140, BAR_W = 14, GAP = 4, GROUP_W = BAR_W * 2 + GAP;
  const COLS = data.length;
  const TOTAL_W = COLS * GROUP_W + (COLS - 1) * 8;

  return (
    <div className="relative w-full overflow-x-auto pb-1">
      <svg
        viewBox={`0 0 ${TOTAL_W} ${H + 24}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height: H + 24, minWidth: TOTAL_W }}
      >
        {data.map((d, i) => {
          const x = i * (GROUP_W + 8);
          const incH = Math.max((d.income / maxVal) * H, 2);
          const expH = Math.max((d.expense / maxVal) * H, 2);
          const isHover = hover === i;

          return (
            <g key={d.month} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              {/* Income bar */}
              <rect
                x={x} y={H - incH} width={BAR_W} height={incH}
                rx={3}
                fill={isHover ? "#34D399" : "rgba(52,211,153,0.55)"}
                style={{ transition: "fill 0.15s" }}
              />
              {/* Expense bar */}
              <rect
                x={x + BAR_W + GAP} y={H - expH} width={BAR_W} height={expH}
                rx={3}
                fill={isHover ? "#FB7185" : "rgba(251,113,133,0.55)"}
                style={{ transition: "fill 0.15s" }}
              />
              {/* Month label */}
              <text
                x={x + GROUP_W / 2} y={H + 16}
                textAnchor="middle"
                fontSize="8.5"
                fill={isHover ? "#C4CBD6" : "#4B5462"}
              >
                {d.month}
              </text>
              {/* Tooltip */}
              {isHover && (
                <g>
                  <rect
                    x={Math.min(x - 10, TOTAL_W - 110)} y={H - Math.max(incH, expH) - 58}
                    width={100} height={52} rx={6}
                    fill="#1E2536" stroke="rgba(255,255,255,0.08)" strokeWidth={0.5}
                  />
                  <text x={Math.min(x - 10, TOTAL_W - 110) + 8} y={H - Math.max(incH, expH) - 40} fontSize="8" fill="#98A2B3">Income</text>
                  <text x={Math.min(x - 10, TOTAL_W - 110) + 8} y={H - Math.max(incH, expH) - 28} fontSize="9" fontWeight="600" fill="#34D399">{formatCurrency(d.income)}</text>
                  <text x={Math.min(x - 10, TOTAL_W - 110) + 8} y={H - Math.max(incH, expH) - 14} fontSize="8" fill="#98A2B3">Expense</text>
                  <text x={Math.min(x - 10, TOTAL_W - 110) + 8} y={H - Math.max(incH, expH) - 2} fontSize="9" fontWeight="600" fill="#FB7185">{formatCurrency(d.expense)}</text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Savings Rate Sparkline ────────────────────────────────────────────────────

function SavingsRateChart({ data }: { data: MonthEntry[] }) {
  const rates = data.map((d) => (d.income > 0 ? (d.saved / d.income) * 100 : 0));
  if (rates.every((r) => r === 0)) return null;

  const min = Math.min(...rates, 0);
  const max = Math.max(...rates, 1);
  const range = max - min || 1;
  const W = 560, H = 60, PAD = 6;
  const n = rates.length;
  const xs = rates.map((_, i) => PAD + (i / (n - 1)) * (W - PAD * 2));
  const ys = rates.map((r) => PAD + (1 - (r - min) / range) * (H - PAD * 2));
  const line = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const area = `${line} L${xs[n - 1].toFixed(1)},${H} L${xs[0].toFixed(1)},${H} Z`;
  const lastRate = rates[rates.length - 1];
  const color = lastRate >= 20 ? "#34D399" : lastRate >= 0 ? "#FBBF24" : "#FB7185";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 60 }}>
      <defs>
        <linearGradient id="sr-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sr-grad)" />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {/* Zero line */}
      {min < 0 && (
        <line
          x1={PAD} y1={PAD + ((0 - min) / range) * (H - PAD * 2)}
          x2={W - PAD} y2={PAD + ((0 - min) / range) * (H - PAD * 2)}
          stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" strokeDasharray="4,4"
        />
      )}
    </svg>
  );
}

// ── Spending Donut ────────────────────────────────────────────────────────────

function SpendingDonut({
  spending, categories,
}: {
  spending: CategorySpend[];
  categories: Category[];
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const items = spending
    .map((s) => ({ ...s, cat: catMap.get(s.categoryId) }))
    .filter((s) => s.cat)
    .sort((a, b) => b.total - a.total);
  const total = items.reduce((s, i) => s + i.total, 0);
  if (total === 0) return <div className="text-[12px] text-[#4B5462]">No expenses this month.</div>;

  const R = 56, CX = 68, CY = 68, strokeW = 18;
  let cumPct = 0;
  const arcs = items.map((item) => {
    const pct = item.total / total;
    const start = cumPct;
    cumPct += pct;
    return { ...item, start, pct };
  });

  function describeArc(startPct: number, pct: number, hov: boolean) {
    const r = hov ? R + 4 : R;
    const startAngle = startPct * 2 * Math.PI - Math.PI / 2;
    const endAngle = (startPct + pct) * 2 * Math.PI - Math.PI / 2;
    const x1 = CX + r * Math.cos(startAngle);
    const y1 = CY + r * Math.sin(startAngle);
    const x2 = CX + r * Math.cos(endAngle);
    const y2 = CY + r * Math.sin(endAngle);
    const large = pct > 0.5 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  }

  const hovItem = hovered ? items.find((i) => i.categoryId === hovered) : null;

  return (
    <div className="flex items-center gap-5">
      <svg width={136} height={136} style={{ flexShrink: 0 }}>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeW} />
        {arcs.map((arc) => (
          <path
            key={arc.categoryId}
            d={describeArc(arc.start, arc.pct, hovered === arc.categoryId)}
            fill="none"
            stroke={arc.cat!.color}
            strokeWidth={hovered === arc.categoryId ? strokeW + 4 : strokeW}
            strokeLinecap="round"
            style={{ cursor: "pointer", transition: "stroke-width 0.15s" }}
            onMouseEnter={() => setHovered(arc.categoryId)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
        <text x={CX} y={CY - 7} textAnchor="middle" fontSize="10" fill="#98A2B3">
          {hovItem ? hovItem.cat!.name : "Total"}
        </text>
        <text x={CX} y={CY + 9} textAnchor="middle" fontSize="11" fontWeight="700" fill="#EEF1F6">
          {hovItem
            ? `${((hovItem.total / total) * 100).toFixed(1)}%`
            : formatCurrency(total)}
        </text>
      </svg>
      <div className="flex flex-col gap-1.5 min-w-0">
        {items.slice(0, 6).map((item) => (
          <div
            key={item.categoryId}
            className="flex items-center gap-2 cursor-pointer"
            onMouseEnter={() => setHovered(item.categoryId)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.cat!.color }} />
            <span className="text-[12px] text-[#98A2B3] truncate flex-1">{item.cat!.name}</span>
            <span className="text-[12px] font-semibold tabular" style={{ color: item.cat!.color }}>
              {formatCurrency(item.total)}
            </span>
          </div>
        ))}
        {items.length > 6 && (
          <div className="text-[11px] text-[#4B5462]">+{items.length - 6} more</div>
        )}
      </div>
    </div>
  );
}

// ── Cash Flow Waterfall ───────────────────────────────────────────────────────

function CashFlowWaterfall({
  income, expense, saved,
}: {
  income: number; expense: number; saved: number;
}) {
  if (income === 0 && expense === 0) return null;

  const W = 300, H = 130, BAR_W = 48, PAD = 20;
  const maxVal = Math.max(income, 1);

  const incH  = Math.max((income / maxVal) * (H - PAD), 4);
  const expH  = Math.max((expense / maxVal) * (H - PAD), 4);
  const netH  = Math.max((Math.abs(saved) / maxVal) * (H - PAD), 4);
  const netIsPos = saved >= 0;

  const spacing = (W - PAD * 2 - BAR_W * 3) / 2;
  const xInc = PAD;
  const xExp = xInc + BAR_W + spacing;
  const xNet = xExp + BAR_W + spacing;

  const bars = [
    { x: xInc, h: incH, color: "#34D399", label: "Income", value: income, y: H - PAD - incH },
    { x: xExp, h: expH, color: "#FB7185", label: "Expenses", value: expense, y: H - PAD - expH },
    { x: xNet, h: netH, color: netIsPos ? "#818CF8" : "#F97316", label: saved >= 0 ? "Saved" : "Deficit", value: Math.abs(saved), y: H - PAD - netH },
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full" style={{ height: H + 20 }}>
      {bars.map((b) => (
        <g key={b.label}>
          <rect x={b.x} y={b.y} width={BAR_W} height={b.h} rx={5} fill={b.color} opacity="0.85" />
          <text x={b.x + BAR_W / 2} y={b.y - 6} textAnchor="middle" fontSize="8.5" fill={b.color} fontWeight="600">
            {formatCurrency(b.value)}
          </text>
          <text x={b.x + BAR_W / 2} y={H + 14} textAnchor="middle" fontSize="9" fill="#4B5462">
            {b.label}
          </text>
        </g>
      ))}
      {/* connector lines */}
      <line
        x1={xInc + BAR_W} y1={H - PAD - expH}
        x2={xExp} y2={H - PAD - expH}
        stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="3,3"
      />
    </svg>
  );
}

// ── Daily Spending Trend ──────────────────────────────────────────────────────

function DailyTrendChart({
  data,
  year,
  month,
}: {
  data: { day: number; total: number }[];
  year: number;
  month: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  if (data.length === 0) return null;

  const nonZero = data.filter((d) => d.total > 0);
  if (nonZero.length === 0)
    return <div className="text-[12px] text-[#4B5462]">No expenses recorded this month.</div>;

  const W = 560, H = 90, PAD_X = 8, PAD_Y = 10;
  const n = data.length;
  const maxVal = Math.max(...data.map((d) => d.total), 1);
  const now = new Date();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() + 1 === month;
  const todayDay = isCurrentMonth ? now.getDate() : null;

  function xOf(i: number) {
    return PAD_X + (i / (n - 1)) * (W - PAD_X * 2);
  }
  function yOf(v: number) {
    return PAD_Y + (1 - v / maxVal) * (H - PAD_Y * 2);
  }

  const pts = data.map((d, i) => ({ x: xOf(i), y: yOf(d.total), ...d }));
  const linePts = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${linePts} L${pts[n - 1].x.toFixed(1)},${H} L${pts[0].x.toFixed(1)},${H} Z`;

  const hoverPt = hover !== null ? pts[hover - 1] : null;

  return (
    <div
      className="relative w-full"
      onMouseLeave={() => setHover(null)}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: H, overflow: "visible" }}
        onMouseMove={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const relX = ((e.clientX - rect.left) / rect.width) * W;
          const idx = Math.round(((relX - PAD_X) / (W - PAD_X * 2)) * (n - 1));
          const clamped = Math.max(0, Math.min(n - 1, idx));
          setHover(data[clamped].day);
        }}
      >
        <defs>
          <linearGradient id="ds-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FB7185" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#FB7185" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {/* Week separator lines */}
        {[7, 14, 21, 28].filter((d) => d < n).map((d) => (
          <line
            key={d}
            x1={xOf(d - 1)} y1={PAD_Y}
            x2={xOf(d - 1)} y2={H - PAD_Y}
            stroke="rgba(255,255,255,0.04)" strokeWidth="0.8"
          />
        ))}
        <path d={area} fill="url(#ds-grad)" />
        <path d={linePts} fill="none" stroke="#FB7185" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        {/* Today marker */}
        {todayDay && todayDay <= n && (
          <line
            x1={xOf(todayDay - 1)} y1={PAD_Y}
            x2={xOf(todayDay - 1)} y2={H - PAD_Y}
            stroke="rgba(251,113,133,0.35)" strokeWidth="1" strokeDasharray="3,3"
          />
        )}
        {/* Hover dot + tooltip */}
        {hoverPt && (
          <>
            <circle cx={hoverPt.x} cy={hoverPt.y} r={3.5} fill="#FB7185" />
            <g>
              <rect
                x={Math.min(hoverPt.x - 36, W - 90)} y={Math.max(hoverPt.y - 46, 0)}
                width={88} height={38} rx={6}
                fill="#1E2536" stroke="rgba(255,255,255,0.08)" strokeWidth={0.5}
              />
              <text
                x={Math.min(hoverPt.x - 36, W - 90) + 8}
                y={Math.max(hoverPt.y - 46, 0) + 14}
                fontSize="8" fill="#98A2B3"
              >
                Day {hoverPt.day}
              </text>
              <text
                x={Math.min(hoverPt.x - 36, W - 90) + 8}
                y={Math.max(hoverPt.y - 46, 0) + 28}
                fontSize="9" fontWeight="600" fill="#FB7185"
              >
                {formatCurrency(hoverPt.total)}
              </text>
            </g>
          </>
        )}
      </svg>
      {/* X-axis day labels */}
      <div className="flex justify-between mt-1 px-[8px]">
        {[1, 7, 14, 21, data.length].map((d) => (
          <span key={d} className="text-[9px]" style={{ color: d === todayDay ? "#FB7185" : "#3B4252" }}>
            {d === data.length && d !== 28 ? `${d}` : d}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Category MoM Comparison ───────────────────────────────────────────────────

function CategoryMoMChart({
  current,
  previous,
  categories,
}: {
  current: CategorySpend[];
  previous: CategorySpend[];
  categories: Category[];
}) {
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const prevMap = new Map(previous.map((s) => [s.categoryId, s.total]));

  const rows = current
    .map((s) => {
      const cat = catMap.get(s.categoryId);
      if (!cat) return null;
      const prev = prevMap.get(s.categoryId) ?? 0;
      const diff = s.total - prev;
      const pct = prev > 0 ? (diff / prev) * 100 : null;
      return { cat, current: s.total, prev, diff, pct };
    })
    .filter(Boolean)
    .sort((a, b) => Math.abs(b!.diff) - Math.abs(a!.diff))
    .slice(0, 8) as { cat: Category; current: number; prev: number; diff: number; pct: number | null }[];

  if (rows.length === 0)
    return <div className="text-[12px] text-[#4B5462]">No expense data to compare.</div>;

  const maxVal = Math.max(...rows.map((r) => Math.max(r.current, r.prev)), 1);

  return (
    <div className="flex flex-col gap-[14px]">
      {rows.map((row) => {
        const isUp = row.diff > 0;
        const isNew = row.prev === 0;
        const diffColor = isUp ? "#FB7185" : "#34D399";
        const pctLabel = row.pct != null
          ? `${isUp ? "+" : ""}${row.pct.toFixed(0)}%`
          : isNew ? "new" : "—";

        return (
          <div key={row.cat.id}>
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className="w-6 h-6 rounded-[7px] flex items-center justify-center flex-shrink-0"
                style={{ background: `${row.cat.color}22` }}
              >
                <Icon name={row.cat.icon} size={13} style={{ color: row.cat.color }} />
              </div>
              <span className="text-[12.5px] font-medium flex-1 truncate">{row.cat.name}</span>
              <span className="text-[11.5px] font-semibold tabular" style={{ color: row.cat.color }}>
                {formatCurrency(row.current)}
              </span>
              <span
                className="text-[10.5px] font-semibold px-[7px] py-[2px] rounded-full flex-shrink-0"
                style={{ color: diffColor, background: `${diffColor}18` }}
              >
                {pctLabel}
              </span>
            </div>
            {/* Dual bar: previous (muted) + current (colored) */}
            <div className="ml-8 flex flex-col gap-[3px]">
              <div className="h-[5px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${(row.current / maxVal) * 100}%`, background: row.cat.color }}
                />
              </div>
              {row.prev > 0 && (
                <div className="h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(row.prev / maxVal) * 100}%`, background: "rgba(255,255,255,0.18)" }}
                  />
                </div>
              )}
            </div>
          </div>
        );
      })}
      <div className="flex items-center gap-4 mt-1 text-[10.5px] text-[#4B5462]">
        <span className="flex items-center gap-1.5"><span className="inline-block w-6 h-[4px] rounded-full" style={{ background: "rgba(255,255,255,0.18)" }} /> Last month</span>
        <span className="flex items-center gap-1.5"><span className="inline-block w-6 h-[5px] rounded-full" style={{ background: "rgba(148,163,184,0.5)" }} /> This month</span>
      </div>
    </div>
  );
}

// ── Month selector ────────────────────────────────────────────────────────────

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface MonthSelectorProps {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}

function MonthSelector({ year, month, onChange }: MonthSelectorProps) {
  const now = new Date();
  const isLatest = year === now.getFullYear() && month === now.getMonth() + 1;

  function prev() {
    if (month === 1) onChange(year - 1, 12);
    else onChange(year, month - 1);
  }
  function next() {
    if (isLatest) return;
    if (month === 12) onChange(year + 1, 1);
    else onChange(year, month + 1);
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={prev}
        className="w-8 h-8 flex items-center justify-center rounded-[8px] transition-colors hover:bg-[rgba(255,255,255,0.06)]"
        style={{ color: "#98A2B3" }}
      >
        <Icon name="chevron_left" size={18} />
      </button>
      <div
        className="px-3 py-1 rounded-[8px] text-[13px] font-semibold min-w-[90px] text-center"
        style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.08)", color: "#EEF1F6" }}
      >
        {MONTH_NAMES[month - 1]} {year}
      </div>
      <button
        onClick={next}
        disabled={isLatest}
        className="w-8 h-8 flex items-center justify-center rounded-[8px] transition-colors hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-30"
        style={{ color: "#98A2B3" }}
      >
        <Icon name="chevron_right" size={18} />
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [trends, setTrends] = useState<MonthEntry[]>([]);
  const [spending, setSpending] = useState<CategorySpend[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [summary, setSummary] = useState<{ income: number; expense: number; saved: number } | null>(null);
  const [dailySpending, setDailySpending] = useState<{ day: number; total: number }[]>([]);
  const [prevSpending, setPrevSpending] = useState<CategorySpend[]>([]);
  const [projected, setProjected] = useState<{
    currentBalance: number; plannedExpenseTotal: number;
    recurringIncome: number; recurringExpense: number;
    projectedBalance: number; daysRemaining: number;
    plannedPayments: { name: string; amount: number; dueDate: string }[];
  } | null>(null);
  const [loadingTrends, setLoadingTrends] = useState(true);
  const [loadingMonth, setLoadingMonth] = useState(true);

  const workspaceId = getWorkspaceId();
  const base = `/api/workspaces/${workspaceId}`;

  // Load 12-month trends once
  useEffect(() => {
    if (!workspaceId) return;
    setLoadingTrends(true);
    Promise.all([
      api.get<MonthEntry[]>(`${base}/dashboard/monthly-trends?months=12`),
      api.get<Category[]>(`${base}/categories`),
      api.get(`${base}/dashboard/projected-balance`),
      api.get<Account[]>(`${base}/accounts`),
    ])
      .then(([t, c, p, a]) => {
        setTrends(t as MonthEntry[]);
        setCategories(c as Category[]);
        setProjected(p as typeof projected);
        setAccounts(a as Account[]);
      })
      .catch(() => {})
      .finally(() => setLoadingTrends(false));
  }, [workspaceId, base]);

  // Load month-specific data when month changes
  const loadMonth = useCallback(() => {
    if (!workspaceId) return;
    setLoadingMonth(true);
    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;
    const acctQ = accountFilter !== "all" ? `&accountId=${accountFilter}` : "";
    Promise.all([
      api.get<{ income: number; expense: number; saved: number }>(`${base}/dashboard/summary?year=${year}&month=${month}`),
      api.get<CategorySpend[]>(`${base}/dashboard/spending-by-category?year=${year}&month=${month}${acctQ}`),
      api.get<{ day: number; total: number }[]>(`${base}/dashboard/daily-spending?year=${year}&month=${month}${acctQ}`),
      api.get<CategorySpend[]>(`${base}/dashboard/spending-by-category?year=${prevYear}&month=${prevMonth}${acctQ}`),
    ])
      .then(([s, sp, ds, psp]) => { setSummary(s); setSpending(sp); setDailySpending(ds); setPrevSpending(psp); })
      .catch(() => {})
      .finally(() => setLoadingMonth(false));
  }, [workspaceId, base, year, month, accountFilter]);

  useEffect(() => { loadMonth(); }, [loadMonth]);

  // Top categories for selected month (sorted by spend desc)
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const topCategories = [...spending]
    .sort((a, b) => b.total - a.total)
    .map((s) => ({ ...s, cat: catMap.get(s.categoryId) }))
    .filter((s) => s.cat);

  const totalMonthSpend = spending.reduce((s, i) => s + i.total, 0);
  const savingsRate = summary && summary.income > 0
    ? Math.round((summary.saved / summary.income) * 100)
    : null;

  // Compute MoM change for current month vs previous
  const currentMonthTrend = trends.find((t) => t.year === year && t.monthNum === month);
  const prevMonthIdx = trends.findIndex((t) => t.year === year && t.monthNum === month) - 1;
  const prevMonthTrend = prevMonthIdx >= 0 ? trends[prevMonthIdx] : null;
  const expenseMoM = prevMonthTrend && prevMonthTrend.expense > 0
    ? ((((summary?.expense ?? 0) - prevMonthTrend.expense) / prevMonthTrend.expense) * 100)
    : null;

  const actions = (
    <div className="flex items-center gap-3">
      {accounts.length > 0 && (
        <select
          value={accountFilter}
          onChange={(e) => setAccountFilter(e.target.value)}
          className="rounded-[9px] px-3 py-1.5 text-[12.5px] font-medium outline-none cursor-pointer"
          style={{
            background: "#141925",
            border: "1px solid rgba(255,255,255,0.08)",
            color: accountFilter === "all" ? "#98A2B3" : "#EEF1F6",
          }}
        >
          <option value="all">All accounts</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      )}
      <MonthSelector year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Reports" subtitle="Trends and spending insights." actions={actions} />

      <div className="flex-1 overflow-auto p-7">
        <div className="flex flex-col gap-6 max-w-[1100px]">

          {/* Summary stats for selected month */}
          <div className="grid grid-cols-4 gap-4">
            {[
              {
                label: "Income", icon: "south_west", color: "#34D399",
                value: summary ? formatCurrency(summary.income) : "—",
                sub: currentMonthTrend && prevMonthTrend
                  ? `${((summary?.income ?? 0) - prevMonthTrend.income >= 0 ? "+" : "")}${formatCurrency((summary?.income ?? 0) - prevMonthTrend.income)} MoM`
                  : undefined,
                subColor: currentMonthTrend && prevMonthTrend
                  ? ((summary?.income ?? 0) >= prevMonthTrend.income ? "#34D399" : "#FB7185")
                  : "#5B6573",
              },
              {
                label: "Expenses", icon: "north_east", color: "#FB7185",
                value: summary ? formatCurrency(summary.expense) : "—",
                sub: expenseMoM != null
                  ? `${expenseMoM >= 0 ? "+" : ""}${expenseMoM.toFixed(1)}% vs last month`
                  : undefined,
                subColor: expenseMoM != null
                  ? (expenseMoM > 0 ? "#FB7185" : "#34D399")
                  : "#5B6573",
              },
              {
                label: "Saved", icon: "savings", color: "#818CF8",
                value: summary ? formatCurrency(summary.saved) : "—",
                sub: savingsRate != null ? `${savingsRate}% savings rate` : undefined,
                subColor: savingsRate != null
                  ? (savingsRate >= 20 ? "#34D399" : savingsRate >= 0 ? "#FBBF24" : "#FB7185")
                  : "#5B6573",
              },
              {
                label: "Categories", icon: "category", color: "#2DD4BF",
                value: String(spending.length),
                sub: totalMonthSpend > 0 ? `avg ${formatCurrency(totalMonthSpend / Math.max(spending.length, 1))}/cat` : undefined,
                subColor: "#5B6573",
              },
            ].map((s) => (
              <div
                key={s.label}
                className="p-4 rounded-[16px]"
                style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0" style={{ background: `${s.color}18` }}>
                    <Icon name={s.icon} size={15} style={{ color: s.color }} />
                  </div>
                  <span className="text-[11.5px] text-[#5B6573]">{s.label}</span>
                </div>
                <div className="text-[22px] font-[700] tabular" style={{ fontFamily: "'Inter Tight'", color: s.color }}>
                  {loadingMonth ? <span className="opacity-40">—</span> : s.value}
                </div>
                {s.sub && (
                  <div className="text-[11px] mt-1 font-medium" style={{ color: s.subColor }}>{s.sub}</div>
                )}
              </div>
            ))}
          </div>

          {/* Projected end-of-month balance — current month only */}
          {projected && (
            <div className="rounded-[18px] p-5" style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[13px] font-semibold">Projected End-of-Month Balance</div>
                  <div className="text-[11px] text-[#4B5462] mt-0.5">{projected.daysRemaining} day{projected.daysRemaining !== 1 ? "s" : ""} remaining · based on current balance, pending payments &amp; recurring transactions</div>
                </div>
                <div
                  className="text-[22px] font-[800] tabular"
                  style={{ fontFamily: "'Inter Tight'", color: projected.projectedBalance >= 0 ? "#34D399" : "#FB7185" }}
                >
                  {formatCurrency(projected.projectedBalance)}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-[12px]">
                <div className="rounded-[12px] p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                  <div className="text-[#5B6573] mb-1">Current Balance</div>
                  <div className="font-[700] tabular" style={{ fontFamily: "'Inter Tight'" }}>{formatCurrency(projected.currentBalance)}</div>
                </div>
                <div className="rounded-[12px] p-3" style={{ background: "rgba(52,211,153,0.06)", border: "1px solid rgba(52,211,153,0.12)" }}>
                  <div className="text-[#5B6573] mb-1">Expected Income</div>
                  <div className="font-[700] tabular" style={{ fontFamily: "'Inter Tight'", color: "#34D399" }}>+{formatCurrency(projected.recurringIncome)}</div>
                </div>
                <div className="rounded-[12px] p-3" style={{ background: "rgba(251,113,133,0.06)", border: "1px solid rgba(251,113,133,0.12)" }}>
                  <div className="text-[#5B6573] mb-1">Expected Expenses</div>
                  <div className="font-[700] tabular" style={{ fontFamily: "'Inter Tight'", color: "#FB7185" }}>
                    -{formatCurrency(projected.recurringExpense + projected.plannedExpenseTotal)}
                  </div>
                  {projected.plannedPayments.length > 0 && (
                    <div className="text-[10.5px] text-[#4B5462] mt-1">{projected.plannedPayments.length} planned payment{projected.plannedPayments.length !== 1 ? "s" : ""}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 12-month bar chart */}
          <div className="rounded-[18px] p-5" style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between mb-4">
              <div className="text-[13px] font-semibold">12-Month Income vs Expenses</div>
              <div className="flex items-center gap-4 text-[11.5px]">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "#34D399" }} />
                  <span className="text-[#98A2B3]">Income</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: "#FB7185" }} />
                  <span className="text-[#98A2B3]">Expense</span>
                </div>
              </div>
            </div>
            {loadingTrends ? (
              <div className="h-[164px] flex items-center justify-center">
                <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(99,102,241,0.4)", borderTopColor: "#6366F1" }} />
              </div>
            ) : trends.every((t) => t.income === 0 && t.expense === 0) ? (
              <div className="h-[164px] flex items-center justify-center text-[12px] text-[#4B5462]">
                No transaction data for the last 12 months.
              </div>
            ) : (
              <MonthlyBarChart data={trends} />
            )}
          </div>

          {/* Savings rate trend */}
          {!loadingTrends && trends.some((t) => t.income > 0) && (
            <div className="rounded-[18px] p-5" style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-center justify-between mb-1">
                <div className="text-[13px] font-semibold">Savings Rate Trend</div>
                {savingsRate != null && (
                  <span
                    className="text-[12px] font-semibold px-[9px] py-[3px] rounded-full"
                    style={{
                      color: savingsRate >= 20 ? "#34D399" : savingsRate >= 0 ? "#FBBF24" : "#FB7185",
                      background: savingsRate >= 20 ? "rgba(52,211,153,0.12)" : savingsRate >= 0 ? "rgba(251,191,36,0.12)" : "rgba(251,113,133,0.12)",
                    }}
                  >
                    {savingsRate}% this month
                  </span>
                )}
              </div>
              <div className="text-[11px] text-[#4B5462] mb-3">% of income saved each month over 12 months</div>
              <SavingsRateChart data={trends} />
              <div className="flex items-center justify-between mt-1">
                {trends.filter((_, i) => i % 3 === 0 || i === trends.length - 1).map((t) => (
                  <span key={t.month} className="text-[9.5px] text-[#3B4252]">{t.month}</span>
                ))}
              </div>
            </div>
          )}

          {/* Cash flow waterfall */}
          {summary && (summary.income > 0 || summary.expense > 0) && (
            <div className="rounded-[18px] p-5" style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-[13px] font-semibold mb-1">Cash Flow — {MONTH_NAMES[month - 1]} {year}</div>
              <div className="text-[11px] text-[#4B5462] mb-3">Income, expenses, and net for this month</div>
              <div className="flex items-center">
                <div className="flex-1">
                  <CashFlowWaterfall income={summary.income} expense={summary.expense} saved={summary.saved} />
                </div>
                <div className="flex flex-col gap-3 ml-8 flex-shrink-0">
                  {[
                    { label: "Income", value: summary.income, color: "#34D399" },
                    { label: "Expenses", value: summary.expense, color: "#FB7185" },
                    { label: summary.saved >= 0 ? "Saved" : "Deficit", value: Math.abs(summary.saved), color: summary.saved >= 0 ? "#818CF8" : "#F97316" },
                  ].map((r) => (
                    <div key={r.label} className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: r.color }} />
                      <div>
                        <div className="text-[10.5px] text-[#5B6573]">{r.label}</div>
                        <div className="text-[13px] font-[700] tabular" style={{ fontFamily: "'Inter Tight'", color: r.color }}>
                          {formatCurrency(r.value)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Daily spending trend */}
          <div className="rounded-[18px] p-5" style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center justify-between mb-1">
              <div className="text-[13px] font-semibold">Daily Spending — {MONTH_NAMES[month - 1]} {year}</div>
              {summary && summary.expense > 0 && (
                <span className="text-[12px] font-semibold tabular" style={{ color: "#FB7185" }}>
                  {formatCurrency(summary.expense)} total
                </span>
              )}
            </div>
            <div className="text-[11px] text-[#4B5462] mb-3">Expense amount per day</div>
            {loadingMonth ? (
              <div className="h-[100px] flex items-center justify-center">
                <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(99,102,241,0.4)", borderTopColor: "#6366F1" }} />
              </div>
            ) : (
              <DailyTrendChart data={dailySpending} year={year} month={month} />
            )}
          </div>

          {/* Spending breakdown + Top categories + MoM */}
          <div className="grid grid-cols-3 gap-4">
            {/* Donut */}
            <div className="rounded-[18px] p-5" style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-[13px] font-semibold mb-4">Spending by Category</div>
              {loadingMonth ? (
                <div className="h-[140px] flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(99,102,241,0.4)", borderTopColor: "#6366F1" }} />
                </div>
              ) : (
                <SpendingDonut spending={spending} categories={categories} />
              )}
            </div>

            {/* Ranked list */}
            <div className="rounded-[18px] p-5" style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-[13px] font-semibold mb-4">Top Spending Categories</div>
              {loadingMonth ? (
                <div className="h-[140px] flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(99,102,241,0.4)", borderTopColor: "#6366F1" }} />
                </div>
              ) : topCategories.length === 0 ? (
                <div className="text-[12px] text-[#4B5462]">No expenses this month.</div>
              ) : (
                <div className="flex flex-col gap-[10px]">
                  {topCategories.map((item, rank) => {
                    const pct = totalMonthSpend > 0 ? (item.total / totalMonthSpend) * 100 : 0;
                    return (
                      <div key={item.categoryId}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold w-4 text-right flex-shrink-0" style={{ color: "#4B5462" }}>
                            {rank + 1}
                          </span>
                          <div
                            className="w-6 h-6 rounded-[7px] flex items-center justify-center flex-shrink-0"
                            style={{ background: `${item.cat!.color}22` }}
                          >
                            <Icon name={item.cat!.icon} size={13} style={{ color: item.cat!.color }} />
                          </div>
                          <span className="text-[12.5px] font-medium flex-1 truncate">{item.cat!.name}</span>
                          <span className="text-[12px] font-semibold tabular" style={{ color: item.cat!.color }}>
                            {formatCurrency(item.total)}
                          </span>
                          <span className="text-[11px] text-[#4B5462] w-9 text-right flex-shrink-0">
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                        <div className="ml-12 h-[5px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.05)" }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: item.cat!.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Category MoM comparison */}
            <div className="rounded-[18px] p-5" style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-[13px] font-semibold mb-1">Category vs Last Month</div>
              <div className="text-[11px] text-[#4B5462] mb-4">Change in spending per category</div>
              {loadingMonth ? (
                <div className="h-[140px] flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(99,102,241,0.4)", borderTopColor: "#6366F1" }} />
                </div>
              ) : (
                <CategoryMoMChart current={spending} previous={prevSpending} categories={categories} />
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
