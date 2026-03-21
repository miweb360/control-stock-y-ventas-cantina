import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infrastructure/prisma/client";
import { getAuthFromRequest } from "@/lib/auth";
import { parseReportRangeQuery } from "@/lib/report-range";

type DetailItem = {
  id: string;
  productId: string;
  productName: string;
  barcode: string | null;
  qty: number;
  unitPriceRef: number;
  lineTotal: number;
  createdAt: string;
};

type DayBucket = {
  day: string;
  sessionCount: number;
  totalRevenue: number;
  sessions: Array<{
    id: string;
    openedAt: string;
    closedAt: string | null;
    totalAmount: number;
    paymentMethod: string | null;
    paymentTotalAmount: number | null;
    lineCount: number;
    items: DetailItem[];
  }>;
};

/**
 * Detalle diario de ventas: recreos cerrados + items por recreo (UTC).
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

  const sessions = await prisma.recessSession.findMany({
    where: {
      status: "CLOSED",
      closedAt: { gte: fromDate, lte: toDate }
    },
    orderBy: { closedAt: "desc" },
    include: {
      saleItems: {
        include: { product: { select: { id: true, name: true, barcode: true } } },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  const byDay = new Map<string, DayBucket>();

  for (const session of sessions) {
    const day = (session.closedAt ?? session.openedAt).toISOString().slice(0, 10);
    if (!byDay.has(day)) {
      byDay.set(day, {
        day,
        sessionCount: 0,
        totalRevenue: 0,
        sessions: []
      });
    }

    const bucket = byDay.get(day)!;
    const totalAmount = session.totalAmount != null ? Number(session.totalAmount) : 0;
    const mappedItems: DetailItem[] = session.saleItems.map((item) => {
      const unitPriceRef = Number(item.unitPriceRef);
      return {
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        barcode: item.product.barcode,
        qty: item.qty,
        unitPriceRef,
        lineTotal: unitPriceRef * item.qty,
        createdAt: item.createdAt.toISOString()
      };
    });

    bucket.sessionCount += 1;
    bucket.totalRevenue += totalAmount;
    bucket.sessions.push({
      id: session.id,
      openedAt: session.openedAt.toISOString(),
      closedAt: session.closedAt?.toISOString() ?? null,
      totalAmount,
      paymentMethod: session.paymentMethod,
      paymentTotalAmount: session.paymentTotalAmount != null ? Number(session.paymentTotalAmount) : null,
      lineCount: session.saleItems.length,
      items: mappedItems
    });
  }

  const items = Array.from(byDay.values()).sort((a, b) => a.day.localeCompare(b.day));

  return NextResponse.json({
    period: { from: fromStr, to: toStr, timezoneNote: "Detalle agrupado por día UTC." },
    items
  });
}

