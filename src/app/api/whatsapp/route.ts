import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

/**
 * Normalise un numéro de téléphone marocain pour la recherche (enlève espaces, indicatif +212 -> 06/07 etc.)
 */
function normalizePhoneNumber(rawPhone?: string | null): string {
  if (!rawPhone) return "";
  let cleaned = rawPhone.replace(/\D/g, "");
  // Si commence par 212 (ex: 212612345678), transformer aussi en format local 0612345678
  if (cleaned.startsWith("212")) {
    cleaned = "0" + cleaned.slice(3);
  }
  return cleaned;
}

// 1. Handshake de vérification Meta WhatsApp Cloud API
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken =
    process.env.WHATSAPP_VERIFY_TOKEN ||
    process.env.META_VERIFY_TOKEN ||
    "alea_food_whatsapp_verify_token_2026";

  if (mode === "subscribe" && token === expectedToken) {
    console.log("✅ WhatsApp Webhook challenge vérifié avec succès.");
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  console.warn("❌ Échec de la vérification WhatsApp Webhook : jeton invalide.");
  return NextResponse.json({ error: "Jeton de vérification WhatsApp invalide." }, { status: 403 });
}

// 2. Traitement des messages entrants et mises à jour de statut WhatsApp Business API
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const supabase = getSupabaseAdmin();

    const entries = body.entry || [];
    for (const entry of entries) {
      const changes = entry.changes || [];
      for (const change of changes) {
        const val = change.value;
        if (!val) continue;

        // Traitement des statuts de délivrance (sent, delivered, read, failed)
        if (Array.isArray(val.statuses)) {
          for (const statusObj of val.statuses) {
            const recipientPhone = statusObj.recipient_id;
            const newStatus = statusObj.status; // 'sent' | 'delivered' | 'read' | 'failed'
            if (recipientPhone && newStatus) {
              const norm = normalizePhoneNumber(recipientPhone);
              await supabase
                .from("lead_messages")
                .update({ status: newStatus })
                .ilike("phone", `%${norm.slice(-9)}`);
            }
          }
        }

        // Traitement des messages reçus d'un prospect / client
        if (Array.isArray(val.messages)) {
          for (const msg of val.messages) {
            const fromNumber = msg.from; // Ex: "212615224061"
            const waMsgId = msg.id;
            const msgType = msg.type;
            let messageText = "";

            if (msgType === "text") {
              messageText = msg.text?.body || "";
            } else if (msgType === "button") {
              messageText = msg.button?.text || "[Bouton cliqué]";
            } else if (msgType === "interactive") {
              messageText =
                msg.interactive?.button_reply?.title ||
                msg.interactive?.list_reply?.title ||
                "[Réponse interactive]";
            } else {
              messageText = `[Message média : ${msgType}]`;
            }

            if (!fromNumber) continue;

            const normalizedSender = normalizePhoneNumber(fromNumber);

            // Rechercher un lead existant par numéro de téléphone
            const { data: matchedLeads } = await supabase
              .from("leads")
              .select("id, client, tel, brand")
              .not("tel", "is", null);

            let lead = (matchedLeads || []).find((l) => {
              const normTel = normalizePhoneNumber(l.tel);
              return normTel && (normTel === normalizedSender || normTel.endsWith(normalizedSender.slice(-9)));
            });

            let leadId = lead ? lead.id : null;

            // Si le lead n'existe pas encore, le créer automatiquement et l'insérer dans la file du Centre d'Appel
            if (!leadId) {
              leadId = `lead-wa-${Date.now().toString(36)}`;
              const formattedTel = fromNumber.startsWith("+") ? fromNumber : `+${fromNumber}`;
              await supabase.from("leads").insert({
                id: leadId,
                client: `Prospect WhatsApp (${formattedTel})`,
                brand: "lv",
                stage: "a_qualifier", // File d'attente Centre d'Appel
                source: "whatsapp",
                tel: formattedTel,
                valeur: 0,
                date_label: "À l'instant",
                meta_note: "Contact entrant direct WhatsApp Business",
              });
            }

            // Enregistrer le message entrant dans l'historique du lead
            await supabase.from("lead_messages").insert({
              lead_id: leadId,
              from_side: "eux",
              direction: "inbound",
              phone: fromNumber,
              text: messageText,
              message: messageText,
              status: "received",
            });
          }
        }
      }
    }

    return NextResponse.json({ ok: true, status: "processed" });
  } catch (err: any) {
    console.error("WhatsApp Webhook error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
