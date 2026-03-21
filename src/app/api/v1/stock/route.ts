import { NextRequest, NextResponse } from "next/server";
import { getAuthFromRequest } from "@/lib/auth";
import { getStockReportItems } from "@/lib/stock-report";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (auth.role !== "ADMIN") return NextResponse.json({ error: "Solo ADMIN" }, { status: 403 });

  const { searchParams } = request.nextUrl;
  const productId = searchParams.get("productId");

  const items = await getStockReportItems(productId);

  return NextResponse.json({ items });
}

