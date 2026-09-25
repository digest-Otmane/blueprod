import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  getUserFromRequest,
  unauthorized,
  forbidden,
  signToken,
  setAuthCookie,
  cookieOpts,
  COOKIE_NAME,
  ADMIN_RETURN_COOKIE,
} from "@/lib/auth";
import { User } from "@/types/crm";

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const admin = getUserFromRequest(request);
  if (!admin) return unauthorized();
  if (admin.role !== "admin") return forbidden("Réservé à l'administrateur.");

  try {
    const supabase = getSupabaseAdmin();
    const { data: target, error } = await supabase
      .from("users")
      .select("id, name, email, role, brand, initials")
      .eq("id", params.userId)
      .maybeSingle();

    if (error || !target) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }

    if (target.role === "admin") {
      return NextResponse.json(
        { error: "Impossible de visualiser un autre compte administrateur." },
        { status: 400 }
      );
    }

    const currentToken = request.cookies.get(COOKIE_NAME)?.value;

    const impersonatedUser: User = {
      id: target.id,
      name: target.name,
      email: target.email,
      role: target.role,
      brand: target.brand,
      initials: target.initials,
      impersonatedBy: admin.id,
    };

    const response = NextResponse.json({ user: impersonatedUser });
    if (currentToken) {
      response.cookies.set(ADMIN_RETURN_COOKIE, currentToken, cookieOpts());
    }
    setAuthCookie(response, signToken(impersonatedUser));
    return response;
  } catch (e) {
    console.error("Impersonate error:", e);
    return NextResponse.json({ error: "Erreur serveur, réessayez." }, { status: 500 });
  }
}

