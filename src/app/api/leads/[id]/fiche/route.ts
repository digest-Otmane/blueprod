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
    return forbidden("Réservé au centre d'appel.");
  }

  const body = await request.json().catch(() => ({}));
  const { besoin, budget, dispo, notes, interet, commercial, commercial_id } = body;
  if (!commercial) {
    return NextResponse.json({ error: "Choisissez le commercial destinataire." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("leads")
    .update({
      fiche_besoin: besoin || "Non précisé",
      fiche_budget: budget || null,
      fiche_dispo: dispo || null,
      fiche_notes: notes || "—",
      fiche_interet: interet || "tiede",
      fiche_qualifie_par: user.name,
      commercial,
      commercial_id: commercial_id || null,
      stage: "nouveau",
    })
    .eq("id", params.id);

  if (error) {
    console.error("Error updating lead fiche:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
