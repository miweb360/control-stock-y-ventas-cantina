/**
 * Rango de fechas para reportes (MVP): días en calendario UTC (YYYY-MM-DD).
 */
export function parseUtcDay(isoDate: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function endOfUtcDay(isoDate: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null;
  const d = new Date(`${isoDate}T23:59:59.999Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function defaultReportRange(): { from: string; to: string; fromDate: Date; toDate: Date } {
  const to = new Date();
  const toStr = to.toISOString().slice(0, 10);
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 6);
  const fromStr = from.toISOString().slice(0, 10);
  const fromDate = parseUtcDay(fromStr)!;
  const toDate = endOfUtcDay(toStr)!;
  return { from: fromStr, to: toStr, fromDate, toDate };
}
