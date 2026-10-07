import { computeStatus, daysToExpire, type LicenseStatus, type ValidityMode } from "./status";
import type { LicenseFlag, LicenseType } from "./import-parse";

export interface LicenseRecord {
  id: string;
  companyId: string;
  companyName: string;
  unitLabel: string;
  unitCnpj: string | null;
  municipality: string | null;
  type: LicenseType;
  issuingBody: string | null;
  number: string | null;
  issuedOn: string | null;
  validUntil: string | null;
  validityMode: ValidityMode;
  documentaryStatus: string | null;
  ownerName: string | null;
  notes: string | null;
  flag: LicenseFlag | null;
}

export interface LicenseItem extends LicenseRecord {
  status: LicenseStatus;
  /** Dias até o vencimento (negativo = vencida); null sem data. */
  days: number | null;
  /** Ordem de urgência: menor = mais urgente. */
  score: number;
  /** Exige ação da equipe (vencida, vencendo em 60 dias ou pendente). */
  needsAction: boolean;
}

export const TYPE_LABEL: Record<LicenseType, string> = {
  lf: "Alvará de localização e funcionamento",
  bombeiros: "Alvará de Bombeiros (CLCB/AVCB)",
  outro: "Outra licença",
};

export const TYPE_SHORT: Record<LicenseType, string> = {
  lf: "Alvará de funcionamento",
  bombeiros: "Alvará de Bombeiros",
  outro: "Outra licença",
};

export function toItem(record: LicenseRecord, today: string): LicenseItem {
  const status = computeStatus(
    { validityMode: record.validityMode, validUntil: record.validUntil },
    today,
  );
  const days = daysToExpire(record.validUntil, today);
  const score = days !== null ? days : status === "pending" ? 400 : 5000;
  return {
    ...record,
    status,
    days,
    score,
    needsAction:
      status === "expired" || status === "due_30" || status === "due_60" || status === "pending",
  };
}

/** Nome para exibição: empresa + unidade (sem rótulo para matriz única). */
export function displayName(item: Pick<LicenseRecord, "companyName" | "unitLabel">): string {
  return item.unitLabel === "matriz única"
    ? item.companyName
    : `${item.companyName} (${item.unitLabel})`;
}

export const BADGE_CLASS: Record<LicenseStatus, string> = {
  expired: "venc",
  due_30: "d30",
  due_60: "d60",
  valid: "ok",
  no_term: "neutro",
  pending: "pend",
};

export function statusLabel(item: LicenseItem): string {
  const { status, days, documentaryStatus, validityMode } = item;
  if (status === "expired") return "Vencido";
  if (status === "due_30" || status === "due_60") return `Vence em ${days} d`;
  if (status === "valid") return "Em dia";
  if (status === "no_term") return validityMode === "exempt" ? "Dispensado" : "Prazo indeterminado";
  const doc = (documentaryStatus ?? "").toLowerCase();
  if (doc.startsWith("aguardando avcb")) return "Aguardando AVCB";
  if (doc.startsWith("aguardando")) return "Aguardando alteração";
  if (doc.startsWith("verificando")) return "Verificando";
  return "Sem data";
}

export function formatDate(iso: string | null): string {
  return iso ? iso.split("-").reverse().join("/") : "—";
}

export function plural(n: number, singular: string, pluralForm: string): string {
  return `${n} ${n === 1 ? singular : pluralForm}`;
}

/** Corte de texto em limite de palavra, com reticências. */
export function cut(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

export type DocFilter = "todos" | "acao" | "venc" | "ok" | "pend";

export function matchesFilter(item: LicenseItem, filter: DocFilter): boolean {
  if (filter === "todos") return true;
  if (filter === "acao") return item.needsAction;
  if (filter === "venc") return item.status === "expired";
  if (filter === "ok") return item.status === "valid";
  return item.status === "pending";
}

export interface RenewalBucket {
  title: string;
  tone: "bad" | "warn" | "ok";
  items: LicenseItem[];
}

/** Agrupamento por prazo da tela Renovações (F1-10). */
export function renewalBuckets(items: LicenseItem[]): RenewalBucket[] {
  const dated = items
    .filter((i) => i.days !== null)
    .sort((a, b) => (a.days as number) - (b.days as number));
  const within = (min: number, max: number) =>
    dated.filter((i) => (i.days as number) >= min && (i.days as number) <= max);
  return [
    { title: "Vencidos", tone: "bad", items: dated.filter((i) => (i.days as number) < 0) },
    { title: "Até 30 dias", tone: "warn", items: within(0, 30) },
    { title: "31 a 60 dias", tone: "warn", items: within(31, 60) },
    { title: "61 a 90 dias", tone: "ok", items: within(61, 90) },
    { title: "91 a 180 dias", tone: "ok", items: within(91, 180) },
    { title: "181 a 365 dias", tone: "ok", items: within(181, 365) },
    { title: "Mais de 1 ano", tone: "ok", items: within(366, Number.MAX_SAFE_INTEGER) },
  ];
}

export interface DashboardSummary {
  valid: number;
  expired: number;
  due30: number;
  due60: number;
  pending: number;
  noTerm: number;
  total: number;
}

export function summarize(items: LicenseItem[]): DashboardSummary {
  const count = (s: LicenseStatus) => items.filter((i) => i.status === s).length;
  return {
    valid: count("valid"),
    expired: count("expired"),
    due30: count("due_30"),
    due60: count("due_60"),
    pending: count("pending"),
    noTerm: count("no_term"),
    total: items.length,
  };
}
