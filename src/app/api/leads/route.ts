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

  // Commercial : uniquement ses leads attribués dans sa marque et pré-qualifiés (hors 'a_qualifier')
  if (user.role === "commercial") {
    query = query.or(
      `commercial.eq.${user.name},commercial_id.eq.${user.id},assigned_commercial_id.eq.${user.id}`
    );
    query = query.neq("stage", "a_qualifier");
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

  const leads = leadList.map((l: any) => ({
    ...l,
    client: l.client || l.name || "Prospect",
    tel: l.tel || l.phone || "",
    valeur: l.valeur !== undefined ? Number(l.valeur) : (l.budget !== undefined ? Number(l.budget) : 0),
    stage: l.stage || l.status || "nouveau",
    need_type: l.need_type || l.need || "achat_cafe",
    meta_note: l.meta_note || l.notes || "",
    messages: msgsByLead[l.id] || [],
  }));

  return NextResponse.json({ leads });
}

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const client = String(body.client || body.name || "").trim();
  const brand = body.brand || (user.brand !== "all" ? user.brand : "lv");
  const stage = body.stage || body.status || (user.role === "centre_appel" ? "a_qualifier" : "nouveau");
  const valeur = Number(body.valeur !== undefined ? body.valeur : body.budget) || 0;
  const tel = body.tel || body.phone ? String(body.tel || body.phone).trim() : null;
  const need_type = body.need_type || body.need || "achat_cafe";
  const client_id = body.client_id || null;
  const date_label = body.date_label || "Aujourd'hui";
  const source = body.source || "manuel";
  let meta_note = body.meta_note || body.notes ? String(body.meta_note || body.notes).trim() : null;

  let commercial = body.commercial || null;
  let commercial_id = body.commercial_id || null;

  if (user.role === "commercial") {
    commercial = user.name;
    commercial_id = user.id;
  }

  if (!client) {
    return NextResponse.json({ error: "Le nom du prospect est obligatoire." }, { status: 400 });
  }

  // Si un email est fourni, on le conserve en toute sécurité dans meta_note
  if (body.email) {
    const emailStr = String(body.email).trim();
    meta_note = meta_note ? `Email: ${emailStr} · ${meta_note}` : `Email: ${emailStr}`;
  }

  const id = body.id || "lead-" + Date.now().toString(36);
  const supabase = getSupabaseAdmin();

  // Payload standard avec uniquement les colonnes garanties
  const insertPayload: Record<string, any> = {
    id,
    client,
    brand,
    stage,
    valeur,
  };

  if (tel) insertPayload.tel = tel;
  if (need_type) insertPayload.need_type = need_type;
  if (commercial) insertPayload.commercial = commercial;
  if (commercial_id) {
    insertPayload.commercial_id = commercial_id;
    insertPayload.assigned_commercial_id = commercial_id;
  }
  if (client_id) insertPayload.client_id = client_id;
  if (date_label) insertPayload.date_label = date_label;
  if (source) insertPayload.source = source;
  if (meta_note) insertPayload.meta_note = meta_note;

  // Mécanisme d'insertion robuste avec auto-ajustement de schéma
  let payloadToTry = { ...insertPayload };
  let lastError: any = null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const { error } = await supabase.from("leads").insert(payloadToTry);
    if (!error) {
      return NextResponse.json({ ok: true, id }, { status: 201 });
    }

    lastError = error;
    const msg = error.message || "";
    console.warn(`[Leads Insert Attempt ${attempt + 1}] Warning:`, msg);

    // 1. Si PostgREST signale une colonne absente du cache de schéma
    const match = msg.match(/Could not find the '([^']+)' column/i);
    if (match && match[1]) {
      const badCol = match[1];
      delete payloadToTry[badCol];
      continue;
    }

    // 2. Si le schéma utilise les variantes de noms (name, phone, budget, need, status, notes)
    if (msg.includes("column") && (msg.includes("does not exist") || msg.includes("schema cache"))) {
      if (payloadToTry.client) {
        payloadToTry.name = payloadToTry.client;
        delete payloadToTry.client;
      }
      if (payloadToTry.tel) {
        payloadToTry.phone = payloadToTry.tel;
        delete payloadToTry.tel;
      }
      if (payloadToTry.stage) {
        payloadToTry.status = payloadToTry.stage;
        delete payloadToTry.stage;
      }
      if (payloadToTry.valeur !== undefined) {
        payloadToTry.budget = payloadToTry.valeur;
        delete payloadToTry.valeur;
      }
      if (payloadToTry.need_type) {
        payloadToTry.need = payloadToTry.need_type;
        delete payloadToTry.need_type;
      }
      if (payloadToTry.meta_note) {
        payloadToTry.notes = payloadToTry.meta_note;
        delete payloadToTry.meta_note;
      }
      continue;
    }

    break;
  }

  console.error("Error creating lead after schema reconciliation:", lastError);
  return NextResponse.json(
    { error: lastError?.message || "Erreur lors de la création du lead." },
    { status: 500 }
  );
}
