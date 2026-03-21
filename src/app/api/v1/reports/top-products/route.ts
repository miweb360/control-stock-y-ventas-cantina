import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/infrastructure/prisma/client";
import { getAuthFromRequest } from "@/lib/auth";
import { parseReportRangeQuery } from "@/lib/report-range";

type TopRow = {
  productId: string;
  productName: string;
  totalQty: bigint;
  totalAmount: Prisma.Decimal;
};

/**
 * Productos más vendidos (cantidad e importe) en recreos cerrados del rango.
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

  const limitRaw = Number(request.nextUrl.searchParams.get("limit")) || 10;
  const limit = Math.min(Math.max(Math.floor(limitRaw), 1), 50);

  const rows = await prisma.$queryRaw<TopRow[]>(Prisma.sql`
    SELECT si."productId",
           p.name AS "productName",
           SUM(si.qty)::bigint AS "totalQty",
           SUM(si.qty * si."unitPriceRef") AS "totalAmount"
    FROM "SaleItem" si
    INNER JOIN "RecessSession" rs ON rs.id = si."recessSessionId"
    INNER JOIN "Product" p ON p.id = si."productId"
    WHERE rs.status = 'CLOSED'
      AND rs."closedAt" >= ${fromDate}
      AND rs."closedAt" <= ${toDate}
    GROUP BY si."productId", p.name
    ORDER BY SUM(si.qty * si."unitPriceRef") DESC
    LIMIT ${limit}
  `);

  return NextResponse.json({
    period: { from: fromStr, to: toStr, timezoneNote: "Rango en días UTC (00:00–23:59:59.999Z)." },
    items: rows.map((r) => ({
      productId: r.productId,
      productName: r.productName,
      totalQty: Number(r.totalQty),
      totalAmount: Number(r.totalAmount)
    }))
  });
}
