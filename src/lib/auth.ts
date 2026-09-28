import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";
import { User, UserRole } from "../types/crm";

export const COOKIE_NAME = "crm_token";
export const ADMIN_RETURN_COOKIE = "crm_admin_token";

function getSecretKey(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("CRITICAL SECURITY ERROR: JWT_SECRET is not configured in environment variables.");
    }
    return "dev-only-secret-key-lavarenne-crm-2026-strict";
  }
  return secret;
}

export function signToken(user: User): string {
  const payload: Partial<User> = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    brand: user.brand,
    initials: user.initials,
  };
  if (user.assigned_commercial_id) payload.assigned_commercial_id = user.assigned_commercial_id;
  if (user.impersonatedBy) payload.impersonatedBy = user.impersonatedBy;
  return jwt.sign(payload, getSecretKey(), { expiresIn: "12h" });
}

export function verifyToken(token: string): User {
  return jwt.verify(token, getSecretKey()) as User;
}

export function cookieOpts() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 12 * 60 * 60, // 12 hours
    path: "/",
  };
}

export function setAuthCookie(response: NextResponse, token: string): void {
  response.cookies.set(COOKIE_NAME, token, cookieOpts());
}

export function clearAuthCookies(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, "", { ...cookieOpts(), maxAge: 0 });
  response.cookies.set(ADMIN_RETURN_COOKIE, "", { ...cookieOpts(), maxAge: 0 });
}

export function getUserFromRequest(request: NextRequest): User | null {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

export function unauthorized(message = "Non connecté."): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Accès refusé."): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function clientIp(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

export function requireUser(
  request: NextRequest
): { user: User; errorResponse?: never } | { user?: never; errorResponse: NextResponse } {
  const user = getUserFromRequest(request);
  if (!user) {
    return { errorResponse: unauthorized() };
  }
  return { user };
}

export function requireRole(
  request: NextRequest,
  allowedRoles: UserRole[]
): { user: User; errorResponse?: never } | { user?: never; errorResponse: NextResponse } {
  const user = getUserFromRequest(request);
  if (!user) {
    return { errorResponse: unauthorized() };
  }
  if (!allowedRoles.includes(user.role)) {
    return { errorResponse: forbidden("Permissions insuffisantes pour cette opération.") };
  }
  return { user };
}
