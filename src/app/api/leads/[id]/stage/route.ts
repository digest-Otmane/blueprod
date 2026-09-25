import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getUserFromRequest, unauthorized, forbidden } from "@/lib/auth";

const ALLOWED_STAGES = ["a_qualifier", "nouveau", "contacte", "qualifie", "converti", "perdu"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const { stage } = body;
  if (!ALLOWED_STAGES.includes(stage)) {
    return NextResponse.json({ error: "Étape invalide." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: lead, error: fetchErr } = await supabase
    .from("leads")
    .select("commercial, commercial_id")
    .eq("id", params.id)
    .maybeSingle();

  if (fetchErr || !lead) {
    return NextResponse.json({ error: "Lead introuvable." }, { status: 404 });
  }

  const isAdmin = user.role === "admin";
  const isCentreAppel = user.role === "centre_appel";

  if (!isAdmin && !isCentreAppel && lead.commercial !== user.name && lead.commercial_id !== user.id) {
    return forbidden("Ce lead ne vous appartient pas.");
  }

  const { error: updateErr } = await supabase
    .from("leads")
    .update({ stage })
    .eq("id", params.id);

  if (updateErr) {
    console.error("Error updating lead stage:", updateErr);
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
