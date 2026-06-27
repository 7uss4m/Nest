import { Icon } from "@/components/ui/Icon";
import { formatCurrency } from "@/lib/utils";

export interface StatCardsData {
  income: number;
  expense: number;
  saved: number;
  currency?: string;
}

interface StatCardProps {
  icon: string;
  iconColor: string;
  iconBg: string;
  label: string;
  amount: string;
  change: string;
  changeColor: string;
  gradient?: boolean;
}

function StatCard({ icon, iconColor, iconBg, label, amount, change, changeColor, gradient }: StatCardProps) {
  return (
    <div
      className="flex-1 flex flex-col justify-center p-[18px] rounded-[18px]"
      style={{
        background: gradient
          ? "linear-gradient(135deg,rgba(99,102,241,0.16),rgba(45,212,191,0.10))"
          : "#141925",
        border: gradient
          ? "1px solid rgba(99,102,241,0.22)"
          : "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center gap-[10px]">
        <div
          className="w-[34px] h-[34px] rounded-[10px] flex items-center justify-center flex-shrink-0"
          style={{ background: iconBg }}
        >
          <Icon name={icon} size={19} weight={400} style={{ color: iconColor }} />
        </div>
        <span className="text-[12.5px]" style={{ color: gradient ? "#C4CBD6" : "#98A2B3" }}>{label}</span>
      </div>
      <div className="flex items-baseline gap-2 mt-3">
        <span className="font-[700] text-[26px] tracking-[-0.02em] tabular" style={{ fontFamily: "'Inter Tight'" }}>
          {amount}
        </span>
        <span className="text-[12px] font-semibold" style={{ color: changeColor }}>{change}</span>
      </div>
    </div>
  );
}

export function StatCards({ income, expense, saved, currency = "USD" }: StatCardsData) {
  const savingsRate = income > 0 ? Math.round((saved / income) * 100) : 0;

  return (
    <div className="col-span-4 flex flex-col gap-[18px]">
      <StatCard
        icon="south_west"
        iconColor="#34D399"
        iconBg="rgba(52,211,153,0.14)"
        label="Income · this month"
        amount={formatCurrency(income, currency)}
        change="this month"
        changeColor="#5B6573"
      />
      <StatCard
        icon="north_east"
        iconColor="#FB7185"
        iconBg="rgba(251,113,133,0.14)"
        label="Expenses · this month"
        amount={formatCurrency(expense, currency)}
        change="this month"
        changeColor="#5B6573"
      />
      <StatCard
        icon="savings"
        iconColor="#818CF8"
        iconBg="rgba(99,102,241,0.2)"
        label="Saved · this month"
        amount={formatCurrency(saved, currency)}
        change={`${savingsRate}% rate`}
        changeColor="#818CF8"
        gradient
      />
    </div>
  );
}
