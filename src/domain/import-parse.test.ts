import { describe, expect, it } from "vitest";
import {
  excelDateToIso,
  findInconsistencies,
  parseCompany,
  parseManualStatus,
  parseNotes,
  parseRow,
} from "./import-parse";

describe("parseCompany", () => {
  it("extrai nome de exibição e unidade", () => {
    expect(parseCompany("INP - INSTITUTO NEGÓCIOS PÚBLICOS DO BRASIL LTDA (filial Foz)")).toEqual({
      companyName: "INP – Instituto Negócios Públicos do Brasil",
      unitLabel: "filial Foz",
    });
    expect(parseCompany("INFOCO-RH LTDA (matriz)")?.unitLabel).toBe("matriz");
  });
  it("sem sufixo é matriz única e remove espaços sobrando", () => {
    expect(parseCompany("VANLINK ")).toEqual({ companyName: "Vanlink", unitLabel: "matriz única" });
  });
  it("empresa desconhecida retorna null", () => {
    expect(parseCompany("OUTRA LTDA")).toBeNull();
  });
});

describe("parseNotes", () => {
  it("remove prefixo e define flag", () => {
    expect(parseNotes("PENDENTE: falta alteração")).toEqual({
      notes: "falta alteração",
      flag: "pending",
    });
    expect(parseNotes("URGENTE: vence em 13/10").flag).toBe("urgent");
    expect(parseNotes("REEMITIR: nome errado").flag).toBe("reissue");
  });
  it("texto comum não vira flag", () => {
    expect(parseNotes("CBMPR 6BBM")).toEqual({ notes: "CBMPR 6BBM", flag: null });
  });
});

describe("parseManualStatus", () => {
  it("ignora rótulos automáticos", () => {
    expect(parseManualStatus("Vigente").mode).toBeNull();
    expect(parseManualStatus("Vence em até 30 dias").documentaryStatus).toBeNull();
    expect(parseManualStatus("Vencido").documentaryStatus).toBeNull();
    expect(parseManualStatus("Sem validade informada").documentaryStatus).toBeNull();
  });
  it("classifica texto manual", () => {
    expect(parseManualStatus("Válido por prazo indeterminado (até nova modificação)").mode).toBe(
      "indefinite",
    );
    expect(parseManualStatus("Dispensado - Baixo Risco").mode).toBe("exempt");
    expect(parseManualStatus("Aguardando alteração contratual").documentaryStatus).toBe(
      "Aguardando alteração contratual",
    );
    expect(parseManualStatus("Verificando").documentaryStatus).toBe("Verificando");
  });
});

describe("excelDateToIso", () => {
  it("converte serial do Excel", () => {
    expect(excelDateToIso(46300)).toBe("2026-10-05");
  });
  it("aceita ISO e dd/mm/aaaa, e vazio", () => {
    expect(excelDateToIso("2027-10-05")).toBe("2027-10-05");
    expect(excelDateToIso("13/10/2026")).toBe("2026-10-13");
    expect(excelDateToIso(null)).toBeNull();
  });
});

const base = {
  company: "NP PARTNERS LTDA (matriz)",
  cnpj: "60.250.413/0001-56",
  municipality: "Curitiba/PR",
  type: "Alvará de Bombeiros / CLCB / AVCB",
  issuingBody: "Prefeitura Municipal",
  number: null,
  issuedOn: null,
  validUntil: null,
  status: "Válido por prazo indeterminado",
  owner: "Nathália",
  link: "Abrir no Drive",
  notes: null,
};

describe("parseRow", () => {
  it("monta a licença e deriva validity_mode", () => {
    const l = parseRow(base)!;
    expect(l.type).toBe("bombeiros");
    expect(l.validityMode).toBe("indefinite");
    expect(l.cnpjRoot).toBe("60.250.413");
    expect(l.link).toBeNull();
  });
  it("data de validade força dated", () => {
    expect(parseRow({ ...base, validUntil: 46300 })!.validityMode).toBe("dated");
  });
  it("sem data nem classificação fica unknown", () => {
    expect(parseRow({ ...base, status: "Sem validade informada" })!.validityMode).toBe("unknown");
  });
});

describe("findInconsistencies", () => {
  it("lista Bombeiros com órgão Prefeitura", () => {
    const license = parseRow(base)!;
    const found = findInconsistencies([{ row: 33, license }]);
    expect(found).toHaveLength(1);
    expect(found[0].row).toBe(33);
  });
});
