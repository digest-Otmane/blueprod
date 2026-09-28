import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getUserFromRequest, unauthorized, forbidden } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorized();
  if (user.role !== "centre_appel" && user.role !== "admin") {
    return forbidden("La qualification des leads est réservée au Centre d'Appel et à l'Administration.");
  }

  const body = await request.json().catch(() => ({}));
  const { besoin, need_type, budget, dispo, notes, interet, commercial, commercial_id } = body;

  if (!commercial) {
    return NextResponse.json({ error: "Veuillez sélectionner le commercial destinataire." }, { status: 400 });
  }

  // Déterminer le need_type s'il n'est pas explicite (analyse du texte du besoin)
  let detectedNeed = need_type;
  if (!detectedNeed && besoin) {
    const b = besoin.toLowerCase();
    if (b.includes("machine") || b.includes("équipement") || b.includes("equipement") || b.includes("moulin")) {
      detectedNeed = "equipement_cafe";
    } else if (b.includes("grain") || b.includes("café") || b.includes("cafe") || b.includes("capsule")) {
      detectedNeed = "achat_cafe";
    }
  }

  const supabase = getSupabaseAdmin();
  const updateData: Record<string, any> = {
    fiche_besoin: besoin || "Non précisé",
    fiche_budget: budget || null,
    fiche_dispo: dispo || null,
    fiche_notes: notes || "—",
    fiche_interet: interet || "tiede",
    fiche_qualifie_par: user.name,
    commercial,
    commercial_id: commercial_id || null,
    assigned_commercial_id: commercial_id || null,
    stage: "nouveau", // Qualifié et poussé dans le pipeline du commercial
  };

  if (detectedNeed) {
    updateData.need_type = detectedNeed;
  }

  const { error } = await supabase
    .from("leads")
    .update(updateData)
    .eq("id", params.id);

  if (error) {
    console.error("Error updating lead fiche:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
