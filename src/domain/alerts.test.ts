import { describe, expect, it } from "vitest";
import { alertsDue, DEFAULT_MILESTONES } from "./alerts";

const lic = (
  id: string,
  validUntil: string | null,
  validityMode: "dated" | "unknown" = "dated",
) => ({
  id,
  validityMode,
  validUntil,
});

describe("alertsDue", () => {
  it("dispara em cada marco", () => {
    for (const m of DEFAULT_MILESTONES) {
      const result = alertsDue([lic("a", addDays("2026-10-06", m))], "2026-10-06");
      expect(result.map((r) => r.kind)).toEqual([`milestone_${m}`]);
    }
  });
  it("não dispara fora dos marcos", () => {
    expect(alertsDue([lic("a", addDays("2026-10-06", 45))], "2026-10-06")).toEqual([]);
  });
  it("vencida repete a cada 7 dias", () => {
    expect(alertsDue([lic("a", "2026-09-29")], "2026-10-06")[0]?.kind).toBe("expired_repeat");
    expect(alertsDue([lic("a", "2026-09-30")], "2026-10-06")).toEqual([]);
    expect(alertsDue([lic("a", "2026-09-22")], "2026-10-06")[0]?.kind).toBe("expired_repeat");
  });
  it("é idempotente com alreadySent", () => {
    const sent = [{ licenseId: "a", kind: "milestone_30", referenceDate: "2026-10-06" }];
    expect(alertsDue([lic("a", "2026-11-05")], "2026-10-06", sent)).toEqual([]);
  });
  it("ignora licença sem data", () => {
    expect(alertsDue([lic("a", null, "unknown")], "2026-10-06")).toEqual([]);
  });
  it("funciona na virada de mês", () => {
    expect(alertsDue([lic("a", "2026-11-01")], "2026-10-31")[0]?.kind).toBe("milestone_1");
  });
});

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
