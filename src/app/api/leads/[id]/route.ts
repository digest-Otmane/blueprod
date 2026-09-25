import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getUserFromRequest, unauthorized, forbidden } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorized();

  const supabase = getSupabaseAdmin();
  const { data: lead, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !lead) {
    return NextResponse.json({ error: "Lead introuvable." }, { status: 404 });
  }

  if (user.role === "commercial" && lead.commercial !== user.name && lead.commercial_id !== user.id) {
    return forbidden("Accès non autorisé.");
  }

  const { data: msgRows } = await supabase
    .from("lead_messages")
    .select("from_side, text, created_at")
    .eq("lead_id", params.id)
    .order("id", { ascending: true });

  return NextResponse.json({
    lead: {
      ...lead,
      messages: (msgRows || []).map((m) => ({ from: m.from_side, text: m.text, created_at: m.created_at })),
    },
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden("Réservé à l'administrateur.");

  const body = await request.json().catch(() => ({}));
  const fields = ["client", "client_id", "brand", "valeur", "stage", "commercial", "commercial_id", "tel", "date_label", "meta_note"];
  const updates: Record<string, any> = {};

  for (const f of fields) {
    if (body[f] !== undefined) {
      updates[f] = body[f];
    }
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "Aucun champ à modifier." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("leads")
    .update(updates)
    .eq("id", params.id);

  if (error) {
    console.error("Error updating lead:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden("Réservé à l'administrateur.");

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("leads")
    .delete()
    .eq("id", params.id);

  if (error) {
    console.error("Error deleting lead:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
