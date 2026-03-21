import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { Role } from "@prisma/client";

const AUTH_SECRET = process.env.AUTH_SECRET ?? "dev-secret-change-in-production";
const SECRET = new TextEncoder().encode(AUTH_SECRET);
const COOKIE_NAME = "auth_token";

const PUBLIC_PATHS = ["/login", "/api/v1/health", "/api/v1/auth/login", "/api/v1/auth/logout"];

function isRoot(pathname: string): boolean {
  return pathname === "/";
}
const ADMIN_PREFIX = "/admin";
const SALE_PREFIX = "/sale";

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

async function getPayload(request: NextRequest): Promise<{ sub: string; role: Role; email: string } | null> {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (!payload.sub || !payload.role || !payload.email) return null;
    return {
      sub: payload.sub,
      role: payload.role as Role,
      email: payload.email as string
    };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isRoot(pathname)) {
    const payload = await getPayload(request);
    if (payload) {
      const redirect = payload.role === "ADMIN" ? "/admin" : "/sale";
      return NextResponse.redirect(new URL(redirect, request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isPublicPath(pathname)) {
    if (pathname === "/login") {
      const payload = await getPayload(request);
      if (payload) {
        const redirect = payload.role === "ADMIN" ? "/admin" : "/sale";
        return NextResponse.redirect(new URL(redirect, request.url));
      }
    }
    return NextResponse.next();
  }

  const payload = await getPayload(request);
  if (!payload) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith(ADMIN_PREFIX) && payload.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/sale", request.url));
  }

  if (pathname.startsWith(SALE_PREFIX) && payload.role !== "ADMIN" && payload.role !== "OPERADOR") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
