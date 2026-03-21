import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infrastructure/prisma/client";
import { getAuthFromRequest } from "@/lib/auth";
import { parseReportRangeQuery } from "@/lib/report-range";

/**
 * Ventas por recreo cerrado en el rango (contrato sugerido en IMPLEMENTATION_PLAN).
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

  const limitRaw = Number(request.nextUrl.searchParams.get("limit")) || 50;
  const limit = Math.min(Math.max(Math.floor(limitRaw), 1), 100);

  const where = {
    status: "CLOSED" as const,
    closedAt: { gte: fromDate, lte: toDate }
  };

  const items = await prisma.recessSession.findMany({
    where,
    orderBy: { closedAt: "desc" },
    take: limit,
    select: {
      id: true,
      openedAt: true,
      closedAt: true,
      totalAmount: true,
      paymentMethod: true,
      paymentTotalAmount: true,
      _count: { select: { saleItems: true } }
    }
  });

  return NextResponse.json({
    period: { from: fromStr, to: toStr, timezoneNote: "Rango en días UTC (00:00–23:59:59.999Z)." },
    items: items.map((s) => ({
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
