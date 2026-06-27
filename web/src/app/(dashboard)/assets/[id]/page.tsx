"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getWorkspaceId } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";
import { Topbar } from "@/components/layout/Topbar";
import { Icon } from "@/components/ui/Icon";

// ── Types ─────────────────────────────────────────────────────────────────────

interface HistoryPoint {
  value: number;
  createdAt: string;
}

interface AssetDetail {
  id: string;
  name: string;
  description?: string;
  assetClass: number;
  assetType: number;
  currentValue: number;
  currency: string;
  purchaseDate?: string;
  purchasePrice?: number;
  purchaseCurrency?: string;
  institution?: string;
  condition?: string;
  location?: string;
  isShared: boolean;
  notes?: string;
  createdAt: string;
  currentValueUpdatedAt?: string;
  valueHistory: HistoryPoint[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_LABELS = [
  "Real Estate", "Vehicle", "Electronics", "Valuables",
  "Savings", "Investment", "Crypto", "Business", "Loan Given", "Other",
];
const TYPE_ICONS = [
  "home", "directions_car", "devices", "diamond",
  "savings", "trending_up", "currency_bitcoin", "business_center", "handshake", "category",
];
const TYPE_COLORS = [
  "#6366F1", "#FBBF24", "#38BDF8", "#A78BFA",
  "#34D399", "#2DD4BF", "#F97316", "#818CF8", "#FB7185", "#98A2B3",
];

// ── Value history line chart ──────────────────────────────────────────────────

function ValueHistoryChart({ history, color }: { history: HistoryPoint[]; color: string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (history.length < 2) {
    return (
      <div className="text-[12px] text-[#4B5462] text-center py-6">
        Update the asset value more than once to see a trend here.
      </div>
    );
  }

  const W = 560, H = 120, PAD_X = 12, PAD_Y = 12;
  const values = history.map((h) => h.value);
  const minV = Math.min(...values);
  const maxV = Math.max(...values, minV + 1);
  const n = history.length;

  function xOf(i: number) { return PAD_X + (i / (n - 1)) * (W - PAD_X * 2); }
  function yOf(v: number) { return PAD_Y + (1 - (v - minV) / (maxV - minV)) * (H - PAD_Y * 2); }

  const pts = history.map((h, i) => ({ x: xOf(i), y: yOf(h.value), ...h }));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[n - 1].x.toFixed(1)},${H} L${pts[0].x.toFixed(1)},${H} Z`;
  const gradId = `vhg-${color.replace("#", "")}`;
  const hoverPt = hover !== null ? pts[hover] : null;

  return (
    <div onMouseLeave={() => setHover(null)}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: H, overflow: "visible" }}
        onMouseMove={(e) => {
          const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const relX = ((e.clientX - rect.left) / rect.width) * W;
          const idx = Math.round(((relX - PAD_X) / (W - PAD_X * 2)) * (n - 1));
          setHover(Math.max(0, Math.min(n - 1, idx)));
        }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill={`url(#${gradId})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
        {hoverPt && (
          <>
            <line x1={hoverPt.x} y1={PAD_Y} x2={hoverPt.x} y2={H - PAD_Y} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            <circle cx={hoverPt.x} cy={hoverPt.y} r={4} fill={color} />
            <g>
              <rect
                x={Math.min(hoverPt.x - 40, W - 100)} y={Math.max(hoverPt.y - 52, 0)}
                width={100} height={44} rx={6}
                fill="#1E2536" stroke="rgba(255,255,255,0.08)" strokeWidth={0.5}
              />
              <text
                x={Math.min(hoverPt.x - 40, W - 100) + 8}
                y={Math.max(hoverPt.y - 52, 0) + 14}
                fontSize="8" fill="#98A2B3"
              >
                {new Date(hoverPt.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </text>
              <text
                x={Math.min(hoverPt.x - 40, W - 100) + 8}
                y={Math.max(hoverPt.y - 52, 0) + 30}
                fontSize="10" fontWeight="700" fill={color}
              >
                {formatCurrency(hoverPt.value)}
              </text>
            </g>
          </>
        )}
      </svg>
      {/* Date axis labels */}
      <div className="flex justify-between mt-1 text-[9.5px] text-[#3B4252]">
        <span>{new Date(history[0].createdAt).toLocaleDateString("en-US", { month: "short", year: "2-digit" })}</span>
        {history.length > 2 && (
          <span>{new Date(history[Math.floor(n / 2)].createdAt).toLocaleDateString("en-US", { month: "short", year: "2-digit" })}</span>
        )}
        <span>{new Date(history[n - 1].createdAt).toLocaleDateString("en-US", { month: "short", year: "2-digit" })}</span>
      </div>
    </div>
  );
}

// ── Stat chip ─────────────────────────────────────────────────────────────────

function StatChip({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="p-4 rounded-[14px]" style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="text-[11px] text-[#5B6573] mb-1">{label}</div>
      <div className="text-[18px] font-[700] tabular leading-tight" style={{ fontFamily: "'Inter Tight'", color: color ?? "#EEF1F6" }}>
        {value}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [asset, setAsset] = useState<AssetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const workspaceId = getWorkspaceId();

  useEffect(() => {
    if (!workspaceId || !id) return;
    api.get<AssetDetail>(`/api/workspaces/${workspaceId}/assets/${id}`)
      .then(setAsset)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId, id]);

  const color = asset ? (TYPE_COLORS[asset.assetType] ?? "#98A2B3") : "#6366F1";
  const icon = asset ? (TYPE_ICONS[asset.assetType] ?? "category") : "diamond";

  const gain = asset?.purchasePrice != null ? asset.currentValue - asset.purchasePrice : null;
  const gainPct = gain != null && asset?.purchasePrice ? (gain / asset.purchasePrice) * 100 : null;
  const daysOwned = asset?.purchaseDate
    ? Math.floor((Date.now() - new Date(asset.purchaseDate).getTime()) / 86400000)
    : asset
    ? Math.floor((Date.now() - new Date(asset.createdAt).getTime()) / 86400000)
    : null;

  const avgMonthlyAppreciation = gain != null && daysOwned && daysOwned > 30
    ? (gain / (daysOwned / 30))
    : null;

  const backBtn = (
    <button
      onClick={() => router.back()}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] text-[12.5px] font-medium transition-colors hover:bg-[rgba(255,255,255,0.06)]"
      style={{ color: "#98A2B3" }}
    >
      <Icon name="arrow_back" size={15} />
      Back
    </button>
  );

  return (
    <div className="flex flex-col h-full">
      <Topbar title={loading ? "Asset" : (asset?.name ?? "Not found")} subtitle="Asset detail" actions={backBtn} />

      <div className="flex-1 overflow-auto p-7">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(99,102,241,0.4)", borderTopColor: "#6366F1" }} />
          </div>
        ) : !asset ? (
          <div className="text-[13px] text-[#5B6573]">Asset not found.</div>
        ) : (
          <div className="flex flex-col gap-6 max-w-[900px]">

            {/* Hero */}
            <div
              className="rounded-[22px] p-6"
              style={{
                background: `linear-gradient(135deg, ${color}22 0%, rgba(20,25,37,0) 70%), #141925`,
                border: `1px solid ${color}30`,
              }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-14 h-14 rounded-[16px] flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}22` }}
                >
                  <Icon name={icon} size={28} weight={400} style={{ color }} />
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-medium" style={{ color: color + "cc" }}>
                    {TYPE_LABELS[asset.assetType]} · {asset.assetClass === 0 ? "Physical" : "Financial"}
                    {asset.institution && ` · ${asset.institution}`}
                  </div>
                  <div className="text-[36px] font-[800] tabular leading-tight mt-1" style={{ fontFamily: "'Inter Tight'", color }}>
                    {formatCurrency(asset.currentValue, asset.currency)}
                  </div>
                  {gain != null && (
                    <div
                      className="text-[13.5px] font-semibold mt-1"
                      style={{ color: gain >= 0 ? "#34D399" : "#FB7185" }}
                    >
                      {gain >= 0 ? "+" : ""}{formatCurrency(gain, asset.currency)}
                      {gainPct != null && ` (${gainPct >= 0 ? "+" : ""}${gainPct.toFixed(1)}%)`}
                      {" from purchase"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Stat chips */}
            <div className="grid grid-cols-4 gap-4">
              {daysOwned != null && (
                <StatChip label="Days Owned" value={daysOwned.toLocaleString()} />
              )}
              {asset.purchasePrice != null && (
                <StatChip
                  label="Purchase Price"
                  value={formatCurrency(asset.purchasePrice, asset.purchaseCurrency ?? asset.currency)}
                />
              )}
              {avgMonthlyAppreciation != null && (
                <StatChip
                  label="Avg / Month"
                  value={`${avgMonthlyAppreciation >= 0 ? "+" : ""}${formatCurrency(avgMonthlyAppreciation, asset.currency)}`}
                  color={avgMonthlyAppreciation >= 0 ? "#34D399" : "#FB7185"}
                />
              )}
              <StatChip
                label="Last Updated"
                value={asset.currentValueUpdatedAt
                  ? new Date(asset.currentValueUpdatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                  : "—"}
              />
            </div>

            {/* Value history chart */}
            <div className="rounded-[18px] p-5" style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-[13px] font-semibold mb-1">Value History</div>
              <div className="text-[11px] text-[#4B5462] mb-4">{asset.valueHistory.length} recorded update{asset.valueHistory.length !== 1 ? "s" : ""}</div>
              <ValueHistoryChart history={asset.valueHistory} color={color} />
            </div>

            {/* History table */}
            {asset.valueHistory.length > 0 && (
              <div className="rounded-[18px] p-5" style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="text-[13px] font-semibold mb-4">Update Log</div>
                <div className="flex flex-col divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  {[...asset.valueHistory].reverse().map((h, i) => {
                    const prev = [...asset.valueHistory].reverse()[i + 1];
                    const delta = prev ? h.value - prev.value : null;
                    return (
                      <div key={h.createdAt + i} className="flex items-center justify-between py-3">
                        <div className="text-[12.5px] text-[#98A2B3]">
                          {new Date(h.createdAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                        </div>
                        <div className="flex items-center gap-3">
                          {delta != null && (
                            <span
                              className="text-[11.5px] font-medium"
                              style={{ color: delta >= 0 ? "#34D399" : "#FB7185" }}
                            >
                              {delta >= 0 ? "+" : ""}{formatCurrency(delta, asset.currency)}
                            </span>
                          )}
                          <span className="text-[13px] font-[700] tabular" style={{ fontFamily: "'Inter Tight'", color }}>
                            {formatCurrency(h.value, asset.currency)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Details */}
            {(asset.description || asset.notes || asset.condition || asset.location) && (
              <div className="rounded-[18px] p-5" style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="text-[13px] font-semibold mb-4">Details</div>
                <div className="flex flex-col gap-3 text-[12.5px]">
                  {asset.description && (
                    <div><span className="text-[#5B6573]">Description: </span><span className="text-[#C4CBD6]">{asset.description}</span></div>
                  )}
                  {asset.condition && (
                    <div><span className="text-[#5B6573]">Condition: </span><span className="text-[#C4CBD6]">{asset.condition}</span></div>
                  )}
                  {asset.location && (
                    <div><span className="text-[#5B6573]">Location: </span><span className="text-[#C4CBD6]">{asset.location}</span></div>
                  )}
                  {asset.notes && (
                    <div><span className="text-[#5B6573]">Notes: </span><span className="text-[#C4CBD6]">{asset.notes}</span></div>
                  )}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
