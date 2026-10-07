import { calendarDaysBetween } from "@/lib/dates";

export type ValidityMode = "dated" | "indefinite" | "exempt" | "unknown";
export type LicenseStatus = "expired" | "due_30" | "due_60" | "valid" | "no_term" | "pending";

export interface Thresholds {
  due_30: number;
  due_60: number;
}

export const DEFAULT_THRESHOLDS: Thresholds = { due_30: 30, due_60: 60 };

export interface LicenseValidity {
  validityMode: ValidityMode;
  /** Data ISO (YYYY-MM-DD) ou null. */
  validUntil: string | null;
}

/** Dias até o vencimento (negativo = vencida). Null se não há data. */
export function daysToExpire(validUntil: string | null, today: string): number | null {
  return validUntil ? calendarDaysBetween(today, validUntil) : null;
}

/** Regra 5.3 do escopo. `today` é injetado (YYYY-MM-DD, fuso America/Sao_Paulo). */
export function computeStatus(
  license: LicenseValidity,
  today: string,
  thresholds: Thresholds = DEFAULT_THRESHOLDS,
): LicenseStatus {
  if (license.validityMode === "indefinite" || license.validityMode === "exempt") return "no_term";
  if (license.validityMode === "unknown" || !license.validUntil) return "pending";
  const days = calendarDaysBetween(today, license.validUntil);
  if (days < 0) return "expired";
  if (days <= thresholds.due_30) return "due_30";
  if (days <= thresholds.due_60) return "due_60";
  return "valid";
}
