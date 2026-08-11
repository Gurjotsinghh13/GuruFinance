// ============================================================
// UTILITY FUNCTIONS
// ============================================================

import { format, formatDistanceToNow } from "date-fns";

// ============================================================
// ID GENERATORS
// ============================================================

let loanCounter = 0;

export function generateLoanNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `LN-${year}-${random}`;
}

export function generateReceiptNumber(): string {
  const date = format(new Date(), "yyyyMMdd");
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `RCT-${date}-${random}`;
}

import crypto from "crypto";

export function generateResetToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// ============================================================
// CURRENCY FORMATTER
// ============================================================

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatCurrencyCompact(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2)}Cr`;
  } else if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(2)}L`;
  } else if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return formatCurrency(amount);
}

// ============================================================
// DATE FORMATTERS
// ============================================================

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd MMM yyyy");
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, "dd MMM yyyy, hh:mm a");
}

export function formatDateInput(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

// ============================================================
// PHONE NUMBER FORMATTER
// ============================================================

export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  return phone;
}

// ============================================================
// WHATSAPP LINK GENERATOR
// ============================================================

export function createWhatsAppLink(phone: string, message: string): string {
  const cleaned = phone.replace(/\D/g, "");
  const number = cleaned.startsWith("91") ? cleaned : `91${cleaned}`;
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${number}?text=${encoded}`;
}

// ============================================================
// TEMPLATE VARIABLE SUBSTITUTION
// ============================================================

export function fillTemplate(
  template: string,
  variables: Record<string, string>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return variables[key] || match;
  });
}

// ============================================================
// PERCENTAGE FORMATTER
// ============================================================

export function formatPercent(value: number): string {
  return `${value}%`;
}

// ============================================================
// ORDINAL DAY (1st, 2nd, 3rd, etc.)
// ============================================================

export function ordinalDay(day: number): string {
  const suffix =
    day % 100 >= 11 && day % 100 <= 13
      ? "th"
      : day % 10 === 1
      ? "st"
      : day % 10 === 2
      ? "nd"
      : day % 10 === 3
      ? "rd"
      : "th";
  return `${day}${suffix}`;
}

// ============================================================
// SAFE NUMBER PARSING
// ============================================================

export function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return isNaN(n) ? fallback : n;
}

// ============================================================
// CLASS NAME UTILITY (cn)
// ============================================================

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}


export function serializeDecimal(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj.toISOString();
  if (
    typeof obj === "object" &&
    (
      obj.constructor?.name === "Decimal" ||
      (typeof obj.toNumber === "function" &&
        Array.isArray(obj.d) &&
        typeof obj.s === "number" &&
        typeof obj.e === "number")
    )
  ) {
    return obj.toNumber ? obj.toNumber() : Number(obj);
  }
  if (Array.isArray(obj)) return obj.map(serializeDecimal);
  if (typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, serializeDecimal(v)])
    );
  }
  return obj;
}
