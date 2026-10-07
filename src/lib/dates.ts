/** Dias de calendário entre duas datas ISO (YYYY-MM-DD). Positivo se `to` é depois de `from`. */
export function calendarDaysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

/** Data de hoje (YYYY-MM-DD) no fuso do negócio. `now` é injetável para testes. */
export function todayInBusinessTz(now: Date = new Date(), timeZone = "America/Sao_Paulo"): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
