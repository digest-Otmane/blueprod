import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getUserFromRequest, unauthorized, forbidden } from "@/lib/auth";

/**
 * Normalise un numéro de téléphone pour l'API Meta WhatsApp Cloud (format international sans le +)
 * Ex: '06 12 34 56 78' -> '212612345678'
 * Ex: '+212 612-345678' -> '212612345678'
 * Ex: '+33 6 12 34 56 78' -> '33612345678'
 */
function formatWaRecipient(rawPhone: string): string {
  let cleaned = rawPhone.replace(/\D/g, "");
  if (cleaned.startsWith("00")) {
    cleaned = cleaned.slice(2);
  }
  if (cleaned.startsWith("0") && (cleaned.length === 10 || cleaned.length === 9)) {
    cleaned = "212" + cleaned.slice(1);
  }
  return cleaned;
}

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const { lead_id, text } = body;

  if (!lead_id || !text || !String(text).trim()) {
    return NextResponse.json(
      { error: "L'identifiant du lead (lead_id) et le message (text) sont obligatoires." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  // 1. Récupérer le prospect et vérifier les droits d'accès
  const { data: lead, error: leadErr } = await supabase
    .from("leads")
    .select("id, client, tel, brand, commercial, commercial_id, assigned_commercial_id, stage")
    .eq("id", lead_id)
    .maybeSingle();

  if (leadErr || !lead) {
    return NextResponse.json({ error: "Lead introuvable." }, { status: 404 });
  }

  // Règle RBAC :
  // - Admin : accès complet
  // - Centre d'Appel : accès complet (qualification, support WhatsApp)
  // - Commercial : accès limité à ses leads attribués dans sa marque
  if (user.role === "commercial") {
    if (lead.brand && lead.brand !== user.brand) {
      return forbidden("Accès interdit : Lead d'une marque différente de votre affectation.");
    }
    const isAssigned =
      lead.commercial === user.name ||
      lead.commercial_id === user.id ||
      lead.assigned_commercial_id === user.id;

    if (!isAssigned) {
      return forbidden("Accès interdit : Ce lead ne fait pas partie de votre portefeuille.");
    }
  }

  if (!lead.tel || !lead.tel.trim()) {
    return NextResponse.json(
      { error: "Ce prospect n'a pas de numéro de téléphone enregistré pour WhatsApp." },
      { status: 400 }
    );
  }

  const cleanRecipientPhone = formatWaRecipient(lead.tel);
  if (!cleanRecipientPhone) {
    return NextResponse.json(
      { error: "Le numéro de téléphone du prospect est invalide." },
      { status: 400 }
    );
  }

  let waMessageId = `out-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  let dispatchStatus: "sent" | "failed" | "delivered" = "sent";
  let metaErrorMessage: string | null = null;

  // 2. Envoi via Meta WhatsApp Cloud API si les clés sont configurées
  const apiToken =
    process.env.WHATSAPP_ACCESS_TOKEN ||
    process.env.WHATSAPP_API_TOKEN ||
    process.env.META_WA_TOKEN;
  const phoneId =
    process.env.WHATSAPP_PHONE_NUMBER_ID ||
    process.env.META_PHONE_ID;

  if (apiToken && phoneId) {
    try {
      const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: cleanRecipientPhone,
          type: "text",
          text: { preview_url: false, body: text.trim() },
        }),
      });

      if (res.ok) {
        const metaResp = await res.json().catch(() => ({}));
        waMessageId = metaResp.messages?.[0]?.id || waMessageId;
        dispatchStatus = "sent";
      } else {
        const errData = await res.json().catch(() => ({}));
        console.warn("Meta WhatsApp API error response:", JSON.stringify(errData));
        const metaErr = errData?.error;
        const code = metaErr?.code;
        const detail = metaErr?.message || metaErr?.error_user_msg || `Erreur HTTP ${res.status}`;

        if (code === 100) {
          metaErrorMessage = `Erreur Meta WhatsApp (#100) : Paramètre ou identifiant de numéro (Phone ID) invalide.`;
        } else if (code === 190) {
          metaErrorMessage = `Erreur Meta WhatsApp (#190) : Jeton d'accès (Access Token) expiré ou invalide.`;
        } else if (code === 131030) {
          metaErrorMessage = `Erreur Meta WhatsApp (#131030) : Le destinataire (${cleanRecipientPhone}) n'est pas autorisé en mode développement.`;
        } else {
          metaErrorMessage = `Erreur Meta WhatsApp ${code ? `(#${code})` : ""} : ${detail}`;
        }
        dispatchStatus = "failed";
      }
    } catch (e: any) {
      console.warn("Meta WhatsApp network/dispatch exception:", e?.message || e);
      metaErrorMessage = `Erreur de connexion réseau Meta API : ${e?.message || "Impossible de joindre le serveur Meta"}`;
      dispatchStatus = "failed";
    }
  } else {
    metaErrorMessage = "WhatsApp Cloud API non configuré (WHATSAPP_ACCESS_TOKEN ou WHATSAPP_PHONE_NUMBER_ID manquant).";
    dispatchStatus = "failed";
  }

  // 3. Journaliser le message dans l'historique du lead
  const { data: insertedMsg, error: insertErr } = await supabase
    .from("lead_messages")
    .insert({
      lead_id,
      from_side: "moi",
      direction: "outbound",
      phone: lead.tel,
      text: text.trim(),
      message: text.trim(),
      status: dispatchStatus,
    })
    .select("id, created_at, text, from_side, direction, phone, status")
    .single();

  if (insertErr) {
    console.error("Error saving WhatsApp message to DB:", insertErr);
    return NextResponse.json(
      {
        ok: false,
        error: "Erreur d'enregistrement du message : " + insertErr.message,
        meta_error: metaErrorMessage,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: dispatchStatus === "sent",
    message: {
      id: insertedMsg.id,
      lead_id,
      from: "moi",
      from_side: "moi",
      direction: "outbound",
      phone: lead.tel,
      text: text.trim(),
      status: dispatchStatus,
      wa_message_id: waMessageId,
      created_at: insertedMsg.created_at,
    },
    meta_error: metaErrorMessage,
  });
}
