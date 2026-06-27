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
  balance: number;
  createdAt: string;
}

interface LiabilityDetail {
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
  balanceHistory: HistoryPoint[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TYPE_LABELS = [
  "Mortgage", "Vehicle Loan", "Personal Loan", "Credit Card",
  "Student Loan", "Business Loan", "Owed to Person", "Other",
];
const TYPE_ICONS = [
  "home", "directions_car", "person", "credit_card",
  "school", "business_center", "handshake", "category",
];
const TYPE_COLORS = [
  "#6366F1", "#FBBF24", "#FB7185", "#F97316",
  "#38BDF8", "#818CF8", "#A78BFA", "#98A2B3",
];

// ── Paydown chart ─────────────────────────────────────────────────────────────

function PaydownChart({ history, originalAmount }: { history: HistoryPoint[]; originalAmount: number }) {
  const [hover, setHover] = useState<number | null>(null);
  if (history.length < 2) {
    return (
      <div className="text-[12px] text-[#4B5462] text-center py-6">
        Update the balance more than once to see a paydown chart.
      </div>
    );
  }

  const W = 560, H = 120, PAD_X = 12, PAD_Y = 12;
  const n = history.length;
  const maxV = Math.max(...history.map((h) => h.balance), originalAmount);
  const minV = 0;

  function xOf(i: number) { return PAD_X + (i / (n - 1)) * (W - PAD_X * 2); }
  function yOf(v: number) { return PAD_Y + (1 - (v - minV) / (maxV - minV || 1)) * (H - PAD_Y * 2); }

  const pts = history.map((h, i) => ({ x: xOf(i), y: yOf(h.balance), ...h }));
  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${line} L${pts[n - 1].x.toFixed(1)},${H} L${pts[0].x.toFixed(1)},${H} Z`;
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
          <linearGradient id="pd-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FB7185" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#FB7185" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#pd-grad)" />
        <path d={line} fill="none" stroke="#FB7185" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
        {hoverPt && (
          <>
            <line x1={hoverPt.x} y1={PAD_Y} x2={hoverPt.x} y2={H - PAD_Y} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            <circle cx={hoverPt.x} cy={hoverPt.y} r={4} fill="#FB7185" />
            <g>
              <rect
                x={Math.min(hoverPt.x - 40, W - 110)} y={Math.max(hoverPt.y - 52, 0)}
                width={108} height={44} rx={6}
                fill="#1E2536" stroke="rgba(255,255,255,0.08)" strokeWidth={0.5}
              />
              <text
                x={Math.min(hoverPt.x - 40, W - 110) + 8}
                y={Math.max(hoverPt.y - 52, 0) + 14}
                fontSize="8" fill="#98A2B3"
              >
                {new Date(hoverPt.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </text>
              <text
                x={Math.min(hoverPt.x - 40, W - 110) + 8}
                y={Math.max(hoverPt.y - 52, 0) + 30}
                fontSize="10" fontWeight="700" fill="#FB7185"
              >
                {formatCurrency(hoverPt.balance)}
              </text>
            </g>
          </>
        )}
      </svg>
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

export default function LiabilityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [liability, setLiability] = useState<LiabilityDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const workspaceId = getWorkspaceId();

  useEffect(() => {
    if (!workspaceId || !id) return;
    api.get<LiabilityDetail>(`/api/workspaces/${workspaceId}/liabilities/${id}`)
      .then(setLiability)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId, id]);

  const color = liability ? (TYPE_COLORS[liability.type] ?? "#FB7185") : "#FB7185";
  const icon = liability ? (TYPE_ICONS[liability.type] ?? "category") : "credit_card";

  const paid = liability ? liability.originalAmount - liability.currentBalance : 0;
  const paidPct = liability && liability.originalAmount > 0
    ? Math.round((paid / liability.originalAmount) * 100)
    : 0;

  // Months to payoff at current monthly payment (simple linear projection)
  const monthsLeft = liability?.monthlyPayment && liability.monthlyPayment > 0
    ? Math.ceil(liability.currentBalance / liability.monthlyPayment)
    : null;
  const payoffDate = monthsLeft != null
    ? new Date(Date.now() + monthsLeft * 30 * 86400000).toLocaleDateString("en-US", { month: "long", year: "numeric" })
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
      <Topbar title={loading ? "Liability" : (liability?.name ?? "Not found")} subtitle="Liability detail" actions={backBtn} />

      <div className="flex-1 overflow-auto p-7">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "rgba(99,102,241,0.4)", borderTopColor: "#6366F1" }} />
          </div>
        ) : !liability ? (
          <div className="text-[13px] text-[#5B6573]">Liability not found.</div>
        ) : (
          <div className="flex flex-col gap-6 max-w-[900px]">

            {/* Hero */}
            <div
              className="rounded-[22px] p-6"
              style={{ background: "#141925", border: `1px solid ${color}30` }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-14 h-14 rounded-[16px] flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}22` }}
                >
                  <Icon name={icon} size={28} weight={400} style={{ color }} />
                </div>
                <div className="flex-1">
                  <div className="text-[13px] font-medium text-[#5B6573]">
                    {TYPE_LABELS[liability.type]}
                    {liability.lenderName && ` · ${liability.lenderName}`}
                  </div>
                  <div className="text-[36px] font-[800] tabular leading-tight mt-1" style={{ fontFamily: "'Inter Tight'", color: "#FB7185" }}>
                    {formatCurrency(liability.currentBalance, liability.currency)}
                  </div>
                  <div className="text-[13px] text-[#5B6573] mt-1">
                    {formatCurrency(paid, liability.currency)} paid of {formatCurrency(liability.originalAmount, liability.currency)}
                  </div>
                  {/* Payoff progress bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] mb-1">
                      <span className="text-[#5B6573]">Progress</span>
                      <span className="font-semibold" style={{ color: "#34D399" }}>{paidPct}% paid off</span>
                    </div>
                    <div className="h-[7px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${paidPct}%`, background: "#34D399" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stat chips */}
            <div className="grid grid-cols-4 gap-4">
              {liability.interestRate != null && (
                <StatChip label="Interest Rate" value={`${liability.interestRate.toFixed(2)}% APR`} />
              )}
              {liability.monthlyPayment != null && (
                <StatChip label="Monthly Payment" value={formatCurrency(liability.monthlyPayment, liability.currency)} />
              )}
              {monthsLeft != null && (
                <StatChip label="Months Remaining" value={String(monthsLeft)} />
              )}
              {payoffDate && (
                <StatChip label="Est. Payoff" value={payoffDate} color="#34D399" />
              )}
            </div>

