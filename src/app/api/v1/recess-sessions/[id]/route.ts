import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infrastructure/prisma/client";
import { getAuthFromRequest } from "@/lib/auth";

function canSell(role: string) {
  return role === "ADMIN" || role === "OPERADOR";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!canSell(auth.role)) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const { id } = await params;

  const session = await prisma.recessSession.findUnique({
    where: { id },
    include: {
      saleItems: {
        include: { product: { select: { id: true, name: true, barcode: true } } },
        orderBy: { createdAt: "asc" }
      }
    }
  });

  if (!session) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });

  return NextResponse.json({
    id: session.id,
    status: session.status,
    openedAt: session.openedAt.toISOString(),
    closedAt: session.closedAt?.toISOString() ?? null,
    totalAmount: session.totalAmount != null ? Number(session.totalAmount) : null,
    paymentMethod: session.paymentMethod,
    paymentTotalAmount:
      session.paymentTotalAmount != null ? Number(session.paymentTotalAmount) : null,
    items: session.saleItems.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.product.name,
      barcode: i.product.barcode,
      qty: i.qty,
      unitPriceRef: Number(i.unitPriceRef),
      lineTotal: Number(i.unitPriceRef) * i.qty,
      createdAt: i.createdAt.toISOString()
    }))
  });
}
