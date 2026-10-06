"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Lead, LeadMessage, User } from "@/types/crm";

interface WaModalProps {
  lead: Lead | null;
  user?: User | null;
  onClose: () => void;
  onSendMessage: (leadId: string, text: string) => Promise<void>;
}

interface QuickTemplate {
  label: string;
  emoji: string;
  getText: (name: string, brand: string) => string;
}

const TEMPLATES: QuickTemplate[] = [
  {
    label: "Prise de contact",
    emoji: "👋",
    getText: (name, brand) =>
      `Bonjour ${name || ""}, je suis du service client ${
        brand === "lvt" ? "La Varenne Touch" : "La Varenne"
      }. J'ai bien reçu votre demande et je me tiens à votre disposition pour vous conseiller !`,
  },
  {
    label: "Catalogue & Offres",
    emoji: "☕",
    getText: (name, brand) =>
      `Bonjour ${name || ""}, suite à votre intérêt pour ${
        brand === "lvt" ? "La Varenne Touch" : "La Varenne"
      }, souhaitez-vous recevoir notre catalogue de cafés de spécialité et nos offres machines ?`,
  },
  {
    label: "Proposition de RDV",
    emoji: "📅",
    getText: (name) =>
      `Bonjour ${name || ""}, quel serait le moment le plus opportun pour un court échange téléphonique afin d'évaluer vos besoins ?`,
  },
  {
    label: "Relance proposition",
    emoji: "🤝",
    getText: (name) =>
      `Bonjour ${name || ""}, avez-vous pu prendre connaissance de notre proposition ? N'hésitez pas si vous avez la moindre question.`,
  },
  {
    label: "Coordonnées / Adresse",
    emoji: "📍",
    getText: (name) =>
      `Bonjour ${name || ""}, pourriez-vous nous confirmer l'adresse de votre établissement ainsi que la ville de livraison souhaitée ?`,
  },
];

const STAGE_LABELS: Record<string, string> = {
  a_qualifier: "À qualifier",
  nouveau: "Nouveau",
  contacte: "Contacté",
  qualifie: "Qualifié",
  attribue: "Attribué",
  converti: "Converti",
  perdu: "Perdu",
};

