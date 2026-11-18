import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CURRENCY_LOCALE: Record<string, string> = { INR: "en-IN" };

/** Price in the instrument's own currency (₹ for NSE/BSE, $ for US). */
export function formatPrice(value: number | null | undefined, currency = "USD") {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(CURRENCY_LOCALE[currency] ?? "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: value >= 1000 ? 2 : value >= 1 ? 2 : 4,
  }).format(value);
}

/** Plain number, e.g. index levels that have no currency. */
export function formatNumber(value: number | null | undefined, digits = 2, currency?: string) {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatPercent(value: number | null | undefined, digits = 2, signed = true) {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = signed && value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}%`;
}

export function formatChange(value: number | null | undefined, digits = 2) {
  if (value == null || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(digits)}`;
}

/**
 * Large values: Indian convention (lakh crore / crore) for INR,
 * international (T / B / M) for everything else.
 */
export function formatCompact(value: number | null | undefined, currency = "USD") {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (currency === "INR") {
    const symbol = "₹";
    if (abs >= 1e12) return `${symbol}${(value / 1e12).toFixed(2)}L Cr`;
    if (abs >= 1e7) return `${symbol}${(value / 1e7).toFixed(2)} Cr`;
    if (abs >= 1e5) return `${symbol}${(value / 1e5).toFixed(2)} L`;
    return formatPrice(value, currency);
  }
  const symbol = currency === "USD" ? "$" : "";
  if (abs >= 1e12) return `${symbol}${(value / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `${symbol}${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${symbol}${(value / 1e6).toFixed(2)}M`;
  return `${symbol}${formatNumber(value, 0)}`;
}

export function formatVolume(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(value);
}

export function trendClass(value: number | null | undefined) {
  if (value == null || value === 0) return "text-muted-foreground";
  return value > 0 ? "text-up" : "text-down";
}
