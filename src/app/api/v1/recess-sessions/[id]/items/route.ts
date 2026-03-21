import { NextRequest, NextResponse } from "next/server";
import { Prisma, ProductStatus } from "@prisma/client";
import { prisma } from "@/infrastructure/prisma/client";
import { getAuthFromRequest } from "@/lib/auth";
import { getStockForProduct } from "@/lib/stock";

function canSell(role: string) {
  return role === "ADMIN" || role === "OPERADOR";
}

function jsonSaleLine(
  saleItem: { id: string; qty: number; unitPriceRef: Prisma.Decimal },
  product: { id: string; name: string }
) {
  const unit = Number(saleItem.unitPriceRef);
  return {
    id: saleItem.id,
    productId: product.id,
    productName: product.name,
    qty: saleItem.qty,
    unitPriceRef: unit,
    lineTotal: unit * saleItem.qty
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!canSell(auth.role)) return NextResponse.json({ error: "Sin permiso" }, { status: 403 });

  const { id: sessionId } = await params;

  let body: { productId?: string; barcode?: string; qty?: number; idempotencyKey?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const productId = typeof body.productId === "string" ? body.productId.trim() : "";
  const barcode = typeof body.barcode === "string" ? body.barcode.trim() : "";
  const qty = Math.trunc(Number(body.qty ?? 1));
  const idempotencyKeyRaw =
    typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim().slice(0, 128) : "";
  const useIdempotency = idempotencyKeyRaw.length > 0;
  if (useIdempotency && idempotencyKeyRaw.length < 8) {
    return NextResponse.json(
      { error: "idempotencyKey debe tener entre 8 y 128 caracteres (ej. UUID)" },
      { status: 400 }
    );
  }

  if (!productId && !barcode) {
    return NextResponse.json({ error: "productId o barcode requerido" }, { status: 400 });
  }
  if (qty < 1 || qty > 999) {
    return NextResponse.json({ error: "qty debe estar entre 1 y 999" }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (useIdempotency) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${sessionId}), hashtext(${idempotencyKeyRaw}))`;

        const existing = await tx.recessAddItemIdempotency.findUnique({
          where: {
            recessSessionId_key: { recessSessionId: sessionId, key: idempotencyKeyRaw }
          }
        });
        if (existing) {
          const saleItem = await tx.saleItem.findUnique({
            where: { id: existing.saleItemId },
            include: { product: true }
          });
          if (saleItem?.product) {
            return { replay: true as const, saleItem, product: saleItem.product };
          }
        }
      }

      const session = await tx.recessSession.findUnique({ where: { id: sessionId } });
      if (!session) throw Object.assign(new Error("NOT_FOUND"), { code: "NOT_FOUND" });
      if (session.status !== "OPEN") throw Object.assign(new Error("CLOSED"), { code: "CLOSED" });

      let product =
        productId ?
          await tx.product.findFirst({
            where: { id: productId, status: ProductStatus.ACTIVO }
          })
        : null;
      if (!product && barcode) {
        product = await tx.product.findFirst({
          where: { barcode, status: ProductStatus.ACTIVO }
        });
      }
      if (!product) throw Object.assign(new Error("PRODUCT"), { code: "PRODUCT" });

      if (product.trackStock) {
        const stock = await getStockForProduct(tx, product.id);
        if (stock < qty) {
          throw Object.assign(new Error("STOCK"), { code: "STOCK", stock });
        }
      }

      const saleItem = await tx.saleItem.create({
        data: {
          recessSessionId: sessionId,
          productId: product.id,
          qty,
          unitPriceRef: product.priceRef
        }
      });

      await tx.inventoryMovement.create({
        data: {
          type: "OUT",
          qty: -qty,
          reason: `Venta recreo ${sessionId}`,
          productId: product.id,
          createdByUserId: auth.sub,
          saleItemId: saleItem.id
        }
      });

      if (useIdempotency) {
        await tx.recessAddItemIdempotency.create({
          data: {
            recessSessionId: sessionId,
            key: idempotencyKeyRaw,
            saleItemId: saleItem.id
          }
        });
      }

      return { replay: false as const, saleItem, product };
    });

    const payload = jsonSaleLine(result.saleItem, result.product);
    const res = NextResponse.json(payload);
    if (result.replay) {
      res.headers.set("Idempotent-Replayed", "true");
    }
    return res;
  } catch (e: unknown) {
    const err = e as { code?: string; stock?: number; message?: string };
    if (err.code === "NOT_FOUND") {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
    }
    if (err.code === "CLOSED") {
      return NextResponse.json({ error: "El recreo ya está cerrado" }, { status: 400 });
    }
    if (err.code === "PRODUCT") {
      return NextResponse.json({ error: "Producto no encontrado o inactivo" }, { status: 404 });
    }
    if (err.code === "STOCK") {
      return NextResponse.json(
        { error: "Stock insuficiente", available: err.stock },
        { status: 400 }
      );
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "Clave idempotente duplicada en otra sesión o conflicto" },
        { status: 409 }
      );
    }
    throw e;
  }
}
