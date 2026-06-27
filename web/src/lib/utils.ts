import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface MoneyDto {
  amount: number;
  currencyCode: string;
  decimalPlaces: number;
}

export interface CurrencyDto {
  code: string;
  symbol: string;
  decimalPlaces: number;
  isDefault: boolean;
}

export function formatCurrency(amount: number, currency = "USD", decimals?: number): string {
  const d = decimals ?? 2;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  }).format(amount);
}

export function formatMoney(money: MoneyDto): string {
  return formatCurrency(money.amount, money.currencyCode, money.decimalPlaces);
}

export function formatCompact(amount: number): string {
  if (Math.abs(amount) >= 1_000_000)
    return `$${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000)
    return `$${(amount / 1_000).toFixed(1)}k`;
  return `$${amount.toLocaleString()}`;
}
