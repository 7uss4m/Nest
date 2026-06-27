import { Icon } from "@/components/ui/Icon";
import { formatMoney, MoneyDto } from "@/lib/utils";

export interface PaymentData {
  id: string;
  name: string;
  amount: MoneyDto;
  dueDate: string;
  icon: string;
}

function formatDue(dueDate: string): { text: string; color: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate + "T00:00:00");
  const days = Math.round((due.getTime() - today.getTime()) / 86400000);

  if (days < 0) {
    const n = -days;
    return { text: `Overdue by ${n} day${n !== 1 ? "s" : ""}`, color: "#FB7185" };
  }
  if (days === 0) {
    return { text: "Due today", color: "#FBBF24" };
  }
  const formatted = due.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return { text: `Due in ${days} day${days !== 1 ? "s" : ""} · ${formatted}`, color: "#5B6573" };
}

export function UpcomingPayments({ payments }: { payments: PaymentData[] }) {
  return (
    <div
      className="col-span-7 p-5 rounded-[18px]"
      style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-[15px] font-bold">Upcoming payments</span>
        <span className="text-[12.5px] text-[#818CF8] font-medium cursor-pointer">View all</span>
      </div>

      {payments.length === 0 ? (
        <div className="text-[13px] text-[#5B6573] text-center py-6">No upcoming payments</div>
      ) : (
        <div className="flex flex-col gap-[6px]">
          {payments.map((p) => {
            const { text: dueText, color: dueColor } = formatDue(p.dueDate);
            return (
              <div
                key={p.id}
                className="flex items-center gap-[13px] px-[10px] py-[9px] rounded-[12px] cursor-pointer transition-colors hover:bg-[#1A2030]"
              >
                <div
                  className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(99,102,241,0.14)" }}
                >
                  <Icon name={p.icon || "event_repeat"} size={20} weight={400} style={{ color: "#818CF8" }} />
                </div>
                <div className="flex-1">
                  <div className="text-[13.5px] font-semibold">{p.name}</div>
                  <div className="text-[11.5px]" style={{ color: dueColor }}>{dueText}</div>
                </div>
                <span className="text-[14px] font-semibold tabular">
                  {formatMoney(p.amount)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
