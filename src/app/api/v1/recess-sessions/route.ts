import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infrastructure/prisma/client";
import { getAuthFromRequest } from "@/lib/auth";

function canSell(role: string) {
  return role === "ADMIN" || role === "OPERADOR";
}

/** GET: sesión OPEN actual (si existe) o listado reciente */
export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!canSell(auth.role)) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const { searchParams } = request.nextUrl;
  const current = searchParams.get("current");

  if (current === "1" || current === "true") {
    const open = await prisma.recessSession.findFirst({
      where: { status: "OPEN" },
      orderBy: { openedAt: "desc" },
      include: {
        saleItems: {
          include: { product: { select: { id: true, name: true, barcode: true } } },
          orderBy: { createdAt: "asc" }
        }
      }
    });
    if (!open) return NextResponse.json({ session: null });

    return NextResponse.json({
      session: {
        id: open.id,
        status: open.status,
        openedAt: open.openedAt.toISOString(),
        closedAt: open.closedAt?.toISOString() ?? null,
        items: open.saleItems.map((i) => ({
          id: i.id,
          productId: i.productId,
          productName: i.product.name,
          barcode: i.product.barcode,
          qty: i.qty,
          unitPriceRef: Number(i.unitPriceRef),
          lineTotal: Number(i.unitPriceRef) * i.qty,
          createdAt: i.createdAt.toISOString()
        }))
      }
    });
  }

  const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);
  const sessions = await prisma.recessSession.findMany({
    orderBy: { openedAt: "desc" },
    take: limit,
    select: {
      id: true,
      status: true,
      openedAt: true,
      closedAt: true,
      totalAmount: true,
      paymentMethod: true,
      paymentTotalAmount: true
    }
  });

  return NextResponse.json({
    items: sessions.map((s) => ({
      ...s,
      openedAt: s.openedAt.toISOString(),
      closedAt: s.closedAt?.toISOString() ?? null,
      totalAmount: s.totalAmount != null ? Number(s.totalAmount) : null,
      paymentTotalAmount: s.paymentTotalAmount != null ? Number(s.paymentTotalAmount) : null
    }))
  });
}

/** POST: abrir nueva sesión de recreo (solo una OPEN a la vez en MVP) */
export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!canSell(auth.role)) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const existing = await prisma.recessSession.findFirst({
    where: { status: "OPEN" }
  });
  if (existing) {
    return NextResponse.json(
      {
        error: "Ya hay un recreo abierto. Cerralo antes de abrir otro.",
        sessionId: existing.id
      },
      { status: 409 }
    );
  }

  const session = await prisma.recessSession.create({
    data: {
      status: "OPEN",
      openedByUserId: auth.sub
    }
  });

  return NextResponse.json(
    {
      id: session.id,
      status: session.status,
      openedAt: session.openedAt.toISOString()
    },
    { status: 201 }
  );
}
