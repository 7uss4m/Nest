"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { getWorkspaceId } from "@/lib/auth";
import { formatMoney, MoneyDto } from "@/lib/utils";
import { Topbar } from "@/components/layout/Topbar";
import { Icon } from "@/components/ui/Icon";

interface Asset {
  id: string;
  name: string;
  assetType: number;
  currentValue: MoneyDto;
}

interface Liability {
  id: string;
  name: string;
  type: number;
  currentBalance: MoneyDto;
}

interface NWEntry {
  month: string;
  assets: number;
  liabilities: number;
  netWorth: number;
}

const ASSET_TYPE_COLORS = [
  "#6366F1", "#FBBF24", "#38BDF8", "#A78BFA",
  "#34D399", "#2DD4BF", "#F97316", "#818CF8", "#FB7185", "#98A2B3",
];
const ASSET_TYPE_LABELS = [
  "Real Estate", "Vehicle", "Electronics", "Valuables",
  "Savings", "Investment", "Crypto", "Business", "Loan Given", "Other",
];
const LIABILITY_TYPE_COLORS = [
  "#6366F1", "#FBBF24", "#FB7185", "#F97316",
  "#38BDF8", "#818CF8", "#A78BFA", "#98A2B3",
];
const LIABILITY_TYPE_LABELS = [
  "Mortgage", "Vehicle Loan", "Personal Loan", "Credit Card",
  "Student Loan", "Business Loan", "Owed to Person", "Other",
];

function SparkChart({ data }: { data: NWEntry[] }) {
  if (data.length < 2) return null;
  const values = data.map((d) => d.netWorth);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const W = 560, H = 96, PAD = 4;
  const xs = data.map((_, i) => PAD + (i / (data.length - 1)) * (W - PAD * 2));
  const ys = values.map((v) => PAD + (1 - (v - min) / range) * (H - PAD * 2));
  const line = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const area = `${line} L${xs[xs.length - 1].toFixed(1)},${H} L${xs[0].toFixed(1)},${H} Z`;
  const lastIsPositive = values[values.length - 1] >= 0;
  const color = lastIsPositive ? "#34D399" : "#FB7185";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 96, overflow: "visible" }}>
      <defs>
        <linearGradient id="nw-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#nw-grad)" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="4" fill={color} />
    </svg>
  );
}

function BreakdownBar({ items }: { items: { label: string; value: number; color: string }[] }) {
  const total = items.reduce((s, i) => s + i.value, 0);
  if (total === 0) return null;
  return (
    <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
      {items.map((item) => (
        <div
          key={item.label}
          style={{ width: `${(item.value / total) * 100}%`, background: item.color, minWidth: 2 }}
        />
      ))}
    </div>
  );
}

