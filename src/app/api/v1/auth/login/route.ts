import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/infrastructure/prisma/client";
import { verifyPassword, createToken, getAuthCookieOptions, COOKIE_NAME } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body as { email?: string; password?: string };

    if (!email || typeof email !== "string" || !password || typeof password !== "string") {
      return NextResponse.json(
        { error: "email y password son requeridos" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() }
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const token = await createToken({
      sub: user.id,
      role: user.role,
      email: user.email
    });

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, role: user.role }
    });

    response.cookies.set(COOKIE_NAME, token, getAuthCookieOptions());

    return response;
  } catch {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
