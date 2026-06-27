import { formatCurrency } from "@/lib/utils";

export interface SpendingCategoryData {
  name: string;
  color: string;
  total: number;
}

function buildGradient(categories: SpendingCategoryData[], total: number) {
  if (total === 0 || categories.length === 0) return "conic-gradient(#1A2030 0% 100%)";
  let acc = 0;
  const stops = categories.map((c) => {
    const pct = (c.total / total) * 100;
    const from = acc;
    acc += pct;
    return `${c.color} ${from.toFixed(2)}% ${acc.toFixed(2)}%`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

export function SpendingDonut({ categories, total }: { categories: SpendingCategoryData[]; total: number }) {
  return (
    <div
      className="col-span-5 p-5 rounded-[18px]"
      style={{ background: "#141925", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <div className="text-[15px] font-bold mb-4">Spending by category</div>
      <div className="flex items-center gap-[22px]">
        {/* Donut */}
        <div className="relative w-[142px] h-[142px] flex-shrink-0">
          <div
            className="w-[142px] h-[142px] rounded-full"
            style={{ background: buildGradient(categories, total) }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full flex flex-col items-center justify-center"
            style={{ background: "#141925" }}
          >
            <span className="text-[10px] uppercase tracking-[0.08em] text-[#5B6573]">Spent</span>
            <span className="font-[700] text-[20px] tracking-[-0.02em] tabular" style={{ fontFamily: "'Inter Tight'" }}>
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 flex flex-col gap-[9px]">
          {categories.length === 0 ? (
            <div className="text-[13px] text-[#5B6573]">No spending data</div>
          ) : (
            categories.map((c) => {
              const pct = total > 0 ? Math.round((c.total / total) * 100) : 0;
              return (
                <div key={c.name} className="flex items-center gap-2">
                  <span className="w-[9px] h-[9px] rounded-[3px] flex-shrink-0" style={{ background: c.color }} />
                  <span className="text-[12.5px] text-[#C4CBD6] flex-1">{c.name}</span>
                  <span className="text-[12.5px] text-[#98A2B3] tabular">{pct}%</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
