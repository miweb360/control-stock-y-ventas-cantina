import {
  defaultReportRange,
  endOfUtcDay,
  parseUtcDay
} from "@/lib/report-period";

export type ParsedReportRange =
  | { ok: true; fromStr: string; toStr: string; fromDate: Date; toDate: Date }
  | { ok: false; error: string };

/** Parsea from/to (YYYY-MM-DD) o aplica default últimos 7 días UTC. */
export function parseReportRangeQuery(searchParams: URLSearchParams): ParsedReportRange {
  let fromStr = searchParams.get("from") ?? "";
  let toStr = searchParams.get("to") ?? "";

  if (!fromStr || !toStr) {
    const d = defaultReportRange();
    fromStr = d.from;
    toStr = d.to;
  }

  const fromDate = parseUtcDay(fromStr);
  const toDate = endOfUtcDay(toStr);
  if (!fromDate || !toDate || fromDate > toDate) {
    return {
      ok: false,
      error: "Parámetros from y to inválidos (usar YYYY-MM-DD, from <= to)"
    };
  }

  return { ok: true, fromStr, toStr, fromDate, toDate };
}
