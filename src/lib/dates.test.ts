import { describe, expect, it } from "vitest";
import { calendarDaysBetween } from "./dates";

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
