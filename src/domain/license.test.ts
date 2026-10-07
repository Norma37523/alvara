import { describe, expect, it } from "vitest";
import {
  cut,
  displayName,
  matchesFilter,
  renewalBuckets,
  statusLabel,
  summarize,
  toItem,
  type LicenseRecord,
} from "./license";

const TODAY = "2026-10-06";

const base: LicenseRecord = {
  id: "1",
  companyId: "c1",
  companyName: "INFOCO-RH",
  unitLabel: "matriz",
  unitCnpj: null,
  municipality: null,
  type: "lf",
  issuingBody: null,
  number: null,
  issuedOn: null,
  validUntil: null,
  validityMode: "unknown",
  documentaryStatus: null,
  ownerName: null,
  notes: null,
  flag: null,
};

const dated = (validUntil: string) => toItem({ ...base, validityMode: "dated", validUntil }, TODAY);

describe("toItem", () => {
  it("calcula dias, status e urgência", () => {
    const item = dated("2026-10-13");
    expect(item.days).toBe(7);
    expect(item.status).toBe("due_30");
    expect(item.needsAction).toBe(true);
  });
  it("sem data: pendente é mais urgente que sem prazo", () => {
    const pending = toItem(base, TODAY);
    const noTerm = toItem({ ...base, validityMode: "indefinite" }, TODAY);
    expect(pending.score).toBeLessThan(noTerm.score);
    expect(noTerm.needsAction).toBe(false);
  });
});

describe("statusLabel", () => {
  it("cobre cada situação", () => {
    expect(statusLabel(dated("2025-08-27"))).toBe("Vencido");
    expect(statusLabel(dated("2026-10-13"))).toBe("Vence em 7 d");
    expect(statusLabel(dated("2027-10-05"))).toBe("Em dia");
    expect(statusLabel(toItem({ ...base, validityMode: "exempt" }, TODAY))).toBe("Dispensado");
    expect(statusLabel(toItem({ ...base, validityMode: "indefinite" }, TODAY))).toBe(
      "Prazo indeterminado",
    );
    expect(
      statusLabel(toItem({ ...base, documentaryStatus: "Aguardando AVCB dos Bombeiros" }, TODAY)),
    ).toBe("Aguardando AVCB");
    expect(statusLabel(toItem({ ...base, documentaryStatus: "Verificando" }, TODAY))).toBe(
      "Verificando",
    );
    expect(statusLabel(toItem(base, TODAY))).toBe("Sem data");
  });
});

describe("displayName e cut", () => {
  it("omite rótulo da matriz única", () => {
    expect(displayName({ companyName: "Vanlink", unitLabel: "matriz única" })).toBe("Vanlink");
    expect(displayName(base)).toBe("INFOCO-RH (matriz)");
  });
  it("corta em limite de palavra", () => {
    expect(cut("um dois três quatro", 10)).toBe("um dois…");
    expect(cut("curto", 10)).toBe("curto");
  });
});

describe("filtros, resumo e renovações", () => {
  const items = [
    dated("2025-08-27"),
    dated("2026-10-13"),
    dated("2026-11-25"),
    dated("2027-10-05"),
    toItem(base, TODAY),
    toItem({ ...base, validityMode: "indefinite" }, TODAY),
  ];
  it("filtra", () => {
    expect(items.filter((i) => matchesFilter(i, "acao"))).toHaveLength(4);
    expect(items.filter((i) => matchesFilter(i, "venc"))).toHaveLength(1);
    expect(items.filter((i) => matchesFilter(i, "ok"))).toHaveLength(1);
    expect(items.filter((i) => matchesFilter(i, "pend"))).toHaveLength(1);
  });
  it("resume", () => {
    expect(summarize(items)).toEqual({
      valid: 1,
      expired: 1,
      due30: 1,
      due60: 1,
      pending: 1,
      noTerm: 1,
      total: 6,
    });
  });
  it("agrupa por prazo", () => {
    const buckets = renewalBuckets(items);
    expect(buckets.map((b) => b.items.length)).toEqual([1, 1, 1, 0, 0, 1, 0]);
  });
});
