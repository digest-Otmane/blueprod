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
    return forbidden("Accès interdit : Le Centre d'Appel n'a pas accès aux factures.");
  }

  const supabase = getSupabaseAdmin();

  // 1. Récupérer la facture
  const { data: facture, error: factureErr } = await supabase
    .from("factures")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (factureErr || !facture) {
    return NextResponse.json({ error: "Facture introuvable." }, { status: 404 });
  }

  // RBAC Commercial
  if (user.role === "commercial") {
    if (facture.brand && facture.brand !== user.brand) {
      return forbidden("Non autorisé pour cette marque.");
    }
    const isOwner =
      facture.commercial_id === user.id || facture.commercial === user.name;
    if (!isOwner) {
      return forbidden("Cette facture ne fait pas partie de votre portefeuille.");
    }
  }

  // 2. Récupérer les informations du client
  let clientDetails: any = null;
  if (facture.client_id) {
    const { data: client } = await supabase
      .from("clients")
      .select("id, nom, ville, secteur, contact, tel, email")
      .eq("id", facture.client_id)
      .maybeSingle();
    clientDetails = client || null;
  } else if (facture.client) {
    const { data: client } = await supabase
      .from("clients")
      .select("id, nom, ville, secteur, contact, tel, email")
      .eq("nom", facture.client)
      .maybeSingle();
    clientDetails = client || null;
  }

  // 3. Récupérer les articles détaillés de la facture
  const { data: items } = await supabase
    .from("facture_items")
    .select("*")
    .eq("facture_id", params.id)
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
  } else if (facture.devis_id) {
    // Si pas d'articles directs, tenter de récupérer depuis le devis d'origine
    const { data: devisItems } = await supabase
      .from("devis_items")
      .select("*")
      .eq("devis_id", facture.devis_id)
      .order("id", { ascending: true });

    if (devisItems && devisItems.length > 0) {
      effectiveItems = devisItems.map((it) => ({
        id: it.id,
        product_name: it.product_name,
        product_type: it.product_type,
        quantity: Number(it.quantity) || 1,
        unit_price: Number(it.unit_price) || 0,
        total_amount: Number(it.total_amount) || 0,
      }));
    }
  }

  if (effectiveItems.length === 0 && facture.commande_id) {
    // Si lié à une commande, récupérer les détails de la commande
    const { data: commande } = await supabase
      .from("commandes")
      .select("produits, montant, need_type")
      .eq("id", facture.commande_id)
      .maybeSingle();

    if (commande && commande.produits) {
      effectiveItems = [
        {
          product_name: commande.produits,
          product_type: commande.need_type || "achat_cafe",
          quantity: 1,
          unit_price: Math.round(Number(facture.montant || commande.montant || 0) / 1.2),
          total_amount: Math.round(Number(facture.montant || commande.montant || 0) / 1.2),
        },
      ];
    }
  }

  const pdfData: DocumentPdfData = {
    type: "facture",
    id: facture.id,
    client: facture.client,
    client_id: facture.client_id,
    brand: facture.brand || "lv",
    montant: Number(facture.montant) || 0,
    statut: facture.statut || "emise",
    commercial: facture.commercial,
    commercial_id: facture.commercial_id,
    date_label: facture.date_label,
    created_at: facture.created_at,
    echeance: facture.echeance,
    due_date: facture.due_date,
    paid_at: facture.paid_at,
    commande_id: facture.commande_id,
    devis_id: facture.devis_id,
    client_details: clientDetails,
    items: effectiveItems,
  };

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format");

  // Fallback binaire si explicitement demandé avec format=raw_pdf
  if (format === "raw_pdf") {
    try {
      const pdfBuffer = generateDocumentPdf(pdfData);
      const filename = `Facture_${facture.id}.pdf`;
      return new NextResponse(new Uint8Array(pdfBuffer) as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Content-Length": String(pdfBuffer.length),
          "Accept-Ranges": "bytes",
          "Cache-Control": "private, no-cache, no-store, must-revalidate",
        },
      });
    } catch (pdfErr) {
      console.error("Error generating raw PDF for facture:", pdfErr);
      return NextResponse.json(
        { error: "Échec de génération du document PDF." },
        { status: 500 }
      );
    }
  }

  // Vue HTML optimisée pour l'aperçu et l'impression native du navigateur
  try {
    const html = generateHtmlDocument(pdfData);
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-cache, no-store, must-revalidate",
      },
    });
  } catch (htmlErr) {
    console.error("Error generating HTML preview for facture:", htmlErr);
    return NextResponse.json(
      { error: "Échec de génération de l'aperçu du document." },
      { status: 500 }
    );
  }
}
