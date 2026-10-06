import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { signToken, setAuthCookie, clientIp } from "@/lib/auth";
import { isRateLimited, registerFailure, clearFailures } from "@/lib/rateLimit";
import { normalizeRole, normalizeBrand } from "@/lib/rbac";
import { User } from "@/types/crm";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  console.log("\n=======================================================");
  console.log("[LOGIN DEBUG] 📥 Tentative de connexion reçue :");
  console.log("  - Email :", email);
  console.log("  - Longueur mot de passe :", password.length);

  if (!email || !password) {
    console.log("[LOGIN DEBUG] ❌ Rejet : Email ou mot de passe manquant dans la requête.");
    return NextResponse.json({ error: "Email et mot de passe requis." }, { status: 400 });
  }

  const ip = clientIp(request);
  const rateLimited = await isRateLimited(ip);
  console.log("  - IP client :", ip, "| Rate limited :", rateLimited);

  if (rateLimited) {
    console.log("[LOGIN DEBUG] ❌ Rejet : IP bloquée par le rate-limiter.");
    return NextResponse.json(
      { error: "Trop de tentatives. Veuillez patienter 10 minutes avant de réessayer." },
      { status: 429 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();

    // 1. Chercher dans user_credentials avec jointure users
    let userRecord: any = null;
    let passwordHash: string | null = null;

    const { data: cred, error: credError } = await supabase
      .from("user_credentials")
      .select("password_hash, users(id, name, role, brand, initials, assigned_commercial_id)")
      .eq("email", email)
      .maybeSingle();

    console.log("[LOGIN DEBUG] 🔍 Recherche dans 'user_credentials' :");
    console.log("  - Trouvé :", !!cred);
    console.log("  - Profil joint 'users' :", !!cred?.users);
    if (credError) {
      console.log("  - Erreur Supabase (user_credentials) :", credError.message);
    }

    if (!credError && cred && cred.users) {
      passwordHash = cred.password_hash;
      userRecord = Array.isArray(cred.users) ? cred.users[0] : cred.users;
    } else {
      // 2. Fallback direct dans la table users
      console.log("[LOGIN DEBUG] 🔍 Fallback : Recherche directe dans la table 'users'...");
      const { data: directUser, error: directError } = await supabase
        .from("users")
        .select("id, name, email, password_hash, role, brand, initials, assigned_commercial_id")
        .eq("email", email)
        .maybeSingle();

      console.log("  - Trouvé dans 'users' :", !!directUser);
      if (directError) {
        console.log("  - Erreur Supabase (users) :", directError.message);
      }

      if (!directError && directUser) {
        passwordHash = directUser.password_hash;
        userRecord = directUser;
      }
    }

    // 3. Vérification si l'utilisateur existe
    if (!userRecord || !passwordHash) {
      console.log("[LOGIN DEBUG] ❌ Utilisateur INTROUVABLE en base de données pour :", email);
      console.log("=======================================================\n");
      await registerFailure(ip);
      return NextResponse.json({ error: "Email ou mot de passe incorrect." }, { status: 401 });
    }

    console.log("[LOGIN DEBUG] 👤 Utilisateur identifié en base :");
    console.log("  - ID :", userRecord.id);
    console.log("  - Nom :", userRecord.name);
    console.log("  - Rôle :", userRecord.role);
    console.log("  - Hash présent (longueur) :", passwordHash.length);

    // 4. Comparaison du mot de passe (support direct plain text ou hachage bcrypt)
    let ok = false;
    if (password === passwordHash) {
      ok = true;
    } else if (
      passwordHash.startsWith("$2a$") ||
      passwordHash.startsWith("$2b$") ||
      passwordHash.startsWith("$2y$")
    ) {
      ok = await bcrypt.compare(password, passwordHash);
    }

    console.log("[LOGIN DEBUG] 🔑 Résultat vérification mot de passe :", ok ? "SUCCÈS (Mot de passe valide)" : "ÉCHEC (Mot de passe incorrect)");

    if (!ok) {
      console.log("[LOGIN DEBUG] ❌ Mot de passe erroné pour :", email);
      console.log("=======================================================\n");
      await registerFailure(ip);
      return NextResponse.json({ error: "Email ou mot de passe incorrect." }, { status: 401 });
    }

    await clearFailures(ip);

    const user: User = {
      id: userRecord.id,
      name: userRecord.name,
      email,
      role: normalizeRole(userRecord.role),
      brand: normalizeBrand(userRecord.brand),
      initials: userRecord.initials || "AF",
      assigned_commercial_id: userRecord.assigned_commercial_id || null,
    };

    console.log("[LOGIN DEBUG] ✅ Session créée pour :", user.name, `[${user.role}]`);
    console.log("=======================================================\n");

    const response = NextResponse.json({ user });
    setAuthCookie(response, signToken(user));
    return response;
  } catch (e: any) {
    console.error("[LOGIN DEBUG] 💥 Exception non gérée dans la route login :", e);
    console.log("=======================================================\n");
    return NextResponse.json({ error: "Erreur serveur, veuillez réessayer." }, { status: 500 });
  }
}
