import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export async function getStockForProduct(db: Db, productId: string): Promise<number> {
  const agg = await db.inventoryMovement.aggregate({
    where: { productId },
    _sum: { qty: true }
  });
  return Number(agg._sum.qty ?? 0);
}
