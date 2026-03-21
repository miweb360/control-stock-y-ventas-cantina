import { PrismaClient, Role } from "@prisma/client";
import { hashPassword } from "../src/lib/auth";

const prisma = new PrismaClient();

async function main() {
  const adminHash = await hashPassword("admin123");
  const operadorHash = await hashPassword("operador123");

  await prisma.user.upsert({
    where: { email: "admin@kiosco.local" },
    update: {},
    create: {
      email: "admin@kiosco.local",
      passwordHash: adminHash,
      role: Role.ADMIN
    }
  });

  await prisma.user.upsert({
    where: { email: "operador@kiosco.local" },
    update: {},
    create: {
      email: "operador@kiosco.local",
      passwordHash: operadorHash,
      role: Role.OPERADOR
    }
  });

  console.log("Seed completado: admin@kiosco.local (admin123) y operador@kiosco.local (operador123)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
