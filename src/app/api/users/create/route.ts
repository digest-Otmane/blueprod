import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getUserFromRequest, unauthorized, forbidden } from "@/lib/auth";
import { normalizeRole, normalizeBrand } from "@/lib/rbac";
import { UserRole, Brand } from "@/types/crm";

function generateInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "AF";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function POST(request: NextRequest) {
  // 1. Authentification & Autorisation : Strictement réservé aux Administrateurs
  const currentUser = getUserFromRequest(request);
  if (!currentUser) {
    return unauthorized("Veuillez vous connecter pour effectuer cette action.");
  }
  if (currentUser.role !== "admin") {
    return forbidden("Accès refusé : Seul un administrateur peut créer de nouveaux utilisateurs.");
  }

  try {
    const body = await request.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const rawRole = String(body.role || "").trim();
    const rawBrand = String(body.brand || "").trim();

    // 2. Validation des champs requis
    if (!name) {
      return NextResponse.json({ error: "Le nom complet est obligatoire." }, { status: 400 });
    }
    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Une adresse email valide est obligatoire." }, { status: 400 });
    }
    if (!password || password.length < 4) {
      return NextResponse.json(
        { error: "Le mot de passe doit comporter au moins 4 caractères." },
        { status: 400 }
      );
    }
    if (!rawRole) {
      return NextResponse.json({ error: "Le rôle de l'utilisateur est obligatoire." }, { status: 400 });
    }

    const role: UserRole = normalizeRole(rawRole);
    let brand: Brand = normalizeBrand(rawBrand);

    // Ajustement de la marque en fonction du rôle
    if (role === "admin" || role === "centre_appel") {
      brand = "all";
    } else if (brand === "all") {
      // Pour un commercial, assigner 'lv' par défaut si 'all' a été fourni
      brand = "lv";
    }

    const supabase = getSupabaseAdmin();

    // 3. Vérification de l'unicité de l'email
    const { data: existingUser } = await supabase
      .from("users")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        { error: `Un utilisateur existe déjà avec l'adresse email : ${email}` },
        { status: 400 }
      );
    }

    const { data: existingCred } = await supabase
      .from("user_credentials")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    if (existingCred) {
      return NextResponse.json(
        { error: `Ces identifiants de connexion (${email}) sont déjà attribués.` },
        { status: 400 }
      );
    }

    // 4. Génération de l'identifiant unique (Slug) et des initiales
    let baseId = slugify(name) || `user-${Date.now()}`;
    let userId = baseId;
    let counter = 1;

    while (true) {
      const { data: checkId } = await supabase
        .from("users")
        .select("id")
        .eq("id", userId)
        .maybeSingle();
      if (!checkId) break;
      userId = `${baseId}-${counter}`;
      counter++;
    }

    const initials = generateInitials(name);

    // 5. Sauvegarde du mot de passe en clair (format consultable par l'administrateur)
    const plainTextPassword = password;

    // 6. Insertion dans la table 'users'
    const { data: createdUser, error: insertUserError } = await supabase
      .from("users")
      .insert({
        id: userId,
        name,
        email,
        password_hash: plainTextPassword,
        role,
        brand,
        initials,
      })
      .select("id, name, email, role, brand, initials, created_at")
      .single();

    if (insertUserError || !createdUser) {
      console.error("[USER CREATE] Erreur insertion table users :", insertUserError);
      return NextResponse.json(
        { error: insertUserError?.message || "Erreur lors de la création du profil utilisateur." },
        { status: 500 }
      );
    }

    // 7. Insertion dans la table 'user_credentials' (synchronisation des accès en clair)
    const { error: insertCredError } = await supabase
      .from("user_credentials")
      .insert({
        user_id: userId,
        email,
        password_hash: plainTextPassword,
      });

    if (insertCredError) {
      console.error("[USER CREATE] Erreur insertion user_credentials :", insertCredError);
      // Nettoyage en cas d'échec
      await supabase.from("users").delete().eq("id", userId);
      return NextResponse.json(
        { error: "Erreur lors de l'enregistrement des identifiants de sécurité." },
        { status: 500 }
      );
    }

    // 8. Synchronisation optionnelle avec Supabase Auth si activé
    try {
      if (supabase.auth && supabase.auth.admin) {
        await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            name,
            role,
            brand,
            initials,
          },
        });
      }
    } catch (authSyncErr) {
      console.log("[USER CREATE] Info Supabase Auth sync (non-bloquant) :", authSyncErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Compte utilisateur créé avec succès.",
        user: createdUser,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[USER CREATE] Exception serveur :", error);
    return NextResponse.json(
      { error: error.message || "Une erreur inattendue est survenue." },
      { status: 500 }
    );
  }
}