export default function NetWorthPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [liabilities, setLiabilities] = useState<Liability[]>([]);
  const [history, setHistory] = useState<NWEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const workspaceId = getWorkspaceId();
  const base = `/api/workspaces/${workspaceId}`;

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    Promise.all([
      api.get<Asset[]>(`${base}/assets`),
      api.get<Liability[]>(`${base}/liabilities`),
      api.get<NWEntry[]>(`${base}/dashboard/net-worth-history`),
    ])
      .then(([a, l, h]) => { setAssets(a); setLiabilities(l); setHistory(h); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId, base]);

  const totalAssets = assets.reduce((s, a) => s + a.currentValue.amount, 0);
  const totalLiabilities = liabilities.reduce((s, l) => s + l.currentBalance.amount, 0);
  const netWorth = totalAssets - totalLiabilities;
  const isPositive = netWorth >= 0;
  const refMoney = assets[0]?.currentValue ?? liabilities[0]?.currentBalance ?? { amount: 0, currencyCode: "USD" };

  const prevNW = history.length >= 2 ? history[history.length - 2].netWorth : null;
  const momChange = prevNW != null && prevNW !== 0 ? ((netWorth - prevNW) / Math.abs(prevNW)) * 100 : null;

  const assetsByType = ASSET_TYPE_LABELS.map((label, i) => ({
    label, color: ASSET_TYPE_COLORS[i],
    value: assets.filter((a) => a.assetType === i).reduce((s, a) => s + a.currentValue.amount, 0),
  })).filter((t) => t.value > 0);

  const liabsByType = LIABILITY_TYPE_LABELS.map((label, i) => ({
    label, color: LIABILITY_TYPE_COLORS[i],
    value: liabilities.filter((l) => l.type === i).reduce((s, l) => s + l.currentBalance.amount, 0),
  })).filter((t) => t.value > 0);

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Net Worth" subtitle="Total assets minus total liabilities." />

      <div className="flex-1 overflow-auto p-7">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex items-center gap-3 text-[#5B6573]">
              <div className="w-5 h-5 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(99,102,241,0.4)", borderTopColor: "#6366F1" }} />
              <span className="text-[13px]">Loading net worth…</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6 max-w-[900px]">
            {/* Hero */}
            <div
              className="rounded-[22px] p-6"
              style={{ background: "linear-gradient(135deg,rgba(99,102,241,0.18),rgba(45,212,191,0.08))", border: "1px solid rgba(99,102,241,0.20)" }}
            >
              <div className="flex items-start justify-between mb-1">
                <div className="text-[12.5px] text-[#98A2B3] font-medium">Net Worth</div>
                {momChange != null && (
                  <span
                    className="text-[12px] font-semibold px-[9px] py-[3px] rounded-full"
                    style={{
                      color: momChange >= 0 ? "#34D399" : "#FB7185",
                      background: momChange >= 0 ? "rgba(52,211,153,0.14)" : "rgba(251,113,133,0.14)",
                    }}
                  >
                    {momChange >= 0 ? "+" : ""}{momChange.toFixed(1)}% MoM
                  </span>
                )}
              </div>
              <div
                className="text-[40px] font-[800] tabular mb-1"
                style={{ fontFamily: "'Inter Tight'", color: isPositive ? "#34D399" : "#FB7185" }}
              >
                {formatMoney({ ...refMoney, amount: netWorth })}
              </div>
              <div className="flex items-center gap-4 text-[12px] mb-4">
                <span style={{ color: "#34D399" }}>Assets: {formatMoney({ ...refMoney, amount: totalAssets })}</span>
                <span style={{ color: "#5B6573" }}>−</span>
                <span style={{ color: "#FB7185" }}>Debt: {formatMoney({ ...refMoney, amount: totalLiabilities })}</span>
              </div>
              <SparkChart data={history} />
              <div className="flex items-center justify-between mt-2">
                {history.map((e, i) => (
                  i % 3 === 0 || i === history.length - 1
                    ? <span key={e.month} className="text-[10px] text-[#4B5462]">{e.month}</span>
                    : <span key={e.month} />
                ))}
              </div>
            </div>

            {/* Assets + Liabilities side by side */}
            <div className="grid grid-cols-2 gap-4">
              {/* Assets breakdown */}
              <div className="rounded-[18px] p-5" style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-[12px] text-[#98A2B3]">Total Assets</div>
                    <div className="text-[22px] font-[700] tabular" style={{ fontFamily: "'Inter Tight'", color: "#34D399" }}>
                      {formatMoney({ ...refMoney, amount: totalAssets })}
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-[11px] flex items-center justify-center" style={{ background: "rgba(52,211,153,0.12)" }}>
                    <Icon name="diamond" size={18} style={{ color: "#34D399" }} />
                  </div>
                </div>
                {assetsByType.length > 0 ? (
                  <>
                    <BreakdownBar items={assetsByType} />
                    <div className="flex flex-col gap-2 mt-3">
                      {assetsByType.map((t) => (
                        <div key={t.label} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.color }} />
                          <span className="text-[12px] text-[#98A2B3] flex-1">{t.label}</span>
                          <span className="text-[12px] font-semibold tabular" style={{ color: t.color }}>{formatMoney({ ...refMoney, amount: t.value })}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-[12px] text-[#4B5462] mt-2">No assets recorded yet.</div>
                )}
              </div>

              {/* Liabilities breakdown */}
              <div className="rounded-[18px] p-5" style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-[12px] text-[#98A2B3]">Total Debt</div>
                    <div className="text-[22px] font-[700] tabular" style={{ fontFamily: "'Inter Tight'", color: "#FB7185" }}>
                      {formatMoney({ ...refMoney, amount: totalLiabilities })}
                    </div>
                  </div>
                  <div className="w-9 h-9 rounded-[11px] flex items-center justify-center" style={{ background: "rgba(251,113,133,0.12)" }}>
                    <Icon name="trending_down" size={18} style={{ color: "#FB7185" }} />
                  </div>
                </div>
                {liabsByType.length > 0 ? (
                  <>
                    <BreakdownBar items={liabsByType} />
                    <div className="flex flex-col gap-2 mt-3">
                      {liabsByType.map((t) => (
                        <div key={t.label} className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: t.color }} />
                          <span className="text-[12px] text-[#98A2B3] flex-1">{t.label}</span>
                          <span className="text-[12px] font-semibold tabular" style={{ color: t.color }}>{formatMoney({ ...refMoney, amount: t.value })}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-[12px] text-[#4B5462] mt-2">No liabilities recorded yet.</div>
                )}
              </div>
            </div>

            {/* Debt-to-asset ratio */}
            {totalAssets > 0 && (
              <div className="rounded-[18px] p-5" style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[13px] font-semibold">Debt-to-Asset Ratio</div>
                  <span
                    className="text-[12px] font-semibold px-[9px] py-[3px] rounded-full"
                    style={{
                      color: totalLiabilities / totalAssets < 0.5 ? "#34D399" : "#FB7185",
                      background: totalLiabilities / totalAssets < 0.5 ? "rgba(52,211,153,0.12)" : "rgba(251,113,133,0.12)",
                    }}
                  >
                    {((totalLiabilities / totalAssets) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min((totalLiabilities / totalAssets) * 100, 100)}%`,
                      background: totalLiabilities / totalAssets < 0.5 ? "#34D399" : "#FB7185",
                    }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-[#5B6573] mt-1.5">
                  <span>0% (debt-free)</span>
                  <span>100% (fully leveraged)</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
