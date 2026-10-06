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

  // Commercial : vérification de l'affectation du lead
  if (user.role === "commercial") {
    const { data: lead, error: leadErr } = await supabase
      .from("leads")
      .select("commercial, commercial_id, assigned_commercial_id, brand")
      .eq("id", params.id)
      .maybeSingle();

    if (leadErr || !lead) {
      return NextResponse.json({ error: "Lead introuvable." }, { status: 404 });
    }

    if (lead.brand !== user.brand) {
      return forbidden("Accès interdit : Lead d'une autre marque.");
    }

    const isAssigned =
      lead.commercial === user.name ||
      lead.commercial_id === user.id ||
      lead.assigned_commercial_id === user.id;

    if (!isAssigned) {
      return forbidden("Accès interdit : Ce lead ne vous est pas assigné.");
    }
  }

  const { data: rows, error } = await supabase
    .from("lead_messages")
    .select("id, lead_id, from_side, direction, phone, text, message, status, created_at")
    .eq("lead_id", params.id)
    .order("id", { ascending: true });

  if (error) {
    console.error("Error fetching lead messages:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    messages: (rows || []).map((r) => ({
      id: r.id,
      lead_id: r.lead_id,
      from: r.from_side === "eux" || r.direction === "inbound" ? "eux" : "moi",
      from_side: r.from_side || "moi",
      direction: r.direction || (r.from_side === "eux" ? "inbound" : "outbound"),
      phone: r.phone,
      text: r.text || r.message || "",
      status: r.status || "sent",
      created_at: r.created_at,
    })),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorized();

  const supabase = getSupabaseAdmin();

  // Vérification des droits sur le lead
  const { data: lead, error: leadErr } = await supabase
    .from("leads")
    .select("commercial, commercial_id, assigned_commercial_id, brand, tel")
    .eq("id", params.id)
    .maybeSingle();

  if (leadErr || !lead) {
    return NextResponse.json({ error: "Lead introuvable." }, { status: 404 });
  }

  if (user.role === "commercial") {
    if (lead.brand !== user.brand) {
      return forbidden("Accès interdit : Lead d'une autre marque.");
    }
    const isAssigned =
      lead.commercial === user.name ||
      lead.commercial_id === user.id ||
      lead.assigned_commercial_id === user.id;

    if (!isAssigned) {
      return forbidden("Accès interdit : Ce lead ne vous est pas assigné.");
    }
  }

  const body = await request.json().catch(() => ({}));
  const text = String(body.text || "").trim();
  const from_side = body.from_side === "eux" ? "eux" : "moi";
  const direction = from_side === "eux" ? "inbound" : "outbound";

  if (!text) {
    return NextResponse.json({ error: "Le contenu du message ne peut pas être vide." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("lead_messages")
    .insert({
      lead_id: params.id,
      from_side,
      direction,
      phone: lead.tel || null,
      text,
      message: text,
      status: "sent",
    })
    .select("id")
    .single();

  if (error) {
    console.error("Error inserting lead message:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data?.id });
}
