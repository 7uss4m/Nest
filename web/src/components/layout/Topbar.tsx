"use client";

import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";

interface TopbarProps {
  title: string;
  subtitle?: string;
  month?: string;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  actions?: React.ReactNode;
}

export function Topbar({ title, subtitle, month = "June 2026", onPrevMonth, onNextMonth, actions }: TopbarProps) {
  const router = useRouter();

  return (
    <header
      className="h-[70px] flex-shrink-0 flex items-center justify-between px-7"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div>
        <div className="text-[20px] font-bold tracking-[-0.01em]">{title}</div>
        {subtitle && <div className="text-[12.5px] text-[#5B6573] mt-[1px]">{subtitle}</div>}
      </div>

      <div className="flex items-center gap-3">
        {actions ?? (
          <>
            {/* Search — navigates to transactions with focus */}
            <button
              onClick={() => router.push("/transactions")}
              className="flex items-center gap-2 px-3 py-2 rounded-[10px] w-[200px] transition-colors hover:bg-[#1A1F2E]"
              style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <Icon name="search" size={18} className="text-[#5B6573]" />
              <span className="text-[13px] text-[#5B6573]">Search transactions</span>
            </button>

            {/* Month picker */}
            <div
              className="flex items-center gap-[3px] rounded-[10px] text-[13px] font-medium overflow-hidden"
              style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              {onPrevMonth && (
                <button onClick={onPrevMonth} className="px-2 py-2 hover:bg-[rgba(255,255,255,0.06)] transition-colors" style={{ color: "#5B6573" }}>
                  <Icon name="chevron_left" size={18} />
                </button>
              )}
              <span className="flex items-center gap-[6px] px-[10px] py-2">
                <Icon name="calendar_month" size={17} className="text-[#818CF8]" />
                {month}
              </span>
              {onNextMonth && (
                <button onClick={onNextMonth} className="px-2 py-2 hover:bg-[rgba(255,255,255,0.06)] transition-colors" style={{ color: "#5B6573" }}>
                  <Icon name="chevron_right" size={18} />
                </button>
              )}
            </div>

            {/* Add transaction — navigates to transactions page */}
            <button
              onClick={() => router.push("/transactions")}
              className="flex items-center gap-[7px] px-[15px] py-[9px] rounded-[10px] text-[13px] font-semibold cursor-pointer transition-colors hover:bg-[#818CF8]"
              style={{
                background: "#6366F1",
                color: "#0B0E14",
                boxShadow: "0 6px 18px rgba(99,102,241,0.35)",
                border: "none",
              }}
            >
              <Icon name="add" size={18} weight={500} />
              Add transaction
            </button>
          </>
        )}
      </div>
    </header>
  );
}
