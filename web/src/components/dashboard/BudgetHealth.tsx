import { Icon } from "@/components/ui/Icon";
import { formatMoney, MoneyDto } from "@/lib/utils";

export interface BudgetItemData {
  id: string;
  name: string;
  icon: string;
  color: string;
  spent: number;
  limit: MoneyDto;
}

export function BudgetHealth({ budgets }: { budgets: BudgetItemData[] }) {
  return (
    <div
      className="col-span-7 p-5 rounded-[18px]"
      style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="flex items-center justify-between mb-[18px]">
        <span className="text-[15px] font-bold">Budget health</span>
        <span className="text-[12.5px] text-[#818CF8] font-medium cursor-pointer">Manage</span>
      </div>

      {budgets.length === 0 ? (
        <div className="text-[13px] text-[#5B6573] text-center py-6">No budgets set up yet</div>
      ) : (
        <div className="flex flex-col gap-[18px]">
          {budgets.map((b) => {
            const over = b.spent > b.limit.amount;
            return (
              <div key={b.id}>
                <div className="flex items-center gap-[11px] mb-[9px]">
                  <div
                    className="w-[30px] h-[30px] rounded-[9px] flex items-center justify-center flex-shrink-0"
                    style={{ background: `${b.color}22` }}
                  >
                    <Icon name={b.icon} size={17} weight={400} style={{ color: b.color }} />
                  </div>
                  <span className="text-[13.5px] font-medium flex-1">{b.name}</span>
                  <div className="flex items-center gap-[5px] text-[13px] text-[#98A2B3] tabular">
                    {over && (
                      <span
                        className="text-[10px] font-bold px-[6px] py-[2px] rounded-full"
                        style={{ color: "#FB7185", background: "rgba(251,113,133,0.14)" }}
                      >
                        OVER
                      </span>
                    )}
                    <span style={{ color: over ? "#FB7185" : "#EEF1F6", fontWeight: 600 }}>
                      {formatMoney({ ...b.limit, amount: b.spent })}
                    </span>
                    {" / "}{formatMoney(b.limit)}
                  </div>
                </div>
                <div className="h-[7px] rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min((b.spent / b.limit.amount) * 100, 100)}%`,
                      background: over ? "#FB7185" : b.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
