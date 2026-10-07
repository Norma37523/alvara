/**
 * Importa reference/Controle_de_Alvaras_e_Licencas.xlsx (seção 7 do escopo). Idempotente.
 *
 *   pnpm import:xlsx --dry-run   confere a fixture sem tocar no banco
 *   pnpm import:xlsx             grava no Supabase (lê .env.local)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import { computeStatus } from "../src/domain/status";
import {
  findInconsistencies,
  parseRow,
  type ParsedLicense,
  type RawRow,
} from "../src/domain/import-parse";

const FILE = path.resolve("reference/Controle_de_Alvaras_e_Licencas.xlsx");
const SHEET = "Controle de Licenças";
const FIRST_ROW = 5;
const LAST_ROW = 37;
const REFERENCE_DATE = "2026-10-06"; // data da fixture do escopo

function readRows(): { row: number; license: ParsedLicense }[] {
  const ws = XLSX.readFile(FILE).Sheets[SHEET];
  if (!ws) throw new Error(`Aba "${SHEET}" não encontrada.`);
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null });
  const out: { row: number; license: ParsedLicense }[] = [];
  for (let r = FIRST_ROW; r <= LAST_ROW; r++) {
    const c = matrix[r - 1] ?? [];
    const raw: RawRow = {
      company: c[0],
      cnpj: c[1],
      municipality: c[2],
      type: c[3],
      issuingBody: c[4],
      number: c[5],
      issuedOn: c[6],
      validUntil: c[7],
      status: c[9],
      owner: c[10],
      link: c[11],
      notes: c[12],
    };
    const license = parseRow(raw);
    if (!license) throw new Error(`Linha ${r}: empresa não reconhecida.`);
    out.push({ row: r, license });
  }
  return out;
}

function summary(rows: { license: ParsedLicense }[]) {
  const counts: Record<string, number> = {};
  for (const { license } of rows) {
    const s = computeStatus(
      { validityMode: license.validityMode, validUntil: license.validUntil },
      REFERENCE_DATE,
    );
    counts[s] = (counts[s] ?? 0) + 1;
  }
  return {
    licenses: rows.length,
    companies: new Set(rows.map((r) => r.license.companyName)).size,
    withoutDate: rows.filter((r) => !r.license.validUntil).length,
    byStatus: counts,
  };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const rows = readRows();
  const inconsistencies = findInconsistencies(rows);
  const sum = summary(rows);
  console.log(`Fixture em ${REFERENCE_DATE}:`, JSON.stringify(sum));

  const stats = { companies: 0, units: 0, licenses: 0, skipped: 0 };

  if (!dryRun) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Configure o .env.local (use --env-file=.env.local).");
    const db = createClient(url, key, { auth: { persistSession: false } });

    const companyIds = new Map<string, string>();
    const unitIds = new Map<string, string>();

    for (const { license: l } of rows) {
      let companyId = companyIds.get(l.companyName);
      if (!companyId) {
        const found = await db
          .from("companies")
          .select("id")
          .eq("name", l.companyName)
          .maybeSingle();
        if (found.error) throw found.error;
        if (found.data) companyId = found.data.id as string;
        else {
          const ins = await db
            .from("companies")
            .insert({ name: l.companyName, cnpj_root: l.cnpjRoot })
            .select("id")
            .single();
          if (ins.error) throw ins.error;
          companyId = ins.data.id as string;
          stats.companies++;
        }
        companyIds.set(l.companyName, companyId);
      }

      const unitKey = `${companyId}|${l.unitLabel}`;
      let unitId = unitIds.get(unitKey);
      if (!unitId) {
        const found = await db
          .from("units")
          .select("id")
          .eq("company_id", companyId)
          .eq("label", l.unitLabel)
          .maybeSingle();
        if (found.error) throw found.error;
        if (found.data) unitId = found.data.id as string;
        else {
          const ins = await db
            .from("units")
            .insert({
              company_id: companyId,
              label: l.unitLabel,
              cnpj: l.unitCnpj,
              municipality: l.municipality,
            })
            .select("id")
            .single();
          if (ins.error) throw ins.error;
          unitId = ins.data.id as string;
          stats.units++;
        }
        unitIds.set(unitKey, unitId);
      }

      // Chave de idempotência: empresa + unidade + tipo. Licença existente não é sobrescrita.
      const exists = await db
        .from("licenses")
        .select("id")
        .eq("unit_id", unitId)
        .eq("type", l.type)
        .maybeSingle();
      if (exists.error) throw exists.error;
      if (exists.data) {
        stats.skipped++;
        continue;
      }
      const ins = await db.from("licenses").insert({
        unit_id: unitId,
        type: l.type,
        issuing_body: l.issuingBody,
        number: l.number,
        issued_on: l.issuedOn,
        valid_until: l.validUntil,
        validity_mode: l.validityMode,
        documentary_status: l.documentaryStatus,
        owner_name: l.ownerName,
        notes: l.notes,
        flag: l.flag,
      });
      if (ins.error) throw ins.error;
      stats.licenses++;
    }
    console.log("Gravado:", JSON.stringify(stats));
  }

  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  mkdirSync("reports", { recursive: true });
  const report = [
    `# Importação ${stamp}${dryRun ? " (simulação)" : ""}`,
    "",
    `- Licenças lidas: ${sum.licenses} em ${sum.companies} empresas`,
    `- Sem data de validade: ${sum.withoutDate}`,
    `- Situação em ${REFERENCE_DATE}: ${JSON.stringify(sum.byStatus)}`,
    ...(dryRun ? [] : [`- Gravado: ${JSON.stringify(stats)}`]),
    "",
    "## Inconsistências para o dono corrigir",
    "",
    ...(inconsistencies.length
      ? inconsistencies.map((i) => `- Linha ${i.row} — ${i.company}: ${i.message}`)
      : ["Nenhuma."]),
    "",
  ].join("\n");
  writeFileSync(path.join("reports", `import-${stamp}.md`), report);
  console.log(`Relatório: reports/import-${stamp}.md (${inconsistencies.length} inconsistências)`);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
