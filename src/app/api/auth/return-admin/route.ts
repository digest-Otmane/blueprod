import { NextRequest, NextResponse } from "next/server";
import {
  getUserFromRequest,
  unauthorized,
  verifyToken,
  setAuthCookie,
  cookieOpts,
  ADMIN_RETURN_COOKIE,
} from "@/lib/auth";

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorized();

  const adminToken = request.cookies.get(ADMIN_RETURN_COOKIE)?.value;
  if (!adminToken) {
    return NextResponse.json(
      { error: "Aucune session administrateur à restaurer." },
      { status: 400 }
    );
  }

  try {
    const decoded = verifyToken(adminToken);
    const { ...restoredUser } = decoded;
    const response = NextResponse.json({ user: restoredUser });
    setAuthCookie(response, adminToken);
    response.cookies.set(ADMIN_RETURN_COOKIE, "", { ...cookieOpts(), maxAge: 0 });
    return response;
  } catch (e) {
    const response = NextResponse.json(
      { error: "Session administrateur expirée, reconnectez-vous." },
      { status: 401 }
    );
    response.cookies.set(ADMIN_RETURN_COOKIE, "", { ...cookieOpts(), maxAge: 0 });
    return response;
  }
}
