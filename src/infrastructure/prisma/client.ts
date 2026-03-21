import { readFileSync, existsSync } from "fs";
import { resolve, join } from "path";

// Cargar DATABASE_URL desde .env (prioridad sobre Next/Turbopack que puede corromperlo)
const roots = [process.cwd(), resolve(__dirname, "../../../")];
for (const root of roots) {
  const p = join(root, ".env");
  if (existsSync(p)) {
    const content = readFileSync(p, "utf-8");
    const match = content.match(/DATABASE_URL=(.+)/m);
    if (match) {
      process.env.DATABASE_URL = match[1].trim();
      break;
    }
  }
}

import { PrismaClient } from "@prisma/client";

// En Next (dev), los módulos se recargan y evita crear múltiples instancias de Prisma.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL ?? ""
      }
    }
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

