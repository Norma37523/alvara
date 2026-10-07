import { cache } from "react";
import { z } from "zod";
import { toItem, type LicenseItem, type LicenseRecord } from "@/domain/license";
import { todayInBusinessTz } from "@/lib/dates";
import { createAdminClient } from "@/server/supabase";

const rowSchema = z.object({
  id: z.string(),
  company_id: z.string(),
  company_name: z.string(),
  unit_label: z.string(),
  unit_cnpj: z.string().nullable(),
  municipality: z.string().nullable(),
  type: z.enum(["lf", "bombeiros", "outro"]),
  issuing_body: z.string().nullable(),
  number: z.string().nullable(),
  issued_on: z.string().nullable(),
  valid_until: z.string().nullable(),
  validity_mode: z.enum(["dated", "indefinite", "exempt", "unknown"]),
  documentary_status: z.string().nullable(),
  owner_name: z.string().nullable(),
  notes: z.string().nullable(),
  flag: z.enum(["pending", "urgent", "reissue"]).nullable(),
});

function toRecord(row: z.infer<typeof rowSchema>): LicenseRecord {
  return {
    id: row.id,
    companyId: row.company_id,
    companyName: row.company_name,
    unitLabel: row.unit_label,
    unitCnpj: row.unit_cnpj,
    municipality: row.municipality,
    type: row.type,
    issuingBody: row.issuing_body,
    number: row.number,
    issuedOn: row.issued_on,
    validUntil: row.valid_until,
    validityMode: row.validity_mode,
    documentaryStatus: row.documentary_status,
    ownerName: row.owner_name,
    notes: row.notes,
    flag: row.flag,
  };
}

/**
 * Todas as licenças com status calculado pelo domínio. Só chamar depois de `requireStaff()`:
 * usa a service role, que ignora RLS.
 */
export const fetchLicenseItems = cache(
  async (today: string = todayInBusinessTz()): Promise<LicenseItem[]> => {
    const admin = createAdminClient();
    if (!admin) throw new Error("Servidor sem credenciais do Supabase.");
    const { data, error } = await admin.from("licenses_with_status").select("*");
    if (error) throw new Error("Falha ao consultar as licenças.");
    return z
      .array(rowSchema)
      .parse(data)
      .map((row) => toItem(toRecord(row), today));
  },
);