            {/* Paydown chart */}
            <div className="rounded-[18px] p-5" style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-[13px] font-semibold mb-1">Balance Paydown</div>
              <div className="text-[11px] text-[#4B5462] mb-4">{liability.balanceHistory.length} recorded update{liability.balanceHistory.length !== 1 ? "s" : ""}</div>
              <PaydownChart history={liability.balanceHistory} originalAmount={liability.originalAmount} />
            </div>

            {/* History table */}
            {liability.balanceHistory.length > 0 && (
              <div className="rounded-[18px] p-5" style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="text-[13px] font-semibold mb-4">Update Log</div>
                <div className="flex flex-col divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                  {[...liability.balanceHistory].reverse().map((h, i) => {
                    const prev = [...liability.balanceHistory].reverse()[i + 1];
                    const delta = prev ? h.balance - prev.balance : null;
                    return (
                      <div key={h.createdAt + i} className="flex items-center justify-between py-3">
                        <div className="text-[12.5px] text-[#98A2B3]">
                          {new Date(h.createdAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                        </div>
                        <div className="flex items-center gap-3">
                          {delta != null && (
                            <span
                              className="text-[11.5px] font-medium"
                              style={{ color: delta < 0 ? "#34D399" : "#FB7185" }}
                            >
                              {delta < 0 ? "" : "+"}{formatCurrency(delta, liability.currency)}
                            </span>
                          )}
                          <span className="text-[13px] font-[700] tabular" style={{ fontFamily: "'Inter Tight'", color: "#FB7185" }}>
                            {formatCurrency(h.balance, liability.currency)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Details */}
            {(liability.notes || liability.dueDate || liability.startDate) && (
              <div className="rounded-[18px] p-5" style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="text-[13px] font-semibold mb-4">Details</div>
                <div className="flex flex-col gap-3 text-[12.5px]">
                  {liability.startDate && (
                    <div><span className="text-[#5B6573]">Start Date: </span><span className="text-[#C4CBD6]">{new Date(liability.startDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span></div>
                  )}
                  {liability.dueDate && (
                    <div><span className="text-[#5B6573]">Due Date: </span><span className="text-[#C4CBD6]">{new Date(liability.dueDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span></div>
                  )}
                  {liability.notes && (
                    <div><span className="text-[#5B6573]">Notes: </span><span className="text-[#C4CBD6]">{liability.notes}</span></div>
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
