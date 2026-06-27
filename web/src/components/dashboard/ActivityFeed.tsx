"use client";

import { Icon } from "@/components/ui/Icon";

export interface ActivityEvent {
  id: string;
  action: string;
  description: string;
  userName: string;
  createdAt: string;
}

const ACTION_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  "transaction.created": { icon: "add_circle", color: "#34D399", bg: "rgba(52,211,153,0.14)" },
  "transaction.deleted": { icon: "remove_circle", color: "#FB7185", bg: "rgba(251,113,133,0.14)" },
  "budget.created":      { icon: "savings", color: "#FBBF24", bg: "rgba(251,191,36,0.14)" },
  "budget.deleted":      { icon: "savings", color: "#FB7185", bg: "rgba(251,113,133,0.14)" },
};

function getIcon(action: string) {
  return ACTION_ICONS[action] ?? { icon: "history", color: "#818CF8", bg: "rgba(99,102,241,0.14)" };
}

function timeAgo(isoDate: string) {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

interface Props {
  events: ActivityEvent[];
}

export function ActivityFeed({ events }: Props) {
  return (
    <div
      className="col-span-12 p-5 rounded-[18px]"
      style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Icon name="history" size={18} style={{ color: "#818CF8" }} />
        <span className="text-[13.5px] font-semibold text-[#EEF1F6]">Recent Activity</span>
      </div>

      {events.length === 0 ? (
        <div className="flex items-center justify-center py-6 text-[13px] text-[#4B5462]">
          No activity yet — add a transaction to get started.
        </div>
      ) : (
        <div className="grid grid-cols-2 xl:grid-cols-3 gap-x-6">
          {events.slice(0, 12).map((e) => {
            const { icon, color, bg } = getIcon(e.action);
            return (
              <div key={e.id} className="flex items-center gap-3 py-[10px]" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div
                  className="w-8 h-8 rounded-[9px] flex items-center justify-center flex-shrink-0"
                  style={{ background: bg }}
                >
                  <Icon name={icon} size={16} style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] text-[#C4CBD6] truncate">{e.description}</div>
                  <div className="flex items-center gap-1 mt-[2px]">
                    <span className="text-[11.5px] text-[#5B6573]">{e.userName}</span>
                    <span className="text-[#3A3F4B]">·</span>
                    <span className="text-[11.5px] text-[#4B5462]">{timeAgo(e.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
