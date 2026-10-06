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

  if (user.role === "commercial") {
    const isAssigned =
      lead.commercial === user.name ||
      lead.commercial_id === user.id ||
      lead.assigned_commercial_id === user.id;

    if (!isAssigned || (lead.brand && lead.brand !== user.brand)) {
      return forbidden("Accès non autorisé à ce lead.");
    }
  }

  const { data: msgRows } = await supabase
    .from("lead_messages")
    .select("id, from_side, direction, phone, text, message, status, created_at")
    .eq("lead_id", params.id)
    .order("id", { ascending: true });

  return NextResponse.json({
    lead: {
      ...lead,
      messages: (msgRows || []).map((m) => ({
        id: m.id,
        from: m.from_side === "eux" || m.direction === "inbound" ? "eux" : "moi",
        from_side: m.from_side || "moi",
        direction: m.direction || (m.from_side === "eux" ? "inbound" : "outbound"),
        phone: m.phone,
        text: m.text || m.message || "",
        status: m.status || "sent",
        created_at: m.created_at,
      })),
    },
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorized();

  const supabase = getSupabaseAdmin();
  const { data: current, error: fetchErr } = await supabase
    .from("leads")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (fetchErr || !current) {
    return NextResponse.json({ error: "Lead introuvable." }, { status: 404 });
  }

  // Vérification des droits d'accès
  if (user.role === "commercial") {
    const isAssigned =
      current.commercial === user.name ||
      current.commercial_id === user.id ||
      current.assigned_commercial_id === user.id;

    if (!isAssigned || current.brand !== user.brand) {
      return forbidden("Accès refusé : Ce lead ne vous est pas attribué.");
    }
  }

  const body = await request.json().catch(() => ({}));
  const fields = [
    "client",
    "client_id",
    "brand",
    "valeur",
    "stage",
    "commercial",
    "commercial_id",
    "assigned_commercial_id",
    "tel",
    "need_type",
    "date_label",
    "meta_note",
  ];
  const updates: Record<string, any> = {};

  for (const f of fields) {
    if (body[f] !== undefined) {
      updates[f] = body[f];
    }
  }

  // Si un email est transmis, l'ajouter aux notes si nécessaire
  if (body.email && !updates.meta_note) {
    updates.meta_note = current.meta_note ? `Email: ${body.email} · ${current.meta_note}` : `Email: ${body.email}`;
  }

  // Sécurité : Un commercial ne peut pas changer la marque ou se réattribuer à quelqu'un d'autre
  if (user.role === "commercial") {
    delete updates.brand;
    delete updates.commercial;
    delete updates.commercial_id;
    delete updates.assigned_commercial_id;
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "Aucun champ à modifier." }, { status: 400 });
  }

  const { error: updateErr } = await supabase
    .from("leads")
    .update(updates)
    .eq("id", params.id);

  if (updateErr) {
    console.error("Error updating lead:", updateErr);
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
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
