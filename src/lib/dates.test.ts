import { describe, expect, it } from "vitest";
import { calendarDaysBetween, todayInBusinessTz } from "./dates";

describe("calendarDaysBetween", () => {
  it("conta dias de calendário", () => {
    expect(calendarDaysBetween("2026-10-06", "2026-10-13")).toBe(7);
  });
  it("atravessa ano bissexto", () => {
    expect(calendarDaysBetween("2028-02-28", "2028-03-01")).toBe(2);
  });
  it("retorna negativo para datas passadas", () => {
    expect(calendarDaysBetween("2026-10-06", "2026-10-05")).toBe(-1);
  });
});

describe("todayInBusinessTz", () => {
  it("usa o fuso de São Paulo, não UTC", () => {
    // 01:30 UTC de 07/10 ainda é 22:30 de 06/10 em São Paulo
    expect(todayInBusinessTz(new Date("2026-10-07T01:30:00Z"))).toBe("2026-10-06");
    expect(todayInBusinessTz(new Date("2026-10-07T12:00:00Z"))).toBe("2026-10-07");
  });
});
