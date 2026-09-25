import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { signToken, setAuthCookie, clientIp } from "@/lib/auth";
import { isRateLimited, registerFailure, clearFailures } from "@/lib/rateLimit";
import { User } from "@/types/crm";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!email || !password) {
    return NextResponse.json({ error: "Email et mot de passe requis." }, { status: 400 });
  }

  const ip = clientIp(request);
  if (await isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Trop de tentatives. Veuillez patienter 10 minutes avant de réessayer." },
      { status: 429 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();

    // Query user_credentials and joined user record
    const { data: cred, error: credError } = await supabase
      .from("user_credentials")
      .select("password_hash, users(id, name, role, brand, initials)")
      .eq("email", email)
      .maybeSingle();

    if (credError || !cred || !cred.users) {
      await registerFailure(ip);
      return NextResponse.json({ error: "Email ou mot de passe incorrect." }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, cred.password_hash);
    if (!ok) {
      await registerFailure(ip);
      return NextResponse.json({ error: "Email ou mot de passe incorrect." }, { status: 401 });
    }

    await clearFailures(ip);

    const userProfile: any = Array.isArray(cred.users) ? cred.users[0] : cred.users;

    const user: User = {
      id: userProfile.id,
      name: userProfile.name,
      email,
      role: userProfile.role,
      brand: userProfile.brand,
      initials: userProfile.initials,
    };

    const response = NextResponse.json({ user });
    setAuthCookie(response, signToken(user));
    return response;
  } catch (e) {
    console.error("Login route error:", e);
    return NextResponse.json({ error: "Erreur serveur, veuillez réessayer." }, { status: 500 });
  }
}

