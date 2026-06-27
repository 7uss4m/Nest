"use client";

import { Icon } from "@/components/ui/Icon";
import { formatCompact, formatCurrency } from "@/lib/utils";

export interface NWHistoryEntry {
  month: string;
  assets: number;
  liabilities: number;
  netWorth: number;
}

function smoothPath(data: number[], w: number, h: number, pad: number) {
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const step = (w - pad * 2) / (data.length - 1);
  const pts = data.map((v, i) => [pad + i * step, h - pad - ((v - min) / range) * (h - pad * 2)] as [number, number]);

  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

export function NetWorthCard({ history }: { history: NWHistoryEntry[] }) {
  const data = history.map((h) => h.netWorth);
  const last = history[history.length - 1] ?? { netWorth: 0, assets: 0, liabilities: 0 };
  const prev = history[history.length - 2];

  const pct = prev && prev.netWorth !== 0
    ? Math.abs(((last.netWorth - prev.netWorth) / prev.netWorth) * 100).toFixed(1)
    : null;
  const isUp = prev ? last.netWorth >= prev.netWorth : true;
  const monthDiff = last.netWorth - (prev?.netWorth ?? 0);

  const chartData = data.length >= 2 ? data : [0, last.netWorth];
  const line = smoothPath(chartData, 560, 150, 6);
  const area = line + ` L ${(560 - 6).toFixed(1)} 150 L 6 150 Z`;

  const monthLabels = history.filter((_, i) => i % 2 === 0).map((h) => h.month);

  return (
    <div
      className="col-span-8 flex flex-col p-6 rounded-[18px]"
      style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="flex justify-between items-start">
        <div>
          <div className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[#5B6573]">Net worth</div>
          <div className="flex items-baseline gap-3 mt-2">
            <span
              className="font-[800] text-[44px] tracking-[-0.03em] leading-none tabular"
              style={{ fontFamily: "'Inter Tight'" }}
            >
              {formatCurrency(last.netWorth)}
            </span>
            {pct !== null && (
              <span
                className="inline-flex items-center gap-[3px] text-[13px] font-semibold px-[9px] py-1 rounded-full"
                style={{
                  color: isUp ? "#34D399" : "#FB7185",
                  background: isUp ? "rgba(52,211,153,0.12)" : "rgba(251,113,133,0.12)",
                }}
              >
                <Icon name={isUp ? "arrow_upward" : "arrow_downward"} size={15} weight={500} />
                {pct}%
              </span>
            )}
          </div>
          {prev && (
            <div className="text-[12.5px] text-[#5B6573] mt-[7px]">
              {isUp ? "+" : "−"}{formatCurrency(Math.abs(monthDiff))} this month
            </div>
          )}
        </div>

        <div className="flex flex-col gap-[10px] items-end">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#2DD4BF]" />
            <span className="text-[12.5px] text-[#98A2B3]">Assets</span>
            <span className="text-[13px] font-semibold tabular">{formatCompact(last.assets)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FB7185]" />
            <span className="text-[12.5px] text-[#98A2B3]">Liabilities</span>
            <span className="text-[13px] font-semibold tabular">{formatCompact(last.liabilities)}</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-[150px] mt-[14px]">
        <svg width="100%" height="100%" viewBox="0 0 560 150" preserveAspectRatio="none" style={{ display: "block" }}>
          <defs>
            <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#6366F1" stopOpacity="0.32" />
              <stop offset="1" stopColor="#6366F1" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill="url(#nwGrad)" />
          <path d={line} fill="none" stroke="#818CF8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>

      <div className="flex justify-between text-[10.5px] text-[#4B5462] mt-[2px] tabular">
        {monthLabels.map((m) => <span key={m}>{m}</span>)}
      </div>
    </div>
  );
}
