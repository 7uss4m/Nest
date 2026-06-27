import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// When api-types.generated.ts exists (after running scripts/generate-api-types.sh),
// replace these manual interfaces with:
//   import type { components } from "./api-types.generated";
//   export type MoneyDto    = components["schemas"]["MoneyDto"];
//   export type CurrencyDto = components["schemas"]["CurrencyDto"];

export interface MoneyDto {
  amount: number;
  currencyCode: string;
}

export interface CurrencyDto {
  code: string;
  symbol: string;
  decimalPlaces: number;
  isDefault: boolean;
}

export function formatCurrency(amount: number, currency = "USD", decimals?: number): string {
  const opts: Intl.NumberFormatOptions = { style: "currency", currency };
  if (decimals !== undefined) {
    opts.minimumFractionDigits = decimals;
    opts.maximumFractionDigits = decimals;
  }
  return new Intl.NumberFormat("en-US", opts).format(amount);
}

export function formatMoney(money: MoneyDto): string {
  return formatCurrency(money.amount, money.currencyCode);
}

export function formatCompact(amount: number): string {
  if (Math.abs(amount) >= 1_000_000)
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000)
    return `$${(amount / 1_000).toFixed(1)}k`;
  return `$${amount.toLocaleString()}`;
}
