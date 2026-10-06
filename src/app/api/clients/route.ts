import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getUserFromRequest, unauthorized, forbidden } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorized();

  const supabase = getSupabaseAdmin();
  let query = supabase.from("clients").select("*").order("nom");

  // Règle RBAC : Commercial strictement restreint à son portefeuille
  if (user.role === "commercial") {
    query = query.or(`commercial.eq.${user.name},commercial_id.eq.${user.id}`);
  }

  const { data: rows, error } = await query;
  if (error) {
    console.error("Error fetching clients:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const brand = searchParams.get("brand");

  const filtered = (rows || []).filter((c) => {
    const brands = (c.brands || "").split(",");
    if (user.role === "commercial") return brands.includes(user.brand);
    if (user.role === "admin" && brand && ["lv", "lvt"].includes(brand)) return brands.includes(brand);
    return true;
  });

  return NextResponse.json({ clients: filtered });
}

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorized();
  if (user.role !== "admin" && user.role !== "commercial") {
    return forbidden("Non autorisé à créer un client.");
  }

  const body = await request.json().catch(() => ({}));
  const id = body.id || "c" + Date.now().toString(36);
  const nom = String(body.nom || "").trim();
  const ville = body.ville || null;
  const secteur = body.secteur || null;
  const contact = body.contact || null;
  const tel = body.tel || null;
  const email = body.email || null;
  const lead_id = body.lead_id || null;
  const need_type = body.need_type || "achat_cafe";
  const notes = body.notes || null;

  let brands = Array.isArray(body.brands) ? body.brands.join(",") : body.brands;
  let commercial = body.commercial || null;
  let commercial_id = body.commercial_id || null;

  if (user.role === "commercial") {
    commercial = user.name;
    commercial_id = user.id;
    brands = user.brand !== "all" ? user.brand : "lv";
  } else {
    brands = brands || (user.brand !== "all" ? user.brand : "lv,lvt");
  }

  if (!nom) {
    return NextResponse.json({ error: "Le nom du client est obligatoire." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const rawInsert = {
    id,
    nom,
    ville,
    secteur,
    brands,
    contact,
    tel,
    commercial,
    commercial_id,
    lead_id,
    need_type,
  };

  const { error } = await supabase.from("clients").insert(rawInsert);

  if (error) {
    console.error("Error creating client:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Si ce client est créé à partir d'un lead, mettre à jour le lead en converti
  if (lead_id) {
    await supabase.from("leads").update({ client_id: id, stage: "converti" }).eq("id", lead_id);
  }

  return NextResponse.json({ ok: true, id }, { status: 201 });
}