export const WaModal: React.FC<WaModalProps> = ({
  lead,
  user,
  onClose,
  onSendMessage,
}) => {
  const [messages, setMessages] = useState<LeadMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const threadEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isMountedRef = useRef(true);

  // Synchronisation initiale des messages du lead
  useEffect(() => {
    isMountedRef.current = true;
    if (lead?.messages) {
      setMessages(lead.messages);
    }
    return () => {
      isMountedRef.current = false;
    };
  }, [lead?.id, lead?.messages]);

  // Fonction de rechargement des messages depuis l'API
  const fetchMessages = useCallback(async (isPolling = false) => {
    if (!lead?.id) return;
    if (!isPolling) setLoadingHistory(true);

    try {
      const res = await fetch(`/api/leads/${lead.id}/messages`, {
        credentials: "same-origin",
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.messages && isMountedRef.current) {
        setMessages((prev) => {
          // Évite le re-render inutile si le nombre et le dernier id sont identiques
          if (
            prev.length === data.messages.length &&
            JSON.stringify(prev) === JSON.stringify(data.messages)
          ) {
            return prev;
          }
          return data.messages;
        });
      }
    } catch {
      // Ignore polling errors
    } finally {
      if (!isPolling && isMountedRef.current) {
        setLoadingHistory(false);
      }
    }
  }, [lead?.id]);

  // Chargement à l'ouverture + Polling en temps réel toutes les 4.5s
  useEffect(() => {
    fetchMessages(false);

    const interval = setInterval(() => {
      fetchMessages(true);
    }, 4500);

    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Scroll automatique en bas de discussion
  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  // Échappement clavier pour fermer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!lead) return null;

  const initialsOf = (name: string) =>
    (name || "")
      .split(" ")
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "WA";

  const firstName = (lead.client || "").split(" ")[0] || "";

  const handleCopyPhone = () => {
    if (!lead.tel) return;
    navigator.clipboard.writeText(lead.tel);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApplyTemplate = (tmpl: QuickTemplate) => {
    const text = tmpl.getText(firstName, lead.brand);
    setInputText(text);
    setShowTemplates(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || sending) return;

    if (!lead.tel) {
      setErrorNotice("Ce prospect n'a pas de numéro de téléphone enregistré.");
      return;
    }

    setErrorNotice(null);
    setSending(true);

    const optimisticMsg: LeadMessage = {
      id: Date.now(),
      lead_id: lead.id,
      from: "moi",
      from_side: "moi",
      direction: "outbound",
      phone: lead.tel,
      text,
      status: "sent",
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setInputText("");

    try {
      await onSendMessage(lead.id, text);
      // Recharger pour confirmer la sauvegarde DB et l'id officiel
      setTimeout(() => fetchMessages(true), 600);
    } catch (err: any) {
      setErrorNotice(err.message || "Erreur lors de l'envoi du message WhatsApp.");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Formatage des heures (ex: "14:32")
  const formatMsgTime = (timestamp?: string) => {
    if (!timestamp) return "";
    try {
      const d = new Date(timestamp);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  // Formatage de date groupée
  const formatMsgDate = (timestamp?: string) => {
    if (!timestamp) return "";
    try {
      const d = new Date(timestamp);
      if (isNaN(d.getTime())) return "";
      const today = new Date();
      const isToday =
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear();
      if (isToday) return "Aujourd'hui";
      return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    } catch {
      return "";
    }
  };

  const cleanPhoneForLink = (lead.tel || "").replace(/\D/g, "");
  const waExternalUrl = cleanPhoneForLink
    ? `https://wa.me/${
        cleanPhoneForLink.startsWith("0") && cleanPhoneForLink.length === 10
          ? "212" + cleanPhoneForLink.slice(1)
          : cleanPhoneForLink
      }`
    : null;

  return (
    <div className="wa-overlay" onClick={onClose}>
      <div
        className="wa-modal wa-drawer-enhanced"
        role="dialog"
        aria-modal="true"
        aria-labelledby="wa-chat-lead-name"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER DE LA CONVERSATION */}
        <div className="wa-modal-head wa-chat-head">
          <div className="wa-avatar-wrap">
            <div className="wa-avatar">{initialsOf(lead.client)}</div>
            <span className="wa-online-dot" title="Canal WhatsApp actif" />
          </div>

          <div className="wa-head-info">
            <div className="wa-head-title-row">
              <span id="wa-chat-lead-name" className="who">
                {lead.client}
              </span>
              <span className={`badge ${lead.brand === "lv" ? "brand-lv" : "brand-lvt"}`}>
                {lead.brand === "lv" ? "La Varenne" : "Touch"}
              </span>
              {lead.stage && (
                <span className="badge badge-stage-pill">
                  {STAGE_LABELS[lead.stage] || lead.stage}
                </span>
              )}
            </div>

            <div className="wa-head-sub-row">
              <span className="sub2 wa-phone-text">
                {lead.tel || "Numéro non renseigné"}
              </span>

              {lead.tel && (
                <div className="wa-head-actions-inline">
                  <button
                    type="button"
                    className="wa-btn-icon"
                    onClick={handleCopyPhone}
                    title="Copier le numéro"
                    aria-label="Copier le numéro"
                  >
                    {copied ? (
                      <span style={{ fontSize: "0.7rem", color: "var(--success)" }}>Copié !</span>
                    ) : (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                      </svg>
                    )}
                  </button>

                  {waExternalUrl && (
                    <a
                      href={waExternalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="wa-btn-icon wa-link-external"
                      title="Ouvrir dans WhatsApp Web"
                      aria-label="Ouvrir dans WhatsApp Web"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.5 2 2 6.3 2 11.6c0 1.8.5 3.5 1.4 5L2 22l5.6-1.4c1.5.8 3.1 1.2 4.4 1.2 5.5 0 10-4.3 10-9.7S17.5 2 12 2Z" />
                      </svg>
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Boutons de contrôle en haut à droite */}
          <div className="wa-head-controls">
            <button
              type="button"
              className={`wa-btn-icon ${loadingHistory ? "spinning" : ""}`}
              onClick={() => fetchMessages(false)}
              title="Rafraîchir les messages"
              aria-label="Rafraîchir"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 4v6h-6M1 20v-6h6" />
                <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
            </button>

            <button
              type="button"
              className="wa-modal-close"
              onClick={onClose}
              aria-label="Fermer la conversation"
              title="Fermer (Échap)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* ALERTE D'ERREUR ÉVENTUELLE */}
        {errorNotice && (
          <div className="wa-alert-banner">
            <span>⚠️ {errorNotice}</span>
            <button
              type="button"
              className="wa-alert-dismiss"
              onClick={() => setErrorNotice(null)}
            >
              ✕
            </button>
          </div>
        )}

        {/* THREAD DES MESSAGES */}
        <div className="wa-thread wa-thread-enhanced">
          {messages && messages.length > 0 ? (
            messages.map((m, idx) => {
              const isMe = m.from === "moi" || m.from_side === "moi" || m.direction === "outbound";
              const showDate =
                idx === 0 ||
                formatMsgDate(messages[idx - 1]?.created_at) !== formatMsgDate(m.created_at);

              return (
                <React.Fragment key={m.id || idx}>
                  {showDate && m.created_at && (
                    <div className="wa-date-divider">
                      <span>{formatMsgDate(m.created_at)}</span>
                    </div>
                  )}

                  <div className={`wa-bubble-wrapper ${isMe ? "moi" : "eux"}`}>
                    <div className={`wa-bubble ${isMe ? "moi" : "eux"}`}>
                      <div className="wa-bubble-content">{m.text}</div>
                      <div className="wa-bubble-meta">
                        <span className="wa-bubble-time">
                          {formatMsgTime(m.created_at)}
                        </span>
                        {isMe && (
                          <span className="wa-bubble-status" title={`Statut : ${m.status || "sent"}`}>
                            {m.status === "read" ? (
                              <span className="wa-tick read">✓✓</span>
                            ) : m.status === "delivered" ? (
                              <span className="wa-tick delivered">✓✓</span>
                            ) : m.status === "failed" ? (
                              <span className="wa-tick failed" title="Échec d'envoi">⚠️</span>
                            ) : (
                              <span className="wa-tick sent">✓</span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          ) : (
            <div className="wa-empty-conversation">
              <div className="wa-empty-icon">💬</div>
              <div className="wa-empty-title">Aucun message pour ce lead</div>
              <p className="wa-empty-desc">
                Engagez la discussion WhatsApp avec <strong>{lead.client}</strong> en direct ou utilisez un modèle pré-rempli ci-dessous.
              </p>
            </div>
          )}
          <div ref={threadEndRef} />
        </div>

        {/* TIROIR DE MODÈLES DE RÉPONSE RAPIDE */}
        {showTemplates && (
          <div className="wa-templates-panel">
            <div className="wa-templates-head">
              <span>⚡ Modèles de réponses rapides</span>
              <button
                type="button"
                className="wa-btn-text"
                onClick={() => setShowTemplates(false)}
              >
                Fermer
              </button>
            </div>
            <div className="wa-templates-list">
              {TEMPLATES.map((tmpl, i) => (
                <button
                  key={i}
                  type="button"
                  className="wa-template-item"
                  onClick={() => handleApplyTemplate(tmpl)}
                >
                  <span className="wa-tmpl-emoji">{tmpl.emoji}</span>
                  <div className="wa-tmpl-body">
                    <span className="wa-tmpl-label">{tmpl.label}</span>
                    <span className="wa-tmpl-preview">
                      {tmpl.getText(firstName, lead.brand)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* BARRE D'OUTILS AU-DESSUS DU COMPOSER */}
        <div className="wa-quick-bar">
          <button
            type="button"
            className={`wa-quick-btn ${showTemplates ? "active" : ""}`}
            onClick={() => setShowTemplates((prev) => !prev)}
          >
            ⚡ Modèles rapides ({TEMPLATES.length})
          </button>
          <div className="wa-quick-chips">
            {TEMPLATES.slice(0, 3).map((tmpl, i) => (
              <button
                key={i}
                type="button"
                className="wa-quick-chip"
                onClick={() => handleApplyTemplate(tmpl)}
                title={tmpl.label}
              >
                {tmpl.emoji} {tmpl.label}
              </button>
            ))}
          </div>
        </div>

        {/* FORMULAIRE DE COMPOSITION ET D'ENVOI */}
        <form className="wa-compose wa-compose-enhanced" onSubmit={handleSend}>
          <div className="wa-input-container">
            <textarea
              ref={inputRef}
              rows={1}
              placeholder={`Écrire un message à ${firstName || "ce prospect"}… (Entrée pour envoyer)`}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={sending || !lead.tel}
              aria-label="Message WhatsApp"
            />
          </div>

          <button
            type="submit"
            className={`wa-send ${sending ? "loading" : ""}`}
            aria-label="Envoyer le message WhatsApp"
            title="Envoyer (Entrée)"
            disabled={sending || !inputText.trim() || !lead.tel}
          >
            {sending ? (
              <span className="wa-spinner" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path
                  d="M4 12 20 4l-6.5 16-3-6.5L4 12Z"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>
        </form>

        {/* NOTE DE PIED DE MODAL */}
        <div className="wa-footer-info">
          <span>
            {process.env.NEXT_PUBLIC_WHATSAPP_PHONE_NUMBER_ID || "WhatsApp Cloud API"} · Messages chiffrés & archivés dans le CRM
          </span>
        </div>
      </div>
    </div>
  );
};
