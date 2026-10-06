import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getUserFromRequest, unauthorized, forbidden } from "@/lib/auth";

export async function POST(
  request: NextRequest,
  { params }: { params: { devisId: string } }
) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorized();
  if (user.role === "centre_appel") return forbidden("Accès interdit au Centre d'Appel.");

  const supabase = getSupabaseAdmin();

  // 1. Récupérer le devis d'origine
  const { data: devis, error: devisErr } = await supabase
    .from("devis")
    .select("*")
    .eq("id", params.devisId)
    .maybeSingle();

  if (devisErr || !devis) {
    return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });
  }

  // 2. Vérification RBAC Commercial
  if (user.role === "commercial") {
    if (devis.brand !== user.brand) return forbidden("Ce devis concerne une autre marque.");
    if (devis.commercial_id !== user.id && devis.commercial !== user.name) {
      return forbidden("Ce devis ne fait pas partie de votre portefeuille.");
    }
  }

  // 3. Statut du devis : doit être 'accepte' pour être facturé
  if (devis.statut !== "accepte") {
    return NextResponse.json(
      { error: "Seul un devis avec le statut 'Accepté' peut être converti en facture." },
      { status: 400 }
    );
  }

  // 4. Calcul de l'échéance par défaut (+30 jours)
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);
  const dateStr = dueDate.toISOString().split("T")[0];
  const factureId = `FAC-${Date.now().toString(36).toUpperCase()}`;

  // 5. Insérer la facture
  const facturePayload = {
    id: factureId,
    client: devis.client,
    client_id: devis.client_id || null,
    brand: devis.brand,
    montant: devis.montant,
    statut: "emise",
    commercial: devis.commercial,
    commercial_id: devis.commercial_id,
    date_label: "Aujourd'hui",
    echeance: dateStr,
  };

  const { error: insertErr } = await supabase.from("factures").insert(facturePayload);

  if (insertErr) {
    console.error("Error creating facture from devis:", insertErr);
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // 6. Copier les articles du devis vers facture_items
  const { data: devisItems } = await supabase
    .from("devis_items")
    .select("*")
    .eq("devis_id", devis.id);

  if (devisItems && devisItems.length > 0) {
    const factureItems = devisItems.map((item: any) => ({
      facture_id: factureId,
      product_name: item.product_name || "Produit standard",
      quantity: Number(item.quantity) || 1,
      unit_price: Number(item.unit_price) || 0,
      total_amount: Number(item.total_amount) || (Number(item.quantity) || 1) * (Number(item.unit_price) || 0),
    }));
    await supabase.from("facture_items").insert(factureItems);
  }

  return NextResponse.json({ ok: true, facture_id: factureId }, { status: 201 });
}
