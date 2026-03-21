/**
 * Ejecuta Prisma cargando .env y .env.local con override: true.
 * Así se ignoran DATABASE_URL / AUTH_SECRET definidas a nivel de Windows
 * (que suelen pisar el .env y romper migrate contra Docker en 5433).
 */
import { config } from "dotenv";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const loadOpts = { override: true, quiet: true };
config({ path: path.join(root, ".env"), ...loadOpts });
config({ path: path.join(root, ".env.local"), ...loadOpts });

const prismaArgs = process.argv.slice(2);
if (prismaArgs.length === 0) {
  console.error("Uso: npm run prisma:exec -- <argumentos de prisma>");
  console.error("Ejemplos:");
  console.error("  npm run prisma:migrate");
  console.error("  npm run prisma:exec -- migrate status");
  process.exit(1);
}

const isWin = process.platform === "win32";
const prismaBin = path.join(root, "node_modules", ".bin", isWin ? "prisma.cmd" : "prisma");

const child = spawn(prismaBin, prismaArgs, {
  stdio: "inherit",
  shell: isWin,
  cwd: root,
  env: process.env
});

child.on("exit", (code) => process.exit(code ?? 0));
