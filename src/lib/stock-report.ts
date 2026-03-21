import { prisma } from "@/infrastructure/prisma/client";

/** Stock agregado por producto (misma lógica que GET /api/v1/stock). */
export async function getStockReportItems(productId?: string | null) {
  const where = productId ? { productId } : {};

  const grouped = await prisma.inventoryMovement.groupBy({
    by: ["productId"],
    where,
    _sum: { qty: true }
  });

  const productIds = grouped.map((g) => g.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true }
  });
  const nameById = new Map(products.map((p) => [p.id, p.name]));

  return grouped.map((g) => ({
    productId: g.productId,
    productName: nameById.get(g.productId) ?? null,
    stock: Number(g._sum.qty ?? 0)
  }));
}
