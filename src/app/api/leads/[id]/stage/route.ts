import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getUserFromRequest, unauthorized, forbidden } from "@/lib/auth";

const ALLOWED_STAGES = [
  "a_qualifier",
  "nouveau",
  "contacte",
  "qualifie",
  "attribue",
  "converti",
  "perdu",
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const { stage } = body;
  if (!stage || !ALLOWED_STAGES.includes(stage.toLowerCase())) {
    return NextResponse.json({ error: "Étape du pipeline invalide." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: lead, error: fetchErr } = await supabase
    .from("leads")
    .select("commercial, commercial_id, assigned_commercial_id, brand")
    .eq("id", params.id)
    .maybeSingle();

  if (fetchErr || !lead) {
    return NextResponse.json({ error: "Lead introuvable." }, { status: 404 });
  }

  const normalizedStage = stage.toLowerCase();

  // Droits : Admin et Centre d'Appel peuvent qualifier/changer l'étape
  // Commercial : UNIQUEMENT pour les leads qui lui sont assignés et dans sa marque (et ne peut pas rétrograder à 'a_qualifier')
  if (user.role === "commercial") {
    if (normalizedStage === "a_qualifier") {
      return forbidden("Un commercial ne peut pas rétrograder un lead vers l'étape 'À qualifier'.");
    }
    if (lead.brand && lead.brand !== user.brand) {
      return forbidden("Accès non autorisé : Marque différente de votre affectation.");
    }
    const isAssigned =
      lead.commercial === user.name ||
      lead.commercial_id === user.id ||
      lead.assigned_commercial_id === user.id;

    if (!isAssigned) {
      return forbidden("Ce lead ne fait pas partie de votre portefeuille.");
    }
  }

  const { error: updateErr } = await supabase
    .from("leads")
    .update({ stage: normalizedStage })
    .eq("id", params.id);

  if (updateErr) {
    console.error("Error updating lead stage:", updateErr);
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, stage: normalizedStage });
}
