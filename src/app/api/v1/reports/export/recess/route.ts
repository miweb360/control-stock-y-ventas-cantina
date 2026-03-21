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

function parseRecessIds(searchParams: URLSearchParams): string[] {
  const rawList = [
    searchParams.get("recessId") ?? "",
    searchParams.get("recessIds") ?? ""
  ]
    .join(",")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  return Array.from(new Set(rawList));
}

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (auth.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo ADMIN" }, { status: 403 });
  }

  const includeDetail = parseBool(request.nextUrl.searchParams.get("includeDetail"));
  const selectedIds = parseRecessIds(request.nextUrl.searchParams);

  let where: {
    status: "CLOSED";
    id?: { in: string[] };
    closedAt?: { gte: Date; lte: Date };
  } = { status: "CLOSED" };

  let fromStr = "";
  let toStr = "";
  if (selectedIds.length > 0) {
    where.id = { in: selectedIds };
  } else {
    const range = parseReportRangeQuery(request.nextUrl.searchParams);
    if (!range.ok) {
      return NextResponse.json({ error: range.error }, { status: 400 });
    }
    fromStr = range.fromStr;
    toStr = range.toStr;
    where.closedAt = { gte: range.fromDate, lte: range.toDate };
  }

  const sessions = await prisma.recessSession.findMany({
    where,
    orderBy: { closedAt: "desc" },
    include: {
      saleItems: {
        include: { product: { select: { name: true } } },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  const totalRevenue = sessions.reduce((acc, s) => acc + (s.totalAmount != null ? Number(s.totalAmount) : 0), 0);
  const rows: string[] = [];
  rows.push(toCsvLine(["Reporte", "Ventas por recreo"]));
  rows.push(toCsvLine(["Emitido por", auth.email]));
  if (fromStr && toStr) {
    rows.push(toCsvLine(["Desde", fromStr, "Hasta", toStr]));
  } else {
    rows.push(toCsvLine(["Filtro", "Recreos seleccionados manualmente"]));
  }
  rows.push(toCsvLine(["Cantidad de recreos", sessions.length]));
  rows.push(toCsvLine(["Facturación total", totalRevenue.toFixed(2)]));
  rows.push("");
  rows.push(toCsvLine(["Recreo", "Cierre", "Líneas", "Total", "Cobro", "Monto cobrado"]));
  for (const session of sessions) {
    rows.push(
      toCsvLine([
        `${session.id.slice(0, 8)}...`,
        session.closedAt ? session.closedAt.toISOString() : "",
        session.saleItems.length,
        session.totalAmount != null ? Number(session.totalAmount).toFixed(2) : "0.00",
        session.paymentMethod ?? "",
        session.paymentTotalAmount != null ? Number(session.paymentTotalAmount).toFixed(2) : ""
      ])
    );
  }

  if (includeDetail) {
    rows.push("");
    rows.push(toCsvLine(["Detalle por recreo"]));
    for (const session of sessions) {
      rows.push(
        toCsvLine([
          "Recreo",
          `${session.id.slice(0, 8)}...`,
          "Cierre",
          session.closedAt ? session.closedAt.toISOString() : ""
        ])
      );
      rows.push(toCsvLine(["Producto", "Qty", "Precio", "Subtotal"]));
      for (const item of session.saleItems) {
        const price = Number(item.unitPriceRef);
        rows.push(toCsvLine([item.product.name, item.qty, price.toFixed(2), (price * item.qty).toFixed(2)]));
      }
      rows.push("");
    }
  }

  const csv = `\uFEFF${rows.join("\r\n")}`;
  const suffix = fromStr && toStr ? `${fromStr}-${toStr}` : "seleccion";
  const filename = `reporte-ventas-recreo-${suffix}.csv`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}

