import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infrastructure/prisma/client";
import { getAuthFromRequest } from "@/lib/auth";
import {
  InventoryMovementType,
  ProductStatus
} from "@prisma/client";
import type { Prisma } from "@prisma/client";

function parseDateOrUndefined(value: string | null) {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

function parseIntOrUndefined(value: string | null) {
  if (!value) return undefined;
  const n = Number.parseInt(value, 10);
  if (Number.isNaN(n)) return undefined;
  return n;
}

function computeSignedQty(type: InventoryMovementType, qty: number): number {
  const abs = Math.abs(Math.trunc(qty));
  if (abs <= 0) return 0;

  if (type === "IN") return abs;
  if (type === "EXPIRE") return -abs;

  // Para ADJUST permitimos delta positivo o negativo.
  if (type === "ADJUST") return Math.trunc(qty);

  // OUT lo maneja la venta (OPERADOR), por eso no lo habilitamos desde ADMIN en este MVP.
  if (type === "OUT") return 0;

  return 0;
}

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const productId = searchParams.get("productId");
  const type = searchParams.get("type") as InventoryMovementType | null;
  const from = parseDateOrUndefined(searchParams.get("from"));
  const to = parseDateOrUndefined(searchParams.get("to"));
  const limit = Math.min(parseIntOrUndefined(searchParams.get("limit")) ?? 50, 100);
  const offset = parseIntOrUndefined(searchParams.get("offset")) ?? 0;

  const where: Prisma.InventoryMovementWhereInput = {};
  if (productId) where.productId = productId;
  if (type && ["IN", "OUT", "ADJUST", "EXPIRE"].includes(type)) where.type = type;
  if (from || to) where.createdAt = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) };

  const [items, total] = await Promise.all([
    prisma.inventoryMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: { product: true }
    }),
    prisma.inventoryMovement.count({ where })
  ]);

  return NextResponse.json({
    items: items.map((m) => ({
      id: m.id,
      productId: m.productId,
      productName: m.product.name,
      type: m.type,
      qty: m.qty,
      reason: m.reason,
      createdAt: m.createdAt.toISOString()
    })),
    total
  });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (auth.role !== "ADMIN") return NextResponse.json({ error: "Solo ADMIN" }, { status: 403 });

  let body: {
    productId?: string;
    type?: InventoryMovementType;
    qty?: number;
    reason?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const productId = typeof body.productId === "string" ? body.productId : "";
  const type = body.type;
  const qtyRaw = body.qty;
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";

  if (!productId) return NextResponse.json({ error: "productId requerido" }, { status: 400 });
  if (!type) return NextResponse.json({ error: "type requerido" }, { status: 400 });
  if (qtyRaw === undefined || typeof qtyRaw !== "number" || !Number.isFinite(qtyRaw)) {
    return NextResponse.json({ error: "qty debe ser número finito" }, { status: 400 });
  }
  if (!reason) return NextResponse.json({ error: "reason requerido" }, { status: 400 });

  if (type === "OUT") {
    return NextResponse.json(
      { error: "OUT se genera desde la venta (modo recreo). Usa IN/ADJUST/EXPIRE." },
      { status: 400 }
    );
  }

  const signedQty = computeSignedQty(type, qtyRaw);
  if (signedQty === 0) return NextResponse.json({ error: "qty inválido para el tipo" }, { status: 400 });

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return NextResponse.json({ error: "Producto no existe" }, { status: 404 });

  if (product.status !== ProductStatus.ACTIVO) {
    // Para MVP: permitimos registrar movimientos sobre productos inactivos solo si lo necesitás.
    // Si querés bloquear, acá devolvemos 400.
  }

  await prisma.$transaction(async (tx) => {
    await tx.inventoryMovement.create({
      data: {
        type,
        qty: signedQty,
        reason,
        productId,
        createdByUserId: auth.sub
      }
    });
  });

  return NextResponse.json({ ok: true });
}

