import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/infrastructure/prisma/client";
import { getAuthFromRequest } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";

/**
 * PATCH: actualizar contraseña y/o rol de un usuario. Solo ADMIN.
 * Al menos uno de password o role debe enviarse.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthFromRequest(request);
  if (!auth) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (auth.role !== "ADMIN") {
    return NextResponse.json({ error: "Solo ADMIN" }, { status: 403 });
  }

  const { id } = await params;

  let body: { password?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : undefined;
  const roleRaw = body.role;

  if (!password && roleRaw === undefined) {
    return NextResponse.json(
      { error: "Enviar al menos password o role para actualizar" },
      { status: 400 }
    );
  }

  if (password !== undefined && password.length < 6) {
    return NextResponse.json(
      { error: "La contraseña debe tener al menos 6 caracteres" },
      { status: 400 }
    );
  }

  const role: Role | undefined =
    roleRaw === "ADMIN" ? "ADMIN" : roleRaw === "OPERADOR" ? "OPERADOR" : undefined;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const data: { passwordHash?: string; role?: Role } = {};
  if (password && password.length >= 6) {
    data.passwordHash = await hashPassword(password);
  }
  if (role !== undefined) {
    data.role = role;
  }

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, email: true, role: true, updatedAt: true }
  });

  return NextResponse.json({
    id: user.id,
    email: user.email,
    role: user.role,
    updatedAt: user.updatedAt.toISOString()
  });
}
