import { describe, expect, it } from "vitest";
import { computeStatus, daysToExpire } from "./status";

const dated = (validUntil: string) => ({ validityMode: "dated" as const, validUntil });
const TODAY = "2026-10-06";

describe("computeStatus", () => {
  it("dia do vencimento (0) é due_30", () => {
    expect(computeStatus(dated("2026-10-06"), TODAY)).toBe("due_30");
  });
  it("vencida há 1 dia", () => {
    expect(computeStatus(dated("2026-10-05"), TODAY)).toBe("expired");
  });
  it("30 dias é due_30 e 31 é due_60", () => {
    expect(computeStatus(dated("2026-11-05"), TODAY)).toBe("due_30");
    expect(computeStatus(dated("2026-11-06"), TODAY)).toBe("due_60");
  });
  it("60 dias é due_60 e 61 é valid", () => {
    expect(computeStatus(dated("2026-12-05"), TODAY)).toBe("due_60");
    expect(computeStatus(dated("2026-12-06"), TODAY)).toBe("valid");
  });
  it("sem data vira pending", () => {
    expect(computeStatus({ validityMode: "unknown", validUntil: null }, TODAY)).toBe("pending");
    expect(computeStatus({ validityMode: "dated", validUntil: null }, TODAY)).toBe("pending");
  });
  it("indefinite e exempt viram no_term", () => {
    expect(computeStatus({ validityMode: "indefinite", validUntil: null }, TODAY)).toBe("no_term");
    expect(computeStatus({ validityMode: "exempt", validUntil: null }, TODAY)).toBe("no_term");
  });
  it("virada de ano", () => {
    expect(computeStatus(dated("2027-01-02"), "2026-12-31")).toBe("due_30");
    expect(computeStatus(dated("2026-12-31"), "2027-01-01")).toBe("expired");
  });
  it("ano bissexto", () => {
    expect(daysToExpire("2028-03-01", "2028-02-28")).toBe(2);
    expect(daysToExpire("2027-03-01", "2027-02-28")).toBe(1);
  });
  it("respeita cortes configuráveis", () => {
    expect(computeStatus(dated("2026-10-26"), TODAY, { due_30: 15, due_60: 45 })).toBe("due_60");
  });
  it("casos da fixture de 06/10/2026", () => {
    expect(computeStatus(dated("2025-08-27"), TODAY)).toBe("expired");
    expect(computeStatus(dated("2026-10-13"), TODAY)).toBe("due_30");
    expect(computeStatus(dated("2026-11-25"), TODAY)).toBe("due_60");
  });
});
