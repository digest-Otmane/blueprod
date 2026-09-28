import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getUserFromRequest, unauthorized, forbidden } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const user = getUserFromRequest(request);
  if (!user) return unauthorized();

  const body = await request.json().catch(() => ({}));
  const { lead_id, text } = body;

  if (!lead_id || !text) {
    return NextResponse.json(
      { error: "L'identifiant du lead (lead_id) et le message (text) sont obligatoires." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();

  // 1. Récupérer le prospect et vérifier les droits d'accès
  const { data: lead, error: leadErr } = await supabase
    .from("leads")
    .select("id, client, tel, brand, commercial, commercial_id, assigned_commercial_id")
    .eq("id", lead_id)
    .maybeSingle();

  if (leadErr || !lead) {
    return NextResponse.json({ error: "Lead introuvable." }, { status: 404 });
  }

  // Règle RBAC : Le commercial ne peut envoyer de message qu'à ses propres leads
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

  if (!lead.tel) {
    return NextResponse.json(
      { error: "Ce lead n'a pas de numéro de téléphone enregistré pour WhatsApp." },
      { status: 400 }
    );
  }

  let waMessageId = `out-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  let dispatchStatus = "sent";

  // 2. Envoi via Meta WhatsApp Cloud API si les clés sont configurées
  const apiToken = process.env.WHATSAPP_API_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (apiToken && phoneId) {
    try {
      const recipientPhone = lead.tel.replace(/\D/g, "");
      const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipientPhone,
          type: "text",
          text: { preview_url: false, body: text.trim() },
        }),
      });

      if (res.ok) {
        const metaResp = await res.json();
        waMessageId = metaResp.messages?.[0]?.id || waMessageId;
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error("Meta WhatsApp dispatch error:", errData);
        dispatchStatus = "failed";
      }
    } catch (e) {
      console.error("Meta WhatsApp network error:", e);
      dispatchStatus = "failed";
    }
  }

  // 3. Journaliser le message dans l'historique du lead
  const { data: insertedMsg, error: insertErr } = await supabase
    .from("lead_messages")
    .insert({
      lead_id,
      from_side: "moi",
      direction: "outbound",
      phone: lead.tel,
      wa_message_id: waMessageId,
      text: text.trim(),
      status: dispatchStatus,
    })
    .select("id, created_at")
    .single();

  if (insertErr) {
    console.error("Error saving WhatsApp message to DB:", insertErr);
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message_id: insertedMsg?.id,
    wa_message_id: waMessageId,
    status: dispatchStatus,
  });
}
