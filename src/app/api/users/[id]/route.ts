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

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const currentUser = getUserFromRequest(request);
  if (!currentUser) {
    return unauthorized("Veuillez vous connecter pour effectuer cette action.");
  }
  if (currentUser.role !== "admin") {
    return forbidden("Accès refusé : Seul un administrateur peut modifier un utilisateur.");
  }

  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "Identifiant utilisateur manquant." }, { status: 400 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const rawRole = String(body.role || "").trim();
    const rawBrand = String(body.brand || "").trim();

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

    const role: UserRole = normalizeRole(rawRole);
    let brand: Brand = normalizeBrand(rawBrand);

    if (role === "admin" || role === "centre_appel") {
      brand = "all";
    } else if (brand === "all") {
      brand = "lv";
    }

    const supabase = getSupabaseAdmin();

    // Vérifier si un autre utilisateur utilise déjà cet email
    const { data: duplicateUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", email)
      .neq("id", id)
      .maybeSingle();

    if (duplicateUser) {
      return NextResponse.json(
        { error: `Un autre compte utilise déjà l'adresse email : ${email}` },
        { status: 400 }
      );
    }

    const initials = generateInitials(name);
    const plainTextPassword = password;

    // Mise à jour de la table 'users'
    const { data: updatedUser, error: updateError } = await supabase
      .from("users")
      .update({
        name,
        email,
        password_hash: plainTextPassword, // Stockage en clair
        role,
        brand,
        initials,
      })
      .eq("id", id)
      .select("id, name, email, role, brand, initials, password_hash")
      .single();

    if (updateError) {
      console.error("[USER UPDATE] Erreur mise à jour users :", updateError);
      return NextResponse.json(
        { error: updateError.message || "Erreur lors de la mise à jour de l'utilisateur." },
        { status: 500 }
      );
    }

    // Synchronisation de la table 'user_credentials'
    const { error: credError } = await supabase
      .from("user_credentials")
      .upsert(
        {
          user_id: id,
          email,
          password_hash: plainTextPassword,
        },
        { onConflict: "email" }
      );

    if (credError) {
      console.warn("[USER UPDATE] Avertissement synchronisation credentials :", credError);
    }

    return NextResponse.json({
      success: true,
      message: "Utilisateur mis à jour avec succès.",
      user: {
        ...updatedUser,
        password: plainTextPassword,
      },
    });
  } catch (error: any) {
    console.error("[USER UPDATE] Exception serveur :", error);
    return NextResponse.json(
      { error: error.message || "Une erreur inattendue est survenue." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const currentUser = getUserFromRequest(request);
  if (!currentUser) {
    return unauthorized("Veuillez vous connecter pour effectuer cette action.");
  }
  if (currentUser.role !== "admin") {
    return forbidden("Accès refusé : Seul un administrateur peut supprimer un utilisateur.");
  }

  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: "Identifiant utilisateur manquant." }, { status: 400 });
  }

  // Protection contre l'auto-suppression du compte administrateur connecté
  if (currentUser.id === id) {
    return NextResponse.json(
      { error: "Action impossible : Vous ne pouvez pas supprimer votre propre compte administrateur en cours d'utilisation." },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabaseAdmin();

    // 1. Supprimer les identifiants dans 'user_credentials'
    await supabase.from("user_credentials").delete().eq("user_id", id);

    // 2. Supprimer l'utilisateur dans 'users'
    const { error: deleteError } = await supabase.from("users").delete().eq("id", id);

    if (deleteError) {
      console.error("[USER DELETE] Erreur suppression table users :", deleteError);
      return NextResponse.json(
        { error: deleteError.message || "Erreur lors de la suppression de l'utilisateur." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Utilisateur supprimé avec succès de la base de données.",
    });
  } catch (error: any) {
    console.error("[USER DELETE] Exception serveur :", error);
    return NextResponse.json(
      { error: error.message || "Une erreur inattendue est survenue." },
      { status: 500 }
    );
  }
}
