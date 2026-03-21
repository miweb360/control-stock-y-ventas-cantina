import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infrastructure/prisma/client";
import { getAuthFromRequest } from "@/lib/auth";
import { PaymentMethod } from "@prisma/client";
import { Prisma } from "@prisma/client";

function canSell(role: string) {
  return role === "ADMIN" || role === "OPERADOR";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!canSell(auth.role)) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const { id: sessionId } = await params;

  let body: { paymentMethod?: PaymentMethod; paymentTotalAmount?: number };
  try {
    body = await request.json().catch(() => ({}));
  } catch {
    body = {};
  }

  const paymentMethod =
    body.paymentMethod && ["EFECTIVO", "TRANSFERENCIA", "QR"].includes(body.paymentMethod)
      ? body.paymentMethod
      : undefined;
  const paymentTotalAmount =
    typeof body.paymentTotalAmount === "number" && body.paymentTotalAmount >= 0
      ? body.paymentTotalAmount
      : undefined;

  try {
    const session = await prisma.$transaction(async (tx) => {
      const s = await tx.recessSession.findUnique({
        where: { id: sessionId },
        include: { saleItems: true }
      });
      if (!s) throw Object.assign(new Error("NOT_FOUND"), { code: "NOT_FOUND" });
      if (s.status !== "OPEN") throw Object.assign(new Error("CLOSED"), { code: "CLOSED" });

      const total = s.saleItems.reduce(
        (sum, i) => sum + Number(i.unitPriceRef) * i.qty,
        0
      );

      return tx.recessSession.update({
        where: { id: sessionId },
        data: {
          status: "CLOSED",
          closedAt: new Date(),
          closedByUserId: auth.sub,
          totalAmount: new Prisma.Decimal(total.toFixed(2)),
          paymentMethod: paymentMethod ?? null,
          paymentTotalAmount:
            paymentTotalAmount != null ? new Prisma.Decimal(paymentTotalAmount.toFixed(2)) : null
        }
      });
    });

    return NextResponse.json({
      id: session.id,
      status: session.status,
      closedAt: session.closedAt?.toISOString() ?? null,
      totalAmount: session.totalAmount != null ? Number(session.totalAmount) : 0,
      paymentMethod: session.paymentMethod,
      paymentTotalAmount:
        session.paymentTotalAmount != null ? Number(session.paymentTotalAmount) : null
    });
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "NOT_FOUND") {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
    }
    if (err.code === "CLOSED") {
      return NextResponse.json({ error: "El recreo ya estaba cerrado" }, { status: 400 });
    }
    throw e;
  }
}
