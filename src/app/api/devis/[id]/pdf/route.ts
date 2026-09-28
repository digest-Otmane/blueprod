import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getUserFromRequest, unauthorized, forbidden } from "@/lib/auth";
import { generateDocumentPdf } from "@/lib/pdf/generateDocumentPdf";
import { generateHtmlDocument } from "@/lib/pdf/htmlDocTemplate";
import { DocumentPdfData, DocumentItem } from "@/lib/pdf/types";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorized();

  // Centre d'Appel RBAC check
  if (user.role === "centre_appel") {
    return forbidden("Accès interdit : Le Centre d'Appel n'a pas accès aux devis.");
  }

  const supabase = getSupabaseAdmin();

  // 1. Récupérer le devis
  const { data: devis, error: devisErr } = await supabase
    .from("devis")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (devisErr || !devis) {
    return NextResponse.json({ error: "Devis introuvable." }, { status: 404 });
  }

  // RBAC Commercial
  if (user.role === "commercial") {
    if (devis.brand && devis.brand !== user.brand) {
      return forbidden("Non autorisé pour cette marque.");
    }
    const isOwner =
      devis.commercial_id === user.id || devis.commercial === user.name;
    if (!isOwner) {
      return forbidden("Ce devis ne fait pas partie de votre portefeuille.");
    }
  }

  // 2. Récupérer les informations du client
  let clientDetails: any = null;
  if (devis.client_id) {
    const { data: client } = await supabase
      .from("clients")
      .select("id, nom, ville, secteur, contact, tel, email")
      .eq("id", devis.client_id)
      .maybeSingle();
    clientDetails = client || null;
  } else if (devis.client) {
    const { data: client } = await supabase
      .from("clients")
      .select("id, nom, ville, secteur, contact, tel, email")
      .eq("nom", devis.client)
      .maybeSingle();
    clientDetails = client || null;
  }

  // 3. Récupérer les articles détaillés du devis
  const { data: items } = await supabase
    .from("devis_items")
    .select("*")
    .eq("devis_id", params.id)
    .order("id", { ascending: true });

  let effectiveItems: DocumentItem[] = [];
  if (items && items.length > 0) {
    effectiveItems = items.map((it) => ({
      id: it.id,
      product_name: it.product_name,
      product_type: it.product_type,
      quantity: Number(it.quantity) || 1,
      unit_price: Number(it.unit_price) || 0,
      total_amount: Number(it.total_amount) || 0,
    }));
  } else if (devis.commande_id) {
    // Si lié à une commande, récupérer les détails de la commande
    const { data: commande } = await supabase
      .from("commandes")
      .select("produits, montant, need_type")
      .eq("id", devis.commande_id)
      .maybeSingle();

    if (commande && commande.produits) {
      effectiveItems = [
        {
          product_name: commande.produits,
          product_type: commande.need_type || "achat_cafe",
          quantity: 1,
          unit_price: Math.round(Number(devis.montant || commande.montant || 0) / 1.2),
          total_amount: Math.round(Number(devis.montant || commande.montant || 0) / 1.2),
        },
      ];
    }
  }

  const pdfData: DocumentPdfData = {
    type: "devis",
    id: devis.id,
    client: devis.client,
    client_id: devis.client_id,
    brand: devis.brand || "lv",
    montant: Number(devis.montant) || 0,
    statut: devis.statut || "brouillon",
    commercial: devis.commercial,
    commercial_id: devis.commercial_id,
    date_label: devis.date_label,
    created_at: devis.created_at,
    notes: devis.notes,
    commande_id: devis.commande_id,
    client_details: clientDetails,
    items: effectiveItems,
  };

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");
  const isDownload = searchParams.get("download") === "1";

  if (format === "html") {
    const html = generateHtmlDocument(pdfData);
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  }

  // Générer le PDF binaire 100% autonome
  const pdfBuffer = generateDocumentPdf(pdfData);
  const filename = `Devis_${devis.id}.pdf`;
  const disposition = isDownload ? "attachment" : "inline";

  return new NextResponse(new Uint8Array(pdfBuffer) as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${filename}"`,
      "Content-Length": String(pdfBuffer.length),
      "Cache-Control": "private, max-age=0, must-revalidate",
    },
  });
}
