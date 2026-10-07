import { z } from "zod";
import { displayName, matchesFilter, type DocFilter, type LicenseItem } from "@/domain/license";
import { todayInBusinessTz } from "@/lib/dates";
import { fetchLicenseItems } from "@/server/licenses";

const one = (v: unknown) => (Array.isArray(v) ? v[0] : v);

const paramsSchema = z.object({
  empresa: z.preprocess(one, z.string().max(64).optional()),
  unidade: z.preprocess(one, z.string().max(80).optional()),
  tipo: z.preprocess(one, z.enum(["lf", "bombeiros"]).optional().catch(undefined)),
  f: z.preprocess(one, z.enum(["todos", "acao", "venc", "ok", "pend"]).optional().catch(undefined)),
  q: z.preprocess(one, z.string().max(100).optional()),
  doc: z.preprocess(one, z.string().max(64).optional()),
});

export type ViewParams = z.infer<typeof paramsSchema>;

export interface CompanyOption {
  id: string;
  name: string;
  units: string[];
}

export interface ViewContext {
  today: string;
  params: ViewParams;
  all: LicenseItem[];
  /** Licenças após o filtro de empresa e unidade do topo. */
  scoped: LicenseItem[];
  companies: CompanyOption[];
  openDoc: LicenseItem | null;
  docFilter: DocFilter;
}

export async function loadViewContext(rawParams: Record<string, unknown>): Promise<ViewContext> {
  const params = paramsSchema.parse(rawParams);
  const today = todayInBusinessTz();
  const all = await fetchLicenseItems(today);

  const byCompany = new Map<string, CompanyOption>();
  for (const item of all) {
    const entry = byCompany.get(item.companyId) ?? {
      id: item.companyId,
      name: item.companyName,
      units: [],
    };
    if (!entry.units.includes(item.unitLabel)) entry.units.push(item.unitLabel);
    byCompany.set(item.companyId, entry);
  }
  const companies = [...byCompany.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const scoped = all.filter(
    (i) =>
      (!params.empresa || i.companyId === params.empresa) &&
      (!params.unidade || i.unitLabel === params.unidade),
  );
  const openDoc = params.doc ? (all.find((i) => i.id === params.doc) ?? null) : null;
  return { today, params, all, scoped, companies, openDoc, docFilter: params.f ?? "todos" };
}

export function searchText(item: LicenseItem): string {
  return [displayName(item), item.number, item.issuingBody].filter(Boolean).join(" ").toLowerCase();
}

export function applyDocumentFilters(ctx: ViewContext): LicenseItem[] {
  const q = (ctx.params.q ?? "").trim().toLowerCase();
  return ctx.scoped
    .filter(
      (i) =>
        matchesFilter(i, ctx.docFilter) &&
        (!ctx.params.tipo || i.type === ctx.params.tipo) &&
        (!q || searchText(i).includes(q)),
    )
    .sort((a, b) => a.score - b.score);
}

/** Monta uma URL preservando os filtros atuais e trocando só o que for informado. */
export function hrefWith(
  path: string,
  params: ViewParams,
  changes: Partial<Record<keyof ViewParams, string | null>> = {},
): string {
  const merged: Record<string, string | undefined> = { ...params, ...undefinedToEmpty(changes) };
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v) qs.set(k, v);
  }
  const s = qs.toString();
  return s ? `${path}?${s}` : path;
}

function undefinedToEmpty(changes: Partial<Record<keyof ViewParams, string | null>>) {
  const out: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(changes)) out[k] = v ?? undefined;
  return out;
}
