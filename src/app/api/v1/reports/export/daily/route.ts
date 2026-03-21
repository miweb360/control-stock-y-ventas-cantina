import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infrastructure/prisma/client";
import { getAuthFromRequest } from "@/lib/auth";
import { parseReportRangeQuery } from "@/lib/report-range";

function toCsvLine(values: Array<string | number | null | undefined>) {
  return values
    .map((value) => {
      const text = value == null ? "" : String(value);
      if (/[",\r\n]/.test(text)) {
        return `"${text.replaceAll("\"", "\"\"")}"`;
      }
      return text;
    })
    .join(",");
}

function parseBool(value: string | null): boolean {
  return value === "1" || value === "true";
}

function parseDaysFilter(value: string | null): Set<string> {
  const set = new Set<string>();
  if (!value) return set;
  for (const raw of value.split(",")) {
    const day = raw.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(day)) set.add(day);
  }
  return set;
}

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

  const includeDetail = parseBool(request.nextUrl.searchParams.get("includeDetail"));
  const daysFilter = parseDaysFilter(request.nextUrl.searchParams.get("days"));

  const sessions = await prisma.recessSession.findMany({
    where: {
      status: "CLOSED",
      closedAt: { gte: fromDate, lte: toDate }
    },
    orderBy: { closedAt: "asc" },
    include: {
      saleItems: {
        include: { product: { select: { name: true } } },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  const grouped = new Map<
    string,
    {
      day: string;
      sessionCount: number;
      totalRevenue: number;
      sessions: typeof sessions;
    }
  >();

  for (const session of sessions) {
    const day = (session.closedAt ?? session.openedAt).toISOString().slice(0, 10);
    if (daysFilter.size > 0 && !daysFilter.has(day)) continue;
    if (!grouped.has(day)) {
      grouped.set(day, { day, sessionCount: 0, totalRevenue: 0, sessions: [] });
    }
    const bucket = grouped.get(day)!;
    bucket.sessionCount += 1;
    bucket.totalRevenue += session.totalAmount != null ? Number(session.totalAmount) : 0;
    bucket.sessions.push(session);
  }

  const days = Array.from(grouped.values()).sort((a, b) => a.day.localeCompare(b.day));
  const totalSessions = days.reduce((acc, day) => acc + day.sessionCount, 0);
  const totalRevenue = days.reduce((acc, day) => acc + day.totalRevenue, 0);

  const rows: string[] = [];
  rows.push(toCsvLine(["Reporte", "Ventas diarias"]));
  rows.push(toCsvLine(["Emitido por", auth.email]));
  rows.push(toCsvLine(["Desde", fromStr, "Hasta", toStr]));
  rows.push(toCsvLine(["Días incluidos", days.length]));
  rows.push(toCsvLine(["Recreos cerrados", totalSessions]));
  rows.push(toCsvLine(["Facturación total", totalRevenue.toFixed(2)]));
  rows.push("");
  rows.push(toCsvLine(["Día (UTC)", "Recreos cerrados", "Facturación"]));
  for (const day of days) {
    rows.push(toCsvLine([day.day, day.sessionCount, day.totalRevenue.toFixed(2)]));
  }

  if (includeDetail) {
    rows.push("");
    rows.push(toCsvLine(["Detalle por día y recreo"]));
    for (const day of days) {
      rows.push(toCsvLine(["Día", day.day]));
      rows.push(toCsvLine(["Recreo", "Cierre", "Producto", "Qty", "Precio", "Subtotal"]));
      for (const session of day.sessions) {
        const recessCode = `${session.id.slice(0, 8)}...`;
        const closedAt = session.closedAt ? session.closedAt.toISOString() : "";
        for (const item of session.saleItems) {
          const price = Number(item.unitPriceRef);
          rows.push(toCsvLine([recessCode, closedAt, item.product.name, item.qty, price.toFixed(2), (price * item.qty).toFixed(2)]));
        }
      }
      rows.push("");
    }
  }

  const csv = `\uFEFF${rows.join("\r\n")}`;
  const filename = `reporte-ventas-diarias-${fromStr}-${toStr}.csv`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}

