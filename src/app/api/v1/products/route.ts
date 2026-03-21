import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infrastructure/prisma/client";
import { getAuthFromRequest } from "@/lib/auth";
import { ProductStatus } from "@prisma/client";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const status = searchParams.get("status") as ProductStatus | null;
  const search = searchParams.get("search") ?? "";
  const limit = Math.min(Number(searchParams.get("limit")) || 50, 100);
  const offset = Number(searchParams.get("offset")) || 0;

  const where: Prisma.ProductWhereInput = {};
  if (status && (status === "ACTIVO" || status === "INACTIVO")) {
    where.status = status;
  }
  if (search.trim()) {
    where.OR = [
      { name: { contains: search.trim(), mode: "insensitive" } },
      { barcode: { contains: search.trim(), mode: "insensitive" } }
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { name: "asc" },
      take: limit,
      skip: offset
    }),
    prisma.product.count({ where })
  ]);

  return NextResponse.json({
    items: products.map((p) => ({
      id: p.id,
      name: p.name,
      barcode: p.barcode,
      priceRef: Number(p.priceRef),
      status: p.status,
      trackStock: p.trackStock,
      createdAt: p.createdAt.toISOString()
    })),
    total
  });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }
  if (auth.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo ADMIN puede crear productos" }, { status: 403 });
  }

  let body: { name?: string; barcode?: string; priceRef?: number; trackStock?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const barcode = typeof body.barcode === "string" ? body.barcode.trim() || null : null;
  const priceRef = typeof body.priceRef === "number" ? body.priceRef : Number(body.priceRef);
  const trackStock = typeof body.trackStock === "boolean" ? body.trackStock : true;

  if (!name || name.length < 2) {
    return NextResponse.json({ error: "nombre es requerido (mín. 2 caracteres)" }, { status: 400 });
  }
  if (Number.isNaN(priceRef) || priceRef < 0) {
    return NextResponse.json({ error: "priceRef debe ser un número >= 0" }, { status: 400 });
  }

  try {
    const product = await prisma.product.create({
      data: {
        name,
        barcode: barcode || undefined,
        priceRef,
        trackStock,
        status: "ACTIVO"
      }
    });
    return NextResponse.json(
      {
        id: product.id,
        name: product.name,
        barcode: product.barcode,
        priceRef: Number(product.priceRef),
        status: product.status,
        trackStock: product.trackStock,
        createdAt: product.createdAt.toISOString()
      },
      { status: 201 }
    );
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "El código de barras ya existe" }, { status: 409 });
    }
    throw e;
  }
}
