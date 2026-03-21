import { Suspense } from "react";
import PrintReportClient from "./print-report-client";

export default async function ReportsPrintPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    normalized[key] = Array.isArray(value) ? value[0] ?? "" : value ?? "";
  }
  return (
    <Suspense fallback={<main className="p-6">Cargando reporte…</main>}>
      <PrintReportClient searchParams={normalized} />
    </Suspense>
  );
}

