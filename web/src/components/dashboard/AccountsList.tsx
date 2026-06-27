import { Icon } from "@/components/ui/Icon";
import { formatCurrency } from "@/lib/utils";

const ACCOUNT_TYPE_LABEL = ["Cash", "Bank", "Credit Card", "Savings", "Investment", "Other"];

export interface AccountData {
  id: string;
  name: string;
  type: number;
  currency: string;
  color: string;
  icon: string;
  balance: number;
}

export function AccountsList({ accounts }: { accounts: AccountData[] }) {
  return (
    <div
      className="col-span-5 p-5 rounded-[18px]"
      style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-[15px] font-bold">Accounts</span>
        <span className="flex items-center gap-[5px] text-[12.5px] text-[#818CF8] font-medium cursor-pointer">
          <Icon name="swap_horiz" size={16} weight={400} />
          Transfer
        </span>
      </div>

      {accounts.length === 0 ? (
        <div className="text-[13px] text-[#5B6573] text-center py-6">No accounts yet</div>
      ) : (
        <div className="flex flex-col gap-[6px]">
          {accounts.map((a) => {
            const typeLabel = ACCOUNT_TYPE_LABEL[a.type] ?? "Account";
            const isNegative = a.balance < 0;
            return (
              <div
                key={a.id}
                className="flex items-center gap-[13px] px-[10px] py-[9px] rounded-[12px] cursor-pointer transition-colors hover:bg-[#1A2030]"
              >
                <div
                  className="w-[38px] h-[38px] rounded-[11px] flex items-center justify-center flex-shrink-0"
                  style={{ background: `${a.color}22` }}
                >
                  <Icon name={a.icon} size={20} weight={400} style={{ color: a.color }} />
                </div>
                <div className="flex-1">
                  <div className="text-[13.5px] font-semibold">{a.name}</div>
                  <div className="text-[11.5px] text-[#5B6573]">{typeLabel} · {a.currency}</div>
                </div>
                <span
                  className="text-[14px] font-semibold tabular"
                  style={{ color: isNegative ? "#FB7185" : undefined }}
                >
                  {isNegative ? "−" : ""}{formatCurrency(Math.abs(a.balance), a.currency)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
