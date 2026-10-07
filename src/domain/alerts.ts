import { calendarDaysBetween } from "@/lib/dates";
import type { ValidityMode } from "./status";

export const DEFAULT_MILESTONES = [90, 60, 30, 15, 7, 3, 1, 0];
export const DEFAULT_EXPIRED_REPEAT_DAYS = 7;

export interface AlertLicense {
  id: string;
  validityMode: ValidityMode;
  validUntil: string | null;
}

export interface SentAlert {
  licenseId: string;
  kind: string;
  referenceDate: string;
}

export interface DueAlert {
  licenseId: string;
  kind: string;
  /** Data de referência usada na chave de idempotência (a data de hoje). */
  referenceDate: string;
  daysToExpire: number;
}

export interface AlertConfig {
  milestones: number[];
  expiredRepeatDays: number;
}

const DEFAULT_CONFIG: AlertConfig = {
  milestones: DEFAULT_MILESTONES,
  expiredRepeatDays: DEFAULT_EXPIRED_REPEAT_DAYS,
};

/**
 * Regra 5.6: avisos devidos hoje. Função pura; `alreadySent` garante idempotência
 * (chave: licença + tipo + data de referência). Licenças sem data não geram aviso por marco.
 */
export function alertsDue(
  licenses: AlertLicense[],
  today: string,
  alreadySent: SentAlert[] = [],
  config: AlertConfig = DEFAULT_CONFIG,
): DueAlert[] {
  const sent = new Set(alreadySent.map((s) => `${s.licenseId}|${s.kind}|${s.referenceDate}`));
  const due: DueAlert[] = [];

  for (const license of licenses) {
    if (license.validityMode !== "dated" || !license.validUntil) continue;
    const days = calendarDaysBetween(today, license.validUntil);

    let kind: string | null = null;
    if (days >= 0 && config.milestones.includes(days)) kind = `milestone_${days}`;
    else if (days < 0 && -days % config.expiredRepeatDays === 0) kind = "expired_repeat";
    if (!kind) continue;

    if (sent.has(`${license.id}|${kind}|${today}`)) continue;
    due.push({ licenseId: license.id, kind, referenceDate: today, daysToExpire: days });
  }
  return due;
}
