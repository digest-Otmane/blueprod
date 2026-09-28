import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getUserFromRequest, unauthorized, forbidden } from "@/lib/auth";
import { isDevisEditable } from "@/lib/rbac";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorized();
  if (user.role === "centre_appel") return forbidden("Accès interdit.");

  const supabase = getSupabaseAdmin();
  const { data: devis, error: devisErr } = await supabase
    .from("devis")
    .select("commercial, commercial_id, brand")
    .eq("id", params.id)
    .maybeSingle();

  if (devisErr || !devis) {
    return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });
  }

  if (user.role === "commercial") {
    if (devis.brand !== user.brand) return forbidden("Non autorisé.");
    if (devis.commercial_id !== user.id && devis.commercial !== user.name) {
      return forbidden("Non autorisé.");
    }
  }

  const { data: items, error: itemsErr } = await supabase
    .from("devis_items")
    .select("*")
    .eq("devis_id", params.id)
    .order("id", { ascending: true });

  if (itemsErr) {
    return NextResponse.json({ error: itemsErr.message }, { status: 500 });
  }

  return NextResponse.json({ items: items || [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorized();
  if (user.role === "centre_appel") return forbidden("Accès interdit.");

  const supabase = getSupabaseAdmin();
  const { data: devis, error: devisErr } = await supabase
    .from("devis")
    .select("id, statut, commercial, commercial_id, brand, montant")
    .eq("id", params.id)
    .maybeSingle();

  if (devisErr || !devis) {
    return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });
  }

  if (user.role === "commercial") {
    if (devis.brand !== user.brand) return forbidden("Non autorisé.");
    if (devis.commercial_id !== user.id && devis.commercial !== user.name) {
      return forbidden("Non autorisé.");
    }
  }

  // Règle d'or : Devis modifiable uniquement en statut brouillon
  if (!isDevisEditable(devis.statut)) {
    return NextResponse.json(
      {
        error: `Impossible d'ajouter des articles : le devis est au statut '${devis.statut}'. Seuls les devis en 'brouillon' sont éditables.`,
      },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const product_type = body.product_type || "achat_cafe";
  const product_name = String(body.product_name || "").trim();
  const quantity = Number(body.quantity) || 1;
  const unit_price = Number(body.unit_price) || 0;
  const total_amount = Number(body.total_amount) || quantity * unit_price;

  if (!product_name) {
    return NextResponse.json({ error: "Le nom du produit est obligatoire." }, { status: 400 });
  }

  const { data: newItem, error: insertErr } = await supabase
    .from("devis_items")
    .insert({
      devis_id: params.id,
      product_type,
      product_name,
      quantity,
      unit_price,
      total_amount,
    })
    .select("*")
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // Mettre à jour le montant total du devis
  const newMontant = Math.round(Number(devis.montant || 0) + total_amount);
  await supabase.from("devis").update({ montant: newMontant }).eq("id", params.id);

  return NextResponse.json({ ok: true, item: newItem, total_devis: newMontant }, { status: 201 });
}
