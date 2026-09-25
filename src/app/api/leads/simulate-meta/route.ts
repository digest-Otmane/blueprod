import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getUserFromRequest, unauthorized, forbidden } from "@/lib/auth";

const META_LEAD_POOL = [
  { client: "Café Le Phare", brand: "lv" as const, tel: "+212 6 15 22 40 61", platform: "facebook" as const, note: "Formulaire \"Devis rapide\" — café en grains pour restaurant" },
  { client: "Salon de Thé Ambre", brand: "lvt" as const, tel: "+212 6 44 90 12 38", platform: "instagram" as const, note: "Pub Instagram — demande d'infos machine espresso" },
  { client: "Pizzeria Bella Casa", brand: "lv" as const, tel: "+212 6 77 08 55 19", platform: "facebook" as const, note: "Formulaire \"Contact\" — capsules et sirops" },
  { client: "Rooftop Sky Lounge", brand: "lvt" as const, tel: "+212 6 22 61 40 77", platform: "instagram" as const, note: "Pub Instagram — équipement terrasse + café" },
];

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorized();
  if (user.role !== "admin" && user.role !== "centre_appel") {
    return forbidden("Non autorisé.");
  }

  const tpl = META_LEAD_POOL[Math.floor(Math.random() * META_LEAD_POOL.length)];
  const id = "meta-" + Date.now().toString(36) + Math.floor(Math.random() * 1000);

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("leads").insert({
    id,
    client: tpl.client,
    brand: tpl.brand,
    stage: "a_qualifier",
    commercial: null,
    commercial_id: null,
    valeur: 0,
    tel: tpl.tel,
    date_label: "à l'instant",
    source: tpl.platform,
    meta_note: tpl.note,
  });

  if (error) {
    console.error("Error creating simulated meta lead:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id }, { status: 201 });
}
