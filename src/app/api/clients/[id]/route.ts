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
  const { data: client, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (error || !client) {
    return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
  }

  if (user.role === "commercial") {
    const isAssigned = client.commercial === user.name || client.commercial_id === user.id;
    if (!isAssigned) {
      return forbidden("Accès non autorisé à ce client.");
    }
  }

  return NextResponse.json({ client: { ...client, brands: (client.brands || "").split(",") } });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorized();

  const supabase = getSupabaseAdmin();
  const { data: current, error: fetchErr } = await supabase
    .from("clients")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (fetchErr || !current) {
    return NextResponse.json({ error: "Client introuvable." }, { status: 404 });
  }

  // Commercial : vérification stricte qu'il s'agit bien de son client
  if (user.role === "commercial") {
    const isAssigned = current.commercial === user.name || current.commercial_id === user.id;
    if (!isAssigned) {
      return forbidden("Accès refusé : Ce client n'appartient pas à votre portefeuille.");
    }
  } else if (user.role !== "admin") {
    return forbidden("Action non autorisée.");
  }

  const body = await request.json().catch(() => ({}));
  const fields = ["nom", "ville", "secteur", "brands", "contact", "tel", "email", "commercial", "commercial_id", "need_type", "notes"];
  const updates: Record<string, any> = {};

  for (const f of fields) {
    if (body[f] !== undefined) {
      updates[f] = f === "brands" && Array.isArray(body[f]) ? body[f].join(",") : body[f];
    }
  }

  // Empêcher un commercial de transférer un client à un autre sans autorisation admin
  if (user.role === "commercial") {
    delete updates.commercial;
    delete updates.commercial_id;
  }

  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "Aucun champ à modifier." }, { status: 400 });
  }

  const { error: updateErr } = await supabase
    .from("clients")
    .update(updates)
    .eq("id", params.id);

  if (updateErr) {
    console.error("Error updating client:", updateErr);
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
    .from("clients")
    .delete()
    .eq("id", params.id);

  if (error) {
    console.error("Error deleting client:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
