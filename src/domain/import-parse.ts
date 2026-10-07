import type { ValidityMode } from "./status";

export type LicenseType = "lf" | "bombeiros" | "outro";
export type LicenseFlag = "pending" | "urgent" | "reissue";

/** Nomes de exibição (seção 5.7), indexados pelo início do nome normalizado na planilha. */
const COMPANY_DISPLAY: [prefix: string, display: string][] = [
  ["GNPTEC", "GNPTEC Inteligência em Sistemas"],
  ["INP", "INP – Instituto Negócios Públicos do Brasil"],
  ["CONTABGOV", "ContabGov – Capacitação em Contabilidade para Governo"],
  ["INFOCO", "INFOCO-RH"],
  ["SIX", "SIX Ocupacional"],
  ["GOVTECH", "GovTech Tecnologia em Desenvolvimento"],
  ["BE INTELLIGENCE", "BE Intelligence Consultoria"],
  ["COCCINELLE", "Coccinelle Blanche"],
  ["S2V", "S2V Soluções em Vistoria Veicular"],
  ["NP PARTNERS", "NP Partners"],
  ["GELIC", "Gelic Tecnologia"],
  ["VANLINK", "Vanlink"],
];

export interface RawRow {
  company: unknown;
  cnpj: unknown;
  municipality: unknown;
  type: unknown;
  issuingBody: unknown;
  number: unknown;
  issuedOn: unknown;
  validUntil: unknown;
  status: unknown;
  owner: unknown;
  link: unknown;
  notes: unknown;
}

export interface ParsedLicense {
  companyName: string;
  unitLabel: string;
  unitCnpj: string | null;
  cnpjRoot: string | null;
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
  link: string | null;
}

export function text(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const s = String(value).replace(/\s+/g, " ").trim();
  return s === "" ? null : s;
}

function normalize(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/\s+/g, " ").trim();
}

/** Número serial do Excel (ou Date) para data ISO, sem depender de fuso. */
export function excelDateToIso(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") {
    const ms = Math.round((value - 25569) * 86_400_000);
    return new Date(ms).toISOString().slice(0, 10);
  }
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  return br ? `${br[3]}-${br[2]}-${br[1]}` : null;
}

/** Separa o nome de exibição da empresa e o rótulo da unidade (matriz/filial). */
export function parseCompany(raw: unknown): { companyName: string; unitLabel: string } | null {
  const full = text(raw);
  if (!full) return null;
  const suffix = /\(([^)]*)\)\s*$/.exec(full);
  const base = normalize(suffix ? full.slice(0, suffix.index) : full);
  const match = COMPANY_DISPLAY.find(([prefix]) => base.startsWith(prefix));
  if (!match) return null;
  let unitLabel = "matriz única";
  if (suffix) {
    const label = text(suffix[1]);
    unitLabel = !label ? "matriz única" : /^matriz$/i.test(label) ? "matriz" : label;
  }
  return { companyName: match[1], unitLabel };
}

const FLAGS: [prefix: string, flag: LicenseFlag][] = [
  ["PENDENTE:", "pending"],
  ["URGENTE:", "urgent"],
  ["REEMITIR:", "reissue"],
];

/** Regra 5.5: prefixo vira `flag` e sai do texto. */
export function parseNotes(raw: unknown): { notes: string | null; flag: LicenseFlag | null } {
  const notes = text(raw);
  if (!notes) return { notes: null, flag: null };
  for (const [prefix, flag] of FLAGS) {
    if (notes.toUpperCase().startsWith(prefix))
      return { notes: text(notes.slice(prefix.length)), flag };
  }
  return { notes, flag: null };
}

const AUTO_STATUS = ["vigente", "vence em ate", "vencido", "sem validade informada"];

/** Coluna J: rótulos automáticos são ignorados; texto manual define modo ou situação documental. */
export function parseManualStatus(raw: unknown): {
  mode: ValidityMode | null;
  documentaryStatus: string | null;
} {
  const s = text(raw);
  if (!s) return { mode: null, documentaryStatus: null };
  const n = normalize(s).toLowerCase();
  if (AUTO_STATUS.some((a) => n.startsWith(a))) return { mode: null, documentaryStatus: null };
  if (n.startsWith("valido por prazo indeterminado"))
    return { mode: "indefinite", documentaryStatus: null };
  if (n.startsWith("dispensado")) return { mode: "exempt", documentaryStatus: null };
  if (n.startsWith("aguardando") || n.startsWith("verificando"))
    return { mode: null, documentaryStatus: s };
  return { mode: null, documentaryStatus: s };
}

export function parseRow(row: RawRow): ParsedLicense | null {
  const company = parseCompany(row.company);
  if (!company) return null;
  const cnpj = text(row.cnpj);
  const validUntil = excelDateToIso(row.validUntil);
  const manual = parseManualStatus(row.status);
  const { notes, flag } = parseNotes(row.notes);
  const typeText = text(row.type) ?? "";
  const link = text(row.link);
  return {
    ...company,
    unitCnpj: cnpj,
    cnpjRoot: cnpj ? cnpj.split("/")[0] : null,
    municipality: text(row.municipality),
    type: normalize(typeText).includes("BOMBEIROS") ? "bombeiros" : "lf",
    issuingBody: text(row.issuingBody),
    number: text(row.number),
    issuedOn: excelDateToIso(row.issuedOn),
    validUntil,
    validityMode: validUntil ? "dated" : (manual.mode ?? "unknown"),
    documentaryStatus: manual.documentaryStatus,
    ownerName: text(row.owner),
    notes,
    flag,
    link: link && link.toLowerCase() !== "abrir no drive" ? link : null,
  };
}

export interface Inconsistency {
  row: number;
  company: string;
  message: string;
}

/** Dados importados como estão, mas listados para o dono corrigir (não adivinhamos). */
export function findInconsistencies(
  rows: { row: number; license: ParsedLicense }[],
): Inconsistency[] {
  const out: Inconsistency[] = [];
  for (const { row, license } of rows) {
    const where = `${license.companyName} (${license.unitLabel})`;
    if (
      license.type === "bombeiros" &&
      normalize(license.issuingBody ?? "").startsWith("PREFEITURA")
    ) {
      out.push({ row, company: where, message: 'Bombeiros com órgão "Prefeitura Municipal".' });
    }
    if (
      license.validityMode === "dated" &&
      license.issuedOn &&
      license.validUntil &&
      license.issuedOn > license.validUntil
    ) {
      out.push({ row, company: where, message: "Emissão posterior à validade." });
    }
  }
  return out;
}
