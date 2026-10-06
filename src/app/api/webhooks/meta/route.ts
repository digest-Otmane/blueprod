import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * Endpoint sécurisé pour recevoir les leads Facebook / Instagram Ads (Meta Lead Ads).
 * Gère le handshake GET de vérification Meta et l'ingestion POST des leads entrants.
 */

// 1. Handshake de vérification Meta Webhook
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken =
    process.env.META_VERIFY_TOKEN ||
    process.env.META_WEBHOOK_VERIFY_TOKEN ||
    "alea_food_meta_secret_verify_token_2026";

  if (mode === "subscribe" && token === expectedToken) {
    console.log("✅ Meta Webhook challenge vérifié avec succès.");
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  console.warn("❌ Échec du handshake Meta Webhook : token non valide.");
  return NextResponse.json({ error: "Jeton de vérification Meta invalide." }, { status: 403 });
}

// 2. Ingestion des leads entrants Meta
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const appSecret = process.env.META_APP_SECRET;

    // Vérification de la signature HMAC-SHA256 si configurée en production
    if (appSecret) {
      const signatureHeader = request.headers.get("x-hub-signature-256");
      if (!signatureHeader) {
        return NextResponse.json({ error: "Signature Meta manquante." }, { status: 401 });
      }

      const expectedSignature = `sha256=${crypto
        .createHmac("sha256", appSecret)
        .update(rawBody)
        .digest("hex")}`;

      const isValid = crypto.timingSafeEqual(
        Buffer.from(signatureHeader),
        Buffer.from(expectedSignature)
      );

      if (!isValid) {
        console.warn("❌ Signature Meta invalide reçue.");
        return NextResponse.json({ error: "Signature Meta invalide." }, { status: 401 });
      }
    }

    const payload = rawBody ? JSON.parse(rawBody) : {};

    // Support des tests directs et simulations de payloads
    if (payload.client || payload.full_name) {
      const directLead = await ingestSingleLead({
        client: payload.client || payload.full_name,
        tel: payload.tel || payload.phone_number || payload.phone,
        email: payload.email,
        brand: payload.brand || "lv",
        need_type: payload.need_type || "achat_cafe",
        source: payload.source || payload.platform || "meta",
        meta_note: payload.meta_note || payload.note || "Lead de test injecté",
        meta_lead_id: payload.meta_lead_id || `sim-${Date.now()}`,
      });
      return NextResponse.json({ ok: true, lead_id: directLead.id }, { status: 201 });
    }

    // Traitement du format standard Meta Lead Ads
    const entries = payload.entry || [];
    const createdLeads: string[] = [];

    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field === "leadgen") {
          const leadgen = change.value;
          const leadgenId = leadgen?.leadgen_id;
          const pageId = leadgen?.page_id;
          const formId = leadgen?.form_id;

          let clientName = "Nouveau Prospect Meta";
          let phone: string | null = null;
          let email: string | null = null;
          let brand: "lv" | "lvt" = "lv";
          let needType: "achat_cafe" | "equipement_cafe" | "mixte" = "achat_cafe";
          let noteDetails = `Form ID: ${formId || "N/A"} — Page ID: ${pageId || "N/A"}`;

          // Si un Page Access Token est disponible, interroger la Graph API Meta
          const pageAccessToken = process.env.META_PAGE_ACCESS_TOKEN;
          if (leadgenId && pageAccessToken) {
            try {
              const graphRes = await fetch(
                `https://graph.facebook.com/v19.0/${leadgenId}?access_token=${pageAccessToken}`
              );
              if (graphRes.ok) {
                const leadData = await graphRes.json();
                const fieldData = leadData.field_data || [];

                for (const field of fieldData) {
                  const name = (field.name || "").toLowerCase();
                  const val = Array.isArray(field.values) ? field.values[0] : field.values;

                  if (name.includes("full_name") || name.includes("nom") || name.includes("name")) {
                    clientName = String(val);
                  } else if (name.includes("phone") || name.includes("tel")) {
                    phone = String(val);
                  } else if (name.includes("email") || name.includes("mail")) {
                    email = String(val);
                  } else if (name.includes("brand") || name.includes("marque")) {
                    const b = String(val).toLowerCase();
                    if (b.includes("touch") || b.includes("lvt") || b.includes("equipement")) {
                      brand = "lvt";
                    }
                  } else if (name.includes("besoin") || name.includes("need") || name.includes("produit")) {
                    const n = String(val).toLowerCase();
                    if (n.includes("machine") || n.includes("equipement")) {
                      needType = "equipement_cafe";
                      brand = "lvt";
                    } else if (n.includes("cafe") || n.includes("café") || n.includes("grain")) {
                      needType = "achat_cafe";
                      brand = "lv";
                    }
                    noteDetails += ` | Besoin: ${val}`;
                  }
                }
              }
            } catch (graphErr) {
              console.error("Erreur lors de la récupération du lead Meta Graph API:", graphErr);
            }
          }

          // Déduire la marque depuis la note ou le nom si touch / équipement
          if (noteDetails.toLowerCase().includes("touch") || noteDetails.toLowerCase().includes("machine")) {
            brand = "lvt";
            needType = "equipement_cafe";
          }

          const newLead = await ingestSingleLead({
            client: clientName,
            tel: phone,
            email,
            brand,
            need_type: needType,
            source: entry.id === pageId ? "facebook" : "instagram",
            meta_note: noteDetails,
            meta_lead_id: String(leadgenId || `meta-${Date.now()}`),
          });

          createdLeads.push(newLead.id);
        }
      }
    }

    return NextResponse.json(
      { ok: true, count: createdLeads.length, lead_ids: createdLeads },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Meta Webhook error:", err);
    return NextResponse.json({ error: "Erreur traitement webhook Meta: " + err.message }, { status: 500 });
  }
}

/**
 * Fonction d'ingestion centralisée poussant le lead directement dans la file d'attente
 * du Centre d'Appel (stage: 'a_qualifier').
 */
async function ingestSingleLead(leadData: {
  client: string;
  tel?: string | null;
  email?: string | null;
  brand: "lv" | "lvt";
  need_type: "achat_cafe" | "equipement_cafe" | "mixte";
  source: string;
  meta_note?: string;
  meta_lead_id?: string;
}) {
  const supabase = getSupabaseAdmin();
  const id = `meta-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;

  const metaNoteFormatted = leadData.email
    ? `Email: ${leadData.email}${leadData.meta_note ? " · " + leadData.meta_note : ""}`
    : (leadData.meta_note || "Lead publicitaire Meta entrant");

  // Insertion dans leads avec stage 'a_qualifier' pour le Centre d'Appel
  const { error: insertErr } = await supabase.from("leads").insert({
    id,
    client: leadData.client,
    brand: leadData.brand,
    stage: "a_qualifier", // Poussé directement dans la file d'attente du Centre d'Appel
    commercial: null,
    commercial_id: null,
    valeur: 0,
    tel: leadData.tel || null,
    need_type: leadData.need_type,
    date_label: "À l'instant",
    source: leadData.source || "meta",
    meta_note: metaNoteFormatted,
  });

  if (insertErr) {
    console.error("Error creating Meta lead in DB:", insertErr);
    throw insertErr;
  }

  // Historique initial dans les messages WhatsApp / contact
  const metaText = `Lead généré automatiquement via campagne Meta (${leadData.source}). En attente de qualification par le Centre d'Appel.`;
  await supabase.from("lead_messages").insert({
    lead_id: id,
    from_side: "eux",
    direction: "inbound",
    phone: leadData.tel || null,
    text: metaText,
    message: metaText,
    status: "received",
  });

  return { id };
}
