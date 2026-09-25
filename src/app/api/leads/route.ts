import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getUserFromRequest, unauthorized } from "@/lib/auth";
import { effectiveBrand } from "@/lib/scope";

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const queryBrand = searchParams.get("brand");
  const brand = effectiveBrand(user, queryBrand);

  const supabase = getSupabaseAdmin();
  let query = supabase.from("leads").select("*");

  if (brand) {
    query = query.eq("brand", brand);
  }

  if (user.role === "commercial") {
    query = query.or(`commercial.eq.${user.name},commercial_id.eq.${user.id}`);
  }

  query = query.order("created_at", { ascending: false });

  const { data: rows, error } = await query;
  if (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const leadList = rows || [];
  const msgsByLead: Record<string, any[]> = {};

  if (leadList.length > 0) {
    const leadIds = leadList.map((r) => r.id);
    const { data: msgRows, error: msgError } = await supabase
      .from("lead_messages")
      .select("lead_id, from_side, text, created_at")
      .in("lead_id", leadIds)
      .order("id", { ascending: true });

    if (!msgError && msgRows) {
      msgRows.forEach((m) => {
        if (!msgsByLead[m.lead_id]) msgsByLead[m.lead_id] = [];
        msgsByLead[m.lead_id].push({ from: m.from_side, text: m.text, created_at: m.created_at });
      });
    }
  }

  const leads = leadList.map((l) => ({
    ...l,
    messages: msgsByLead[l.id] || [],
  }));

  return NextResponse.json({ leads });
}

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const client = String(body.client || "").trim();
  const brand = body.brand || (user.brand !== "all" ? user.brand : "lv");
  const stage = body.stage || (user.role === "centre_appel" ? "a_qualifier" : "nouveau");
  const commercial = user.role === "commercial" ? user.name : body.commercial || null;
  const commercial_id = user.role === "commercial" ? user.id : body.commercial_id || null;
  const valeur = Number(body.valeur) || 0;
  const tel = body.tel || null;
  const client_id = body.client_id || null;
  const date_label = body.date_label || "Aujourd'hui";
  const source = body.source || "manuel";
  const meta_note = body.meta_note || null;

  if (!client) {
    return NextResponse.json({ error: "Le nom du prospect est obligatoire." }, { status: 400 });
  }

  const id = body.id || "lead-" + Date.now().toString(36);
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("leads").insert({
    id,
    client,
    client_id,
    brand,
    stage,
    commercial,
    commercial_id,
    valeur,
    tel,
    date_label,
    source,
    meta_note,
  });

  if (error) {
    console.error("Error creating lead:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id }, { status: 201 });
}
