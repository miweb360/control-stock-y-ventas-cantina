import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infrastructure/prisma/client";
import { getAuthFromRequest } from "@/lib/auth";
import { ProductStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(_request);
  if (!auth) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;

  const product = await prisma.product.findUnique({
    where: { id }
  });

  if (!product) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    id: product.id,
    name: product.name,
    barcode: product.barcode,
    priceRef: Number(product.priceRef),
    status: product.status,
    trackStock: product.trackStock,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString()
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (auth.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo ADMIN puede editar productos" }, { status: 403 });
  }

  const { id } = await params;

  let body: {
    name?: string;
    barcode?: string;
    priceRef?: number;
    status?: ProductStatus;
    trackStock?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  const data: Prisma.ProductUpdateInput = {};
  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (name.length < 2) {
      return NextResponse.json({ error: "nombre debe tener al menos 2 caracteres" }, { status: 400 });
    }
    data.name = name;
  }
  if (body.barcode !== undefined) {
    data.barcode = typeof body.barcode === "string" && body.barcode.trim() ? body.barcode.trim() : null;
  }
  if (typeof body.priceRef === "number") {
    if (body.priceRef < 0) {
      return NextResponse.json({ error: "priceRef debe ser >= 0" }, { status: 400 });
    }
    data.priceRef = body.priceRef;
  }
  if (body.status === "ACTIVO" || body.status === "INACTIVO") {
    data.status = body.status;
  }
  if (typeof body.trackStock === "boolean") {
    data.trackStock = body.trackStock;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      {
        id: existing.id,
        name: existing.name,
        barcode: existing.barcode,
        priceRef: Number(existing.priceRef),
        status: existing.status,
        trackStock: existing.trackStock,
        updatedAt: existing.updatedAt.toISOString()
      },
      { status: 200 }
    );
  }

  try {
    const product = await prisma.product.update({
      where: { id },
      data
    });
    return NextResponse.json({
      id: product.id,
      name: product.name,
      barcode: product.barcode,
      priceRef: Number(product.priceRef),
      status: product.status,
      trackStock: product.trackStock,
      updatedAt: product.updatedAt.toISOString()
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "El código de barras ya existe" }, { status: 409 });
    }
    throw e;
  }
}

/**
 * Eliminar producto solo si no tiene ventas ni movimientos de stock (trazabilidad).
 * Si tiene historial: usar estado INACTIVO (PATCH).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (auth.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo ADMIN puede eliminar productos" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.product.findUnique({
    where: { id },
    include: {
      _count: { select: { saleItems: true, inventoryMovements: true } }
    }
  });

  if (!existing) {
    return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
  }

  if (existing._count.saleItems > 0 || existing._count.inventoryMovements > 0) {
    return NextResponse.json(
      {
        error:
          "No se puede eliminar: el producto tiene ventas o movimientos de stock. Usá estado INACTIVO (PATCH)."
      },
      { status: 409 }
    );
  }

  await prisma.product.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
