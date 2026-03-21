import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infrastructure/prisma/client";
import { getAuthFromRequest } from "@/lib/auth";
import { parseReportRangeQuery } from "@/lib/report-range";

/**
 * Resumen de recreos cerrados en un rango (por closedAt).
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

  const where = {
    status: "CLOSED" as const,
    closedAt: { gte: fromDate, lte: toDate }
  };

  const [agg, sessions] = await Promise.all([
    prisma.recessSession.aggregate({
      where,
      _count: { _all: true },
      _sum: { totalAmount: true }
    }),
    prisma.recessSession.findMany({
      where,
      orderBy: { closedAt: "desc" },
      take: 50,
      select: {
        id: true,
        openedAt: true,
        closedAt: true,
        totalAmount: true,
        paymentMethod: true,
        paymentTotalAmount: true,
        _count: { select: { saleItems: true } }
      }
    })
  ]);

  const totalRevenue = agg._sum.totalAmount != null ? Number(agg._sum.totalAmount) : 0;

  return NextResponse.json({
    period: { from: fromStr, to: toStr, timezoneNote: "Rango en días UTC (00:00–23:59:59.999Z)." },
    closedSessionsCount: agg._count._all,
    totalRevenue,
    sessions: sessions.map((s) => ({
      id: s.id,
      openedAt: s.openedAt.toISOString(),
      closedAt: s.closedAt?.toISOString() ?? null,
      totalAmount: s.totalAmount != null ? Number(s.totalAmount) : 0,
      paymentMethod: s.paymentMethod,
      paymentTotalAmount: s.paymentTotalAmount != null ? Number(s.paymentTotalAmount) : null,
      lineCount: s._count.saleItems
    }))
  });
}
