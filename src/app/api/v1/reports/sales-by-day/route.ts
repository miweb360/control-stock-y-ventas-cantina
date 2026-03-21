import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/infrastructure/prisma/client";
import { getAuthFromRequest } from "@/lib/auth";
import { parseReportRangeQuery } from "@/lib/report-range";

type DayRow = {
  day: Date;
  sessionCount: bigint;
  totalRevenue: Prisma.Decimal;
};

/**
 * Agregación por día calendario (UTC) de recreos cerrados en el rango.
 * Solo ADMIN.
 */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (auth.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo ADMIN" }, { status: 403 });
  }

  const range = parseReportRangeQuery(request.nextUrl.searchParams);
  if (!range.ok) {
    return NextResponse.json({ error: range.error }, { status: 400 });
  }
  const { fromStr, toStr, fromDate, toDate } = range;

  const rows = await prisma.$queryRaw<DayRow[]>(Prisma.sql`
    SELECT date_trunc('day', rs."closedAt" AT TIME ZONE 'UTC') AS day,
           COUNT(*)::bigint AS "sessionCount",
           COALESCE(SUM(rs."totalAmount"), 0) AS "totalRevenue"
    FROM "RecessSession" rs
    WHERE rs.status = 'CLOSED'
      AND rs."closedAt" >= ${fromDate}
      AND rs."closedAt" <= ${toDate}
    GROUP BY 1
    ORDER BY 1 ASC
  `);

  return NextResponse.json({
    period: { from: fromStr, to: toStr, timezoneNote: "Días agrupados en UTC (date_trunc)." },
    items: rows.map((r) => ({
      day:
        r.day instanceof Date ?
          r.day.toISOString().slice(0, 10)
        : String(r.day).slice(0, 10),
      sessionCount: Number(r.sessionCount),
      totalRevenue: Number(r.totalRevenue)
    }))
  });
}
