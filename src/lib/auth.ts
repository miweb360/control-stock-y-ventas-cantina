import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

const AUTH_SECRET = process.env.AUTH_SECRET ?? "dev-secret-change-in-production";
const SECRET = new TextEncoder().encode(AUTH_SECRET);
const COOKIE_NAME = "auth_token";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 días

export interface AuthPayload {
  sub: string;
  role: Role;
  email: string;
  iat?: number;
  exp?: number;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(payload: Omit<AuthPayload, "iat" | "exp">): Promise<string> {
  return new SignJWT({ ...payload, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<AuthPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (!payload.sub || !payload.role || !payload.email) return null;
    return {
      sub: payload.sub,
      role: payload.role as Role,
      email: payload.email as string,
      iat: payload.iat as number,
      exp: payload.exp as number
    };
  } catch {
    return null;
  }
}

export function getAuthCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: COOKIE_MAX_AGE,
    path: "/"
  };
}

export { COOKIE_NAME };

/** Obtiene el payload de auth desde las cookies (para uso en Route Handlers) */
export async function getAuthFromRequest(request: Request): Promise<AuthPayload | null> {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
  const token = match?.[1];
  if (!token) return null;
  return verifyToken(token);
}
